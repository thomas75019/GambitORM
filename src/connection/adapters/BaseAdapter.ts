import { DatabaseConfig, QueryResult } from '../../types';

/**
 * Base adapter interface for database connections
 */
export interface BaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<QueryResult>;
  isConnected(): boolean;
  beginTransaction?(): Promise<void>;
  commit?(): Promise<void>;
  rollback?(): Promise<void>;
  getTransactionConnection?(): any;
}

/**
 * Abstract base class for database adapters
 */
export abstract class DatabaseAdapter implements BaseAdapter {
  protected config: DatabaseConfig;
  protected connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query(sql: string, params?: any[]): Promise<QueryResult>;
  
  isConnected(): boolean {
    return this.connected;
  }
}

