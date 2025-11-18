import { Connection } from '../connection/Connection';
import { SchemaBuilder } from './SchemaBuilder';

/**
 * Base class for database migrations
 */
export abstract class Migration {
  protected connection?: Connection;

  /**
   * Set the database connection
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Get the database connection
   */
  protected getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Connection not set. Migration must be run through MigrationRunner.');
    }
    return this.connection;
  }

  /**
   * Get a schema builder for the given table
   */
  protected schema(tableName: string): SchemaBuilder {
    return new SchemaBuilder(this.getConnection(), tableName);
  }

  /**
   * Execute raw SQL
   */
  protected async query(sql: string, params?: any[]): Promise<any> {
    return await this.getConnection().query(sql, params);
  }

  /**
   * Run the migration
   */
  abstract up(): Promise<void>;

  /**
   * Rollback the migration
   */
  abstract down(): Promise<void>;

  /**
   * Get migration name (should be unique, typically includes timestamp)
   */
  abstract getName(): string;
}

