import { Connection } from '../connection/Connection';
import { QueryResult } from '../types';

/**
 * Query builder for constructing SQL queries
 */
export class QueryBuilder {
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByClause: Array<{ column: string; direction: 'ASC' | 'DESC' }> = [];
  private limitValue?: number;
  private offsetValue?: number;
  private connection?: Connection;
  private insertData?: Record<string, any>;
  private updateData?: Record<string, any>;
  private queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';

  constructor(tableName: string, connection?: Connection) {
    this.tableName = tableName;
    this.connection = connection;
  }

  /**
   * Select specific fields
   */
  select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * Add a WHERE condition
   */
  where(field: string, operator: string, value: any): this {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add an ORDER BY clause
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause.push({ column, direction });
    return this;
  }

  /**
   * Add a LIMIT clause
   */
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * Add an OFFSET clause
   */
  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  /**
   * Set the connection for query execution
   */
  setConnection(connection: Connection): this {
    this.connection = connection;
    return this;
  }

  /**
   * Build INSERT query
   */
  insert(data: Record<string, any>): this {
    this.queryType = 'INSERT';
    this.insertData = data;
    return this;
  }

  /**
   * Build UPDATE query
   */
  update(data: Record<string, any>): this {
    this.queryType = 'UPDATE';
    this.updateData = data;
    return this;
  }

  /**
   * Build DELETE query
   */
  delete(): this {
    this.queryType = 'DELETE';
    return this;
  }

  /**
   * Build the SQL query
   */
  toSQL(): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = '';

    switch (this.queryType) {
      case 'SELECT':
        sql = this.buildSelectSQL(params);
        break;
      case 'INSERT':
        sql = this.buildInsertSQL(params);
        break;
      case 'UPDATE':
        sql = this.buildUpdateSQL(params);
        break;
      case 'DELETE':
        sql = this.buildDeleteSQL(params);
        break;
    }

    return { sql, params };
  }

  private buildSelectSQL(params: any[]): string {
    const fields = this.selectFields.join(', ');
    let sql = `SELECT ${fields} FROM ${this.tableName}`;

    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map((condition, index) => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (this.orderByClause.length > 0) {
      const orderBy = this.orderByClause
        .map(clause => `${clause.column} ${clause.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return sql;
  }

  private buildInsertSQL(params: any[]): string {
    if (!this.insertData) {
      throw new Error('Insert data not provided');
    }

    const columns = Object.keys(this.insertData);
    const values = columns.map(col => {
      params.push(this.insertData![col]);
      return '?';
    });

    return `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
  }

  private buildUpdateSQL(params: any[]): string {
    if (!this.updateData) {
      throw new Error('Update data not provided');
    }

    const setClauses = Object.keys(this.updateData).map(key => {
      params.push(this.updateData![key]);
      return `${key} = ?`;
    });

    let sql = `UPDATE ${this.tableName} SET ${setClauses.join(', ')}`;

    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    return sql;
  }

  private buildDeleteSQL(params: any[]): string {
    let sql = `DELETE FROM ${this.tableName}`;

    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    return sql;
  }

  /**
   * Execute the query
   */
  async execute(): Promise<QueryResult> {
    if (!this.connection) {
      throw new Error('Connection not set. Call setConnection() or pass connection to constructor.');
    }

    if (!this.connection.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }

    const { sql, params } = this.toSQL();
    return await this.connection.query(sql, params);
  }
}

