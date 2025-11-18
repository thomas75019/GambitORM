import { DatabaseConfig, QueryResult } from '../../types';
import { DatabaseAdapter } from './BaseAdapter';
import mysql from 'mysql2/promise';

/**
 * MySQL database adapter
 */
export class MySQLAdapter extends DatabaseAdapter {
  private pool?: mysql.Pool;
  private connection?: mysql.Connection;
  private transactionConnection?: mysql.PoolConnection;

  async connect(): Promise<void> {
    if (!this.config.host || !this.config.port || !this.config.user || !this.config.password) {
      throw new Error('MySQL requires host, port, user, and password');
    }

    const poolConfig: mysql.PoolOptions = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      waitForConnections: true,
      connectionLimit: this.config.pool?.max || 10,
      queueLimit: 0,
    };

    if (this.config.pool) {
      this.pool = mysql.createPool(poolConfig);
      // Test the connection
      const testConnection = await this.pool.getConnection();
      testConnection.release();
    } else {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
      });
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    } else if (this.connection) {
      await this.connection.end();
      this.connection = undefined;
    }
    this.connected = false;
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.connected) {
      throw new Error('Database connection is not established');
    }

    try {
      let result: any;
      const connection = this.getTransactionConnection();
      
      if (this.pool) {
        const conn = connection || this.pool;
        const [rows] = await (conn as mysql.PoolConnection | mysql.Pool).execute(sql, params || []);
        result = rows;
      } else if (this.connection) {
        const [rows] = await this.connection.execute(sql, params || []);
        result = rows;
      } else {
        throw new Error('No database connection available');
      }

      // MySQL returns an array directly
      const rowsArray = Array.isArray(result) ? result : [result];
      
      return {
        rows: rowsArray,
        rowCount: Array.isArray(result) ? result.length : undefined,
        insertId: (result as any).insertId,
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    if (!this.connected) {
      throw new Error('Database connection is not established');
    }

    if (this.pool) {
      if (!this.transactionConnection) {
        this.transactionConnection = await this.pool.getConnection();
      }
      await this.transactionConnection.beginTransaction();
    } else if (this.connection) {
      await this.connection.beginTransaction();
    } else {
      throw new Error('No database connection available');
    }
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    if (this.pool && this.transactionConnection) {
      await this.transactionConnection.commit();
      this.transactionConnection.release();
      this.transactionConnection = undefined;
    } else if (this.connection) {
      await this.connection.commit();
    } else {
      throw new Error('No active transaction');
    }
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    if (this.pool && this.transactionConnection) {
      await this.transactionConnection.rollback();
      this.transactionConnection.release();
      this.transactionConnection = undefined;
    } else if (this.connection) {
      await this.connection.rollback();
    } else {
      throw new Error('No active transaction');
    }
  }

  /**
   * Get the transaction connection for query execution
   */
  getTransactionConnection(): mysql.PoolConnection | mysql.Connection | undefined {
    if (this.pool && this.transactionConnection) {
      return this.transactionConnection;
    }
    return this.connection;
  }
}

