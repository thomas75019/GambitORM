import { Connection } from '../connection/Connection';
import { QueryResult } from '../types';

/**
 * Query builder for constructing SQL queries
 */
export class QueryBuilder {
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any; isOr?: boolean; isRaw?: boolean }> = [];
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
  private whereGroups: Array<{ conditions: Array<{ field: string; operator: string; value: any }>; isOr: boolean }> = [];

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
   * Add aggregate function to select
   */
  count(field: string = '*', alias?: string): this {
    const countExpr = alias ? `COUNT(${field}) AS ${alias}` : `COUNT(${field})`;
    this.selectFields = [countExpr];
    return this;
  }

  /**
   * Add SUM aggregate function
   */
  sum(field: string, alias?: string): this {
    const sumExpr = alias ? `SUM(${field}) AS ${alias}` : `SUM(${field})`;
    this.selectFields = [sumExpr];
    return this;
  }

  /**
   * Add AVG aggregate function
   */
  avg(field: string, alias?: string): this {
    const avgExpr = alias ? `AVG(${field}) AS ${alias}` : `AVG(${field})`;
    this.selectFields = [avgExpr];
    return this;
  }

  /**
   * Add MAX aggregate function
   */
  max(field: string, alias?: string): this {
    const maxExpr = alias ? `MAX(${field}) AS ${alias}` : `MAX(${field})`;
    this.selectFields = [maxExpr];
    return this;
  }

  /**
   * Add MIN aggregate function
   */
  min(field: string, alias?: string): this {
    const minExpr = alias ? `MIN(${field}) AS ${alias}` : `MIN(${field})`;
    this.selectFields = [minExpr];
    return this;
  }

  /**
   * Add a WHERE condition
   */
  where(field: string, operator: string, value: any): this {
    this.whereConditions.push({ field, operator, value, isOr: false });
    return this;
  }

  /**
   * Add a WHERE condition with OR
   */
  orWhere(field: string, operator: string, value: any): this {
    this.whereConditions.push({ field, operator, value, isOr: true });
    return this;
  }

  /**
   * Add a WHERE IN condition
   */
  whereIn(field: string, values: any[]): this {
    if (values.length === 0) {
      // Empty IN clause - always false
      this.whereConditions.push({ field, operator: 'IN', value: '()', isOr: false });
    } else {
      this.whereConditions.push({ field, operator: 'IN', value: values, isOr: false });
    }
    return this;
  }

  /**
   * Add a WHERE NOT IN condition
   */
  whereNotIn(field: string, values: any[]): this {
    if (values.length === 0) {
      // Empty NOT IN clause - always true
      return this;
    }
    this.whereConditions.push({ field, operator: 'NOT IN', value: values, isOr: false });
    return this;
  }

  /**
   * Add a WHERE NULL condition
   */
  whereNull(field: string): this {
    this.whereConditions.push({ field, operator: 'IS', value: null, isOr: false });
    return this;
  }

  /**
   * Add a WHERE NOT NULL condition
   */
  whereNotNull(field: string): this {
    this.whereConditions.push({ field, operator: 'IS NOT', value: null, isOr: false });
    return this;
  }

  /**
   * Add a WHERE BETWEEN condition
   */
  whereBetween(field: string, value1: any, value2: any): this {
    this.whereConditions.push({ field, operator: 'BETWEEN', value: [value1, value2], isOr: false });
    return this;
  }

  /**
   * Add a WHERE NOT BETWEEN condition
   */
  whereNotBetween(field: string, value1: any, value2: any): this {
    this.whereConditions.push({ field, operator: 'NOT BETWEEN', value: [value1, value2], isOr: false });
    return this;
  }

  /**
   * Add a WHERE LIKE condition
   */
  whereLike(field: string, value: string): this {
    this.whereConditions.push({ field, operator: 'LIKE', value, isOr: false });
    return this;
  }

  /**
   * Add a WHERE NOT LIKE condition
   */
  whereNotLike(field: string, value: string): this {
    this.whereConditions.push({ field, operator: 'NOT LIKE', value, isOr: false });
    return this;
  }

  /**
   * Add a raw WHERE condition
   */
  whereRaw(sql: string, params?: any[]): this {
    this.whereConditions.push({ field: sql, operator: 'RAW', value: params || [], isOr: false, isRaw: true });
    return this;
  }

  /**
   * Add a subquery as a WHERE condition
   */
  whereSubquery(field: string, operator: string, subquery: QueryBuilder): this {
    const { sql, params } = subquery.toSQL();
    this.whereConditions.push({ 
      field, 
      operator, 
      value: { type: 'subquery', sql: `(${sql})`, params }, 
      isOr: false 
    });
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

    sql += this.buildWhereClause(params);

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
    sql += this.buildWhereClause(params);
    return sql;
  }

  private buildDeleteSQL(params: any[]): string {
    let sql = `DELETE FROM ${this.tableName}`;
    sql += this.buildWhereClause(params);
    return sql;
  }

  /**
   * Build WHERE clause (reusable for SELECT, UPDATE, DELETE)
   */
  private buildWhereClause(params: any[]): string {
    if (this.whereConditions.length === 0) {
      return '';
    }

    const whereClauses: string[] = [];
    let currentGroup: string[] = [];
    let lastWasOr = false;

    for (let i = 0; i < this.whereConditions.length; i++) {
      const condition = this.whereConditions[i];
      const isOr = condition.isOr || false;

      // Start a new group if switching between AND/OR
      if (i > 0 && isOr !== lastWasOr) {
        if (currentGroup.length > 0) {
          whereClauses.push(currentGroup.length === 1 ? currentGroup[0] : `(${currentGroup.join(' AND ')})`);
          currentGroup = [];
        }
      }

      let clause: string;
      
      if (condition.isRaw) {
        // Raw SQL condition
        const rawParams = condition.value as any[];
        rawParams.forEach(p => params.push(p));
        clause = condition.field; // field contains the raw SQL
      } else if (condition.value && typeof condition.value === 'object' && condition.value.type === 'subquery') {
        // Subquery condition
        const subquery = condition.value as { sql: string; params: any[] };
        subquery.params.forEach(p => params.push(p));
        clause = `${condition.field} ${condition.operator} ${subquery.sql}`;
      } else if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
        // IN/NOT IN clause
        if (Array.isArray(condition.value) && condition.value.length > 0) {
          const placeholders: string[] = [];
          condition.value.forEach((val: any) => {
            params.push(val);
            placeholders.push('?');
          });
          clause = `${condition.field} ${condition.operator} (${placeholders.join(', ')})`;
        } else {
          clause = condition.operator === 'IN' ? '1 = 0' : '1 = 1'; // Empty IN = false, empty NOT IN = true
        }
      } else if (condition.operator === 'BETWEEN' || condition.operator === 'NOT BETWEEN') {
        // BETWEEN clause
        const [value1, value2] = condition.value as any[];
        params.push(value1, value2);
        clause = `${condition.field} ${condition.operator} ? AND ?`;
      } else if (condition.operator === 'IS' || condition.operator === 'IS NOT') {
        // NULL check
        clause = `${condition.field} ${condition.operator} NULL`;
      } else {
        // Standard condition
        params.push(condition.value);
        clause = `${condition.field} ${condition.operator} ?`;
      }

      currentGroup.push(clause);
      lastWasOr = isOr;

      // Add to whereClauses if it's the last condition or next is different type
      if (i === this.whereConditions.length - 1 || 
          (i < this.whereConditions.length - 1 && this.whereConditions[i + 1].isOr !== isOr)) {
        if (currentGroup.length > 0) {
          if (currentGroup.length === 1) {
            whereClauses.push(currentGroup[0]);
          } else {
            whereClauses.push(`(${currentGroup.join(' AND ')})`);
          }
          currentGroup = [];
        }
      }
    }

    // Join groups: if we have multiple groups, join with OR, otherwise just use the single group
    if (whereClauses.length === 0) {
      return '';
    } else if (whereClauses.length === 1) {
      return ` WHERE ${whereClauses[0]}`;
    } else {
      // Multiple groups - join with OR
      return ` WHERE ${whereClauses.join(' OR ')}`;
    }
  }

  /**
   * Execute raw SQL query
   */
  static async raw(connection: Connection, sql: string, params?: any[]): Promise<QueryResult> {
    if (!connection.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }
    return await connection.query(sql, params || []);
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

  /**
   * Get a subquery builder for use in WHERE clauses
   */
  static subquery(tableName: string, connection?: Connection): QueryBuilder {
    return new QueryBuilder(tableName, connection);
  }
}

