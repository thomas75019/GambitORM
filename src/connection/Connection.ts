import { DatabaseConfig, QueryResult } from '../types';
import { BaseAdapter } from './adapters/BaseAdapter';
import { MySQLAdapter } from './adapters/MySQLAdapter';
import { PostgreSQLAdapter } from './adapters/PostgreSQLAdapter';
import { SQLiteAdapter } from './adapters/SQLiteAdapter';

/**
 * Database connection manager
 */
export class Connection {
  private config: DatabaseConfig;
  private adapter: BaseAdapter | null = null;

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

    return await this.adapter.query(sql, params);
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
}

