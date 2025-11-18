import { BaseValidator, ValidationResult } from '../Validator';
import { Model } from '../../orm/Model';
import { QueryBuilder } from '../../query/QueryBuilder';
import { MongoDBQueryBuilder } from '../../query/MongoDBQueryBuilder';

export interface UniqueValidatorOptions {
  table?: string;
  column?: string;
  ignoreId?: number | string; // Ignore this ID when checking (useful for updates)
  where?: Record<string, any>; // Additional WHERE conditions
}

/**
 * Validator that checks if a value is unique in the database
 */
export class UniqueValidator extends BaseValidator {
  private table: string;
  private column: string;
  private ignoreId?: number | string;
  private where?: Record<string, any>;

  constructor(table: string, column?: string, options?: UniqueValidatorOptions | string) {
    super(typeof options === 'string' ? options : undefined);
    
    // Handle different constructor signatures
    if (typeof options === 'string') {
      this.table = table;
      this.column = column || table;
    } else {
      this.table = options?.table || table;
      this.column = options?.column || column || table;
      this.ignoreId = options?.ignoreId;
      this.where = options?.where;
    }
  }

  async validate(value: any, field: string, model: any): Promise<ValidationResult> {
    // Skip validation if value is empty (let RequiredValidator handle it)
    if (value === null || value === undefined || value === '') {
      return this.createResult(true);
    }

    // Get connection from model
    let connection;
    try {
      connection = Model.getConnection();
    } catch (error) {
      return this.createResult(
        false,
        this.message || `${field} validation failed: database connection not available`
      );
    }
    
    if (!connection) {
      return this.createResult(
        false,
        this.message || `${field} validation failed: database connection not available`
      );
    }

    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(this.table, connection)
      : new QueryBuilder(this.table, connection);

    // Check if value exists
    query.where(this.column, '=', value);

    // Ignore current record if updating
    if (this.ignoreId !== undefined) {
      query.where('id', '!=', this.ignoreId);
    } else if (model && (model as any).id) {
      // Auto-detect ID from model if not specified
      query.where('id', '!=', (model as any).id);
    }

    // Add additional WHERE conditions
    if (this.where) {
      for (const [key, val] of Object.entries(this.where)) {
        query.where(key, '=', val);
      }
    }

    query.limit(1);
    const result = await query.execute();

    const isUnique = result.rows.length === 0;

    return this.createResult(
      isUnique,
      this.message || `${field} must be unique`
    );
  }
}

