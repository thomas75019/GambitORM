/**
 * Core type definitions for GambitORM
 */

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  dialect?: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';
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

export interface RelationshipOptions {
  eager?: boolean;
  where?: Record<string, any>;
  orderBy?: string | Array<{ column: string; direction: 'ASC' | 'DESC' }>;
}

export interface JoinConfig {
  type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: { left: string; right: string };
  alias?: string;
}

