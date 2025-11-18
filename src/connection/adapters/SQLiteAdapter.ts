import { DatabaseConfig, QueryResult } from '../../types';
import { DatabaseAdapter } from './BaseAdapter';

// Lazy load better-sqlite3 to handle optional dependency
let Database: any = null;

function loadSQLite(): any {
  if (Database === null) {
    try {
      Database = require('better-sqlite3');
    } catch (error) {
      throw new Error(
        'better-sqlite3 is not installed. Install it with: npm install better-sqlite3\n' +
        'Note: On Windows, you may need Visual Studio Build Tools with Windows SDK.\n' +
        'See: https://github.com/nodejs/node-gyp#on-windows'
      );
    }
  }
  return Database;
}

/**
 * SQLite database adapter
 */
export class SQLiteAdapter extends DatabaseAdapter {
  private db?: any;

  async connect(): Promise<void> {
    if (!this.config.database) {
      throw new Error('SQLite requires a database path');
    }

    try {
      const SQLite = loadSQLite();
      this.db = new SQLite(this.config.database);
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to SQLite database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
    this.connected = false;
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.connected || !this.db) {
      throw new Error('Database connection is not established');
    }

    try {
      // SQLite is synchronous, but we wrap it in a Promise for consistency
      const stmt = this.db.prepare(sql);
      const paramsArray = params || [];
      
      // Determine if it's a SELECT query
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const rows = stmt.all(...paramsArray);
        return {
          rows: rows as any[],
          rowCount: Array.isArray(rows) ? rows.length : undefined,
        };
      } else {
        // For INSERT, UPDATE, DELETE
        const result = stmt.run(...paramsArray);
        return {
          rows: [],
          rowCount: result.changes,
          insertId: result.lastInsertRowid,
        };
      }
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

