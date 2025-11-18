import { DatabaseConfig, QueryResult } from '../../types';
import { DatabaseAdapter } from './BaseAdapter';
import mysql from 'mysql2/promise';

/**
 * MySQL database adapter
 */
export class MySQLAdapter extends DatabaseAdapter {
  private pool?: mysql.Pool;
  private connection?: mysql.Connection;

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
      
      if (this.pool) {
        const [rows] = await this.pool.execute(sql, params || []);
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
}

