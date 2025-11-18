import { QueryBuilder } from '../query/QueryBuilder';
import { MongoDBQueryBuilder } from '../query/MongoDBQueryBuilder';
import { Connection } from '../connection/Connection';
import { Model } from './Model';

/**
 * Scope query builder that wraps QueryBuilder/MongoDBQueryBuilder
 * and allows chaining scopes
 */
export class ScopeQueryBuilder<T extends Model> {
  private query: QueryBuilder | MongoDBQueryBuilder;
  private modelClass: typeof Model;
  private connection: Connection;
  private tableName: string;
  private isMongoDB: boolean;

  constructor(
    modelClass: typeof Model & { tableName: string },
    connection: Connection
  ) {
    this.modelClass = modelClass;
    this.connection = connection;
    this.tableName = modelClass.tableName;
    this.isMongoDB = connection.getDialect() === 'mongodb';
    
    this.query = this.isMongoDB
      ? new MongoDBQueryBuilder(this.tableName, connection)
      : new QueryBuilder(this.tableName, connection);

    // Apply global scopes (access via any to bypass private access)
    const globalScopes = (Model as any).globalScopes.get(modelClass);
    if (globalScopes) {
      for (const scope of globalScopes) {
        scope(this.query);
      }
    }
  }

  /**
   * Apply a scope
   */
  scope(scopeName: string, ...args: any[]): this {
    const ModelClass = this.modelClass;
    const scopes = (Model as any).scopes.get(ModelClass);
    
    if (!scopes || !scopes[scopeName]) {
      throw new Error(`Scope "${scopeName}" is not defined on ${this.modelClass.name}`);
    }

    // Call the scope function with the query builder
    scopes[scopeName](this.query, ...args);
    return this;
  }

  /**
   * Apply multiple scopes
   */
  scopes(...scopeNames: string[]): this {
    for (const scopeName of scopeNames) {
      this.scope(scopeName);
    }
    return this;
  }

  /**
   * Get the underlying query builder
   */
  getQuery(): QueryBuilder | MongoDBQueryBuilder {
    return this.query;
  }

  /**
   * Execute the query
   */
  async execute(): Promise<any> {
    return await this.query.execute();
  }

  /**
   * Proxy all QueryBuilder methods
   */
  where(field: string, operator: string, value: any): this {
    this.query.where(field, operator, value);
    return this;
  }

  whereIn(field: string, values: any[]): this {
    if (this.isMongoDB) {
      (this.query as MongoDBQueryBuilder).whereIn(field, values);
    } else {
      (this.query as QueryBuilder).whereIn(field, values);
    }
    return this;
  }

  whereNull(field: string): this {
    if (this.isMongoDB) {
      (this.query as MongoDBQueryBuilder).whereNull(field);
    } else {
      (this.query as QueryBuilder).whereNull(field);
    }
    return this;
  }

  orderBy(column: string, direction?: 'ASC' | 'DESC'): this {
    this.query.orderBy(column, direction);
    return this;
  }

  limit(count: number): this {
    this.query.limit(count);
    return this;
  }

  offset(count: number): this {
    this.query.offset(count);
    return this;
  }

  /**
   * Execute and return model instances
   */
  async get<T extends Model>(): Promise<T[]> {
    const result = await this.query.execute();
    const ModelClass = this.modelClass as unknown as new () => T;
    return result.rows.map(row => {
      const instance = new ModelClass();
      Object.assign(instance, row);
      return instance;
    });
  }

  /**
   * Execute and return first model instance
   */
  async first<T extends Model>(): Promise<T | null> {
    this.query.limit(1);
    const result = await this.query.execute();
    if (result.rows.length === 0) {
      return null;
    }
    const ModelClass = this.modelClass as unknown as new () => T;
    const instance = new ModelClass();
    Object.assign(instance, result.rows[0]);
    return instance;
  }

  /**
   * Execute and return count
   */
  async count(): Promise<number> {
    if (this.isMongoDB) {
      const result = await (this.query as MongoDBQueryBuilder).execute();
      return result.rowCount || 0;
    } else {
      (this.query as QueryBuilder).count();
      const result = await this.query.execute();
      return result.rows[0]?.count || 0;
    }
  }
}

