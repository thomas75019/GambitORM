import { BaseValidator, ValidationResult } from '../Validator';
import { Model } from '../../orm/Model';
import { QueryBuilder } from '../../query/QueryBuilder';
import { MongoDBQueryBuilder } from '../../query/MongoDBQueryBuilder';

export interface ExistsValidatorOptions {
  table?: string;
  column?: string;
  where?: Record<string, any>; // Additional WHERE conditions
}

/**
 * Validator that checks if a value exists in the database
 */
export class ExistsValidator extends BaseValidator {
  private table: string;
  private column: string;
  private where?: Record<string, any>;

  constructor(table: string, column?: string, options?: ExistsValidatorOptions | string) {
    super(typeof options === 'string' ? options : undefined);
    
    // Handle different constructor signatures
    if (typeof options === 'string') {
      this.table = table;
      this.column = column || table;
    } else {
      this.table = options?.table || table;
      this.column = options?.column || column || table;
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

    // Add additional WHERE conditions
    if (this.where) {
      for (const [key, val] of Object.entries(this.where)) {
        query.where(key, '=', val);
      }
    }

    query.limit(1);
    const result = await query.execute();

    const exists = result.rows.length > 0;

    return this.createResult(
      exists,
      this.message || `${field} does not exist`
    );
  }
}

