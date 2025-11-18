/**
 * Core type definitions for GambitORM
 */

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  dialect?: 'mysql' | 'postgres' | 'sqlite';
  pool?: {
    min?: number;
    max?: number;
    idle?: number;
  };
}

export interface QueryResult {
  rows: any[];
  rowCount?: number;
  insertId?: number | string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string | Array<{ column: string; direction: 'ASC' | 'DESC' }>;
  where?: Record<string, any>;
}

export interface ModelAttributes {
  [key: string]: any;
}

export interface ModelInstance {
  id?: number | string;
  [key: string]: any;
}

