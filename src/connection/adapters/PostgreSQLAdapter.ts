import { DatabaseConfig, QueryResult } from '../../types';
import { DatabaseAdapter } from './BaseAdapter';
import { Pool, Client } from 'pg';

/**
 * PostgreSQL database adapter
 */
export class PostgreSQLAdapter extends DatabaseAdapter {
  private pool?: Pool;
  private client?: Client;

  async connect(): Promise<void> {
    if (!this.config.host || !this.config.port || !this.config.user || !this.config.password) {
      throw new Error('PostgreSQL requires host, port, user, and password');
    }

    const connectionConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: this.config.pool?.max || 10,
      min: this.config.pool?.min || 2,
      idleTimeoutMillis: this.config.pool?.idle || 30000,
    };

    if (this.config.pool) {
      this.pool = new Pool(connectionConfig);
      // Test the connection
      await this.pool.query('SELECT 1');
    } else {
      this.client = new Client(connectionConfig);
      await this.client.connect();
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    } else if (this.client) {
      await this.client.end();
      this.client = undefined;
    }
    this.connected = false;
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.connected) {
      throw new Error('Database connection is not established');
    }

    try {
      let result: any;
      
      if (this.pool) {
        result = await this.pool.query(sql, params || []);
      } else if (this.client) {
        result = await this.client.query(sql, params || []);
      } else {
        throw new Error('No database connection available');
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        insertId: result.rows[0]?.id,
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

