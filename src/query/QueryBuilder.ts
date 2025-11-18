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
  private joins: Array<{ type: string; table: string; on: { left: string; right: string }; alias?: string }> = [];
  private groupByFields: string[] = [];
  private havingConditions: Array<{ field: string; operator: string; value: any }> = [];

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
   * Add a JOIN clause
   */
  join(table: string, on: { left: string; right: string }, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER', alias?: string): this {
    this.joins.push({ type, table, on, alias });
    return this;
  }

  /**
   * Add a LEFT JOIN clause
   */
  leftJoin(table: string, on: { left: string; right: string }, alias?: string): this {
    return this.join(table, on, 'LEFT', alias);
  }

  /**
   * Add a RIGHT JOIN clause
   */
  rightJoin(table: string, on: { left: string; right: string }, alias?: string): this {
    return this.join(table, on, 'RIGHT', alias);
  }

  /**
   * Add a FULL JOIN clause
   */
  fullJoin(table: string, on: { left: string; right: string }, alias?: string): this {
    return this.join(table, on, 'FULL', alias);
  }

  /**
   * Add a GROUP BY clause
   */
  groupBy(fields: string | string[]): this {
    const fieldsArray = Array.isArray(fields) ? fields : [fields];
    this.groupByFields.push(...fieldsArray);
    return this;
  }

  /**
   * Add a HAVING clause
   */
  having(field: string, operator: string, value: any): this {
    this.havingConditions.push({ field, operator, value });
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

    // Add JOINs
    for (const join of this.joins) {
      const joinType = join.type === 'INNER' ? 'INNER JOIN' : 
                      join.type === 'LEFT' ? 'LEFT JOIN' :
                      join.type === 'RIGHT' ? 'RIGHT JOIN' :
                      join.type === 'FULL' ? 'FULL OUTER JOIN' : 'INNER JOIN';
      const tableName = join.alias ? `${join.table} AS ${join.alias}` : join.table;
      sql += ` ${joinType} ${tableName} ON ${join.on.left} = ${join.on.right}`;
    }

    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map((condition, index) => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    if (this.havingConditions.length > 0) {
      const havingClauses = this.havingConditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      });
      sql += ` HAVING ${havingClauses.join(' AND ')}`;
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

