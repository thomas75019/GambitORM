import { Connection } from '../connection/Connection';
import { Migration } from './Migration';

export interface MigrationRecord {
  id?: number;
  name: string;
  batch: number;
  executed_at: Date | string;
}

/**
 * Migration runner that manages database migrations
 */
export class MigrationRunner {
  private connection: Connection;
  private migrationsTableName: string = 'gambit_migrations';

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Ensure the migrations table exists
   */
  async ensureMigrationsTable(): Promise<void> {
    const dialect = this.connection.getDialect();
    let createTableSQL: string;

    switch (dialect) {
      case 'mysql':
        createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${this.migrationsTableName} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            batch INT NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_name (name),
            INDEX idx_batch (batch)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        break;
      case 'postgres':
        createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${this.migrationsTableName} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            batch INTEGER NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_name ON ${this.migrationsTableName}(name);
          CREATE INDEX IF NOT EXISTS idx_batch ON ${this.migrationsTableName}(batch);
        `;
        break;
      case 'sqlite':
        createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${this.migrationsTableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            batch INTEGER NOT NULL,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_name ON ${this.migrationsTableName}(name);
          CREATE INDEX IF NOT EXISTS idx_batch ON ${this.migrationsTableName}(batch);
        `;
        break;
      default:
        throw new Error(`Unsupported dialect: ${dialect}`);
    }

    await this.connection.query(createTableSQL);
  }

  /**
   * Get all executed migrations
   */
  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable();
    const result = await this.connection.query(
      `SELECT * FROM ${this.migrationsTableName} ORDER BY batch ASC, id ASC`
    );
    return result.rows as MigrationRecord[];
  }

  /**
   * Get the next batch number
   */
  async getNextBatch(): Promise<number> {
    await this.ensureMigrationsTable();
    const result = await this.connection.query(
      `SELECT MAX(batch) as max_batch FROM ${this.migrationsTableName}`
    );

    if (result.rows.length === 0 || !result.rows[0].max_batch) {
      return 1;
    }

    return (result.rows[0].max_batch as number) + 1;
  }

  /**
   * Record a migration as executed
   */
  async recordMigration(name: string, batch: number): Promise<void> {
    await this.ensureMigrationsTable();
    await this.connection.query(
      `INSERT INTO ${this.migrationsTableName} (name, batch) VALUES (?, ?)`,
      [name, batch]
    );
  }

  /**
   * Remove a migration record (for rollback)
   */
  async removeMigration(name: string): Promise<void> {
    await this.ensureMigrationsTable();
    await this.connection.query(
      `DELETE FROM ${this.migrationsTableName} WHERE name = ?`,
      [name]
    );
  }

  /**
   * Get migrations from the last batch
   */
  async getLastBatchMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable();
    const result = await this.connection.query(
      `SELECT * FROM ${this.migrationsTableName} WHERE batch = (SELECT MAX(batch) FROM ${this.migrationsTableName}) ORDER BY id DESC`
    );
    return result.rows as MigrationRecord[];
  }

  /**
   * Run migrations up
   */
  async up(migrations: Array<new () => Migration>): Promise<void> {
    if (!this.connection.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }

    await this.ensureMigrationsTable();
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));
    const batch = await this.getNextBatch();

    for (const MigrationClass of migrations) {
      const migration = new MigrationClass();
      migration.setConnection(this.connection);
      const name = migration.getName();

      if (executedNames.has(name)) {
        continue; // Skip already executed migrations
      }

      try {
        await migration.up();
        await this.recordMigration(name, batch);
      } catch (error) {
        throw new Error(`Migration ${name} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Rollback the last batch of migrations
   */
  async down(migrations: Array<new () => Migration>): Promise<void> {
    if (!this.connection.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }

    await this.ensureMigrationsTable();
    const lastBatch = await this.getLastBatchMigrations();

    if (lastBatch.length === 0) {
      return; // No migrations to rollback
    }

    // Create a map of migration names to classes
    const migrationMap = new Map<string, new () => Migration>();
    for (const MigrationClass of migrations) {
      const migration = new MigrationClass();
      migrationMap.set(migration.getName(), MigrationClass);
    }

    // Rollback migrations in reverse order
    for (const record of lastBatch) {
      const MigrationClass = migrationMap.get(record.name);
      if (!MigrationClass) {
        throw new Error(`Migration class not found for: ${record.name}`);
      }

      try {
        const migration = new MigrationClass();
        migration.setConnection(this.connection);
        await migration.down();
        await this.removeMigration(record.name);
      } catch (error) {
        throw new Error(`Rollback of migration ${record.name} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Rollback all migrations
   */
  async downAll(migrations: Array<new () => Migration>): Promise<void> {
    if (!this.connection.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }

    await this.ensureMigrationsTable();
    const executed = await this.getExecutedMigrations();

    if (executed.length === 0) {
      return; // No migrations to rollback
    }

    // Create a map of migration names to classes
    const migrationMap = new Map<string, new () => Migration>();
    for (const MigrationClass of migrations) {
      const migration = new MigrationClass();
      migrationMap.set(migration.getName(), MigrationClass);
    }

    // Rollback migrations in reverse order
    for (let i = executed.length - 1; i >= 0; i--) {
      const record = executed[i];
      const MigrationClass = migrationMap.get(record.name);
      if (!MigrationClass) {
        throw new Error(`Migration class not found for: ${record.name}`);
      }

      try {
        const migration = new MigrationClass();
        migration.setConnection(this.connection);
        await migration.down();
        await this.removeMigration(record.name);
      } catch (error) {
        throw new Error(`Rollback of migration ${record.name} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Get migration status
   */
  async status(migrations: Array<new () => Migration>): Promise<Array<{ name: string; executed: boolean; batch?: number }>> {
    await this.ensureMigrationsTable();
    const executed = await this.getExecutedMigrations();
    const executedMap = new Map<string, MigrationRecord>();
    
    for (const record of executed) {
      executedMap.set(record.name, record);
    }

    const status: Array<{ name: string; executed: boolean; batch?: number }> = [];

    for (const MigrationClass of migrations) {
      const migration = new MigrationClass();
      const name = migration.getName();
      const record = executedMap.get(name);
      
      status.push({
        name,
        executed: !!record,
        batch: record?.batch,
      });
    }

    return status;
  }
}

