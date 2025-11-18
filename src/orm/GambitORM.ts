import { DatabaseConfig } from '../types';
import { Connection } from '../connection/Connection';
import { Model } from './Model';
import { MigrationRunner } from '../migration/MigrationRunner';
import { Migration } from '../migration/Migration';
import { Transaction } from '../transaction/Transaction';

/**
 * Main ORM class that manages database connections and models
 */
export class GambitORM {
  private connection: Connection;
  private config: DatabaseConfig;
  private migrationRunner?: MigrationRunner;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.connection = new Connection(config);
  }

  /**
   * Initialize the database connection
   */
  async connect(): Promise<void> {
    await this.connection.connect();
    // Set the connection for all models
    Model.setConnection(this.connection);
    // Initialize migration runner
    this.migrationRunner = new MigrationRunner(this.connection);
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  /**
   * Get the underlying connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Check if the connection is active
   */
  isConnected(): boolean {
    return this.connection.isConnected();
  }

  /**
   * Get the migration runner
   */
  getMigrationRunner(): MigrationRunner {
    if (!this.migrationRunner) {
      this.migrationRunner = new MigrationRunner(this.connection);
    }
    return this.migrationRunner;
  }

  /**
   * Run migrations
   */
  async migrate(migrations: Array<new () => Migration>): Promise<void> {
    const runner = this.getMigrationRunner();
    await runner.up(migrations);
  }

  /**
   * Rollback the last batch of migrations
   */
  async rollback(migrations: Array<new () => Migration>): Promise<void> {
    const runner = this.getMigrationRunner();
    await runner.down(migrations);
  }

  /**
   * Rollback all migrations
   */
  async rollbackAll(migrations: Array<new () => Migration>): Promise<void> {
    const runner = this.getMigrationRunner();
    await runner.downAll(migrations);
  }

  /**
   * Get migration status
   */
  async migrationStatus(migrations: Array<new () => Migration>): Promise<Array<{ name: string; executed: boolean; batch?: number }>> {
    const runner = this.getMigrationRunner();
    return await runner.status(migrations);
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<Transaction> {
    const transaction = new Transaction(this.connection);
    await transaction.begin();
    return transaction;
  }

  /**
   * Execute a callback within a transaction
   * Automatically commits on success or rolls back on error
   */
  async transaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    return await Transaction.run(this.connection, callback);
  }
}

