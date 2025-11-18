import { DatabaseConfig, QueryResult } from '../types';
import { BaseAdapter } from './adapters/BaseAdapter';
import { MySQLAdapter } from './adapters/MySQLAdapter';
import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';
import { SQLiteAdapter } from './adapters/SQLiteAdapter';
import { MongoDBAdapter } from './adapters/MongoDBAdapter';
import { QueryLogger, LoggedQuery, QueryLogOptions } from '../logging/QueryLogger';

/**
 * Database connection manager
 */
export class Connection {
  private config: DatabaseConfig;
  private adapter: BaseAdapter | null = null;
  private queryLogger: QueryLogger = new QueryLogger();

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.adapter = this.createAdapter();
  }

  /**
   * Create the appropriate adapter based on dialect
   */
  private createAdapter(): BaseAdapter {
    const dialect = this.config.dialect || 'mysql';

    switch (dialect) {
      case 'mysql':
        return new MySQLAdapter(this.config);
      case 'postgres':
        return new PostgreSQLAdapter(this.config);
      case 'sqlite':
        return new SQLiteAdapter(this.config);
      case 'mongodb':
        return new MongoDBAdapter(this.config);
      default:
        throw new Error(`Unsupported database dialect: ${dialect}`);
    }
  }

  /**
   * Establish database connection
   */
  async connect(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized');
    }

    if (this.adapter.isConnected()) {
      return; // Already connected
    }

    await this.adapter.connect();
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.adapter && this.adapter.isConnected()) {
      await this.adapter.disconnect();
    }
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return this.adapter?.isConnected() || false;
  }

  /**
   * Execute a raw query
   */
  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized');
    }

    if (!this.adapter.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }

    const startTime = Date.now();
    let result: QueryResult | undefined;
    let error: Error | undefined;

    try {
      result = await this.adapter.query(sql, params);
      const executionTime = Date.now() - startTime;
      this.queryLogger.log(sql, params, executionTime, result);
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      const executionTime = Date.now() - startTime;
      this.queryLogger.log(sql, params, executionTime, undefined, error);
      throw error;
    }
  }

  /**
   * Get the underlying adapter
   */
  getAdapter(): BaseAdapter | null {
    return this.adapter;
  }

  /**
   * Get the database dialect
   */
  getDialect(): string {
    return this.config.dialect || 'mysql';
  }

  /**
   * Get MongoDB helper for native MongoDB operations
   * Only available when using MongoDB adapter
   */
  getMongoDBHelper(): any {
    if (this.config.dialect !== 'mongodb') {
      throw new Error('MongoDB helper is only available for MongoDB connections');
    }
    const { MongoDBHelper } = require('./adapters/MongoDBHelper');
    return new MongoDBHelper(this.adapter as any);
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized');
    }

    if (!this.adapter.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }

    if (!this.adapter.beginTransaction) {
      throw new Error('Transactions are not supported by this database adapter');
    }

    await this.adapter.beginTransaction();
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized');
    }

    if (!this.adapter.commit) {
      throw new Error('Transactions are not supported by this database adapter');
    }

    await this.adapter.commit();
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized');
    }

    if (!this.adapter.rollback) {
      throw new Error('Transactions are not supported by this database adapter');
    }

    await this.adapter.rollback();
  }

  /**
   * Enable query logging
   */
  enableQueryLog(options?: Partial<QueryLogOptions>): void {
    this.queryLogger.enable(options);
  }

  /**
   * Disable query logging
   */
  disableQueryLog(): void {
    this.queryLogger.disable();
  }

  /**
   * Get query log
   */
  getQueryLog(): LoggedQuery[] {
    return this.queryLogger.getQueries();
  }

  /**
   * Get slow queries
   */
  getSlowQueries(): LoggedQuery[] {
    return this.queryLogger.getSlowQueries();
  }

  /**
   * Get the last query
   */
  getLastQuery(): LoggedQuery | null {
    return this.queryLogger.getLastQuery();
  }

  /**
   * Clear query log
   */
  clearQueryLog(): void {
    this.queryLogger.clear();
  }

  /**
   * Get query statistics
   */
  getQueryStats(): {
    totalQueries: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    slowQueries: number;
    errors: number;
  } {
    return this.queryLogger.getStats();
  }

  /**
   * Get query logger instance
   */
  getQueryLogger(): QueryLogger {
    return this.queryLogger;
  }
}

