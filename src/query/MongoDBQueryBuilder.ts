import { Connection } from '../connection/Connection';
import { QueryResult } from '../types';
import { Filter, UpdateFilter, FindOptions } from 'mongodb';

/**
 * MongoDB-specific query builder
 * Uses native MongoDB operations instead of SQL
 */
export class MongoDBQueryBuilder {
  private collectionName: string;
  private connection: Connection;
  private filter: Filter<any> = {};
  private updateData: UpdateFilter<any> = {};
  private findOptions: FindOptions = {};
  private operation: 'find' | 'findOne' | 'insert' | 'update' | 'delete' = 'find';

  constructor(collectionName: string, connection: Connection) {
    this.collectionName = collectionName;
    this.connection = connection;
  }

  /**
   * Add a WHERE condition (MongoDB filter)
   */
  where(field: string, operator: string, value: any): this {
    if (operator === '=') {
      this.filter[field] = value;
    } else if (operator === '!=' || operator === '<>') {
      this.filter[field] = { $ne: value };
    } else if (operator === '>') {
      this.filter[field] = { $gt: value };
    } else if (operator === '>=') {
      this.filter[field] = { $gte: value };
    } else if (operator === '<') {
      this.filter[field] = { $lt: value };
    } else if (operator === '<=') {
      this.filter[field] = { $lte: value };
    } else if (operator === 'IN') {
      this.filter[field] = { $in: value };
    } else if (operator === 'NOT IN') {
      this.filter[field] = { $nin: value };
    } else if (operator === 'LIKE') {
      // Convert SQL LIKE to MongoDB regex
      const regex = value.replace(/%/g, '.*').replace(/_/g, '.');
      this.filter[field] = { $regex: regex, $options: 'i' };
    }
    
    // Convert id to _id for MongoDB
    if (this.filter.id !== undefined) {
      this.filter._id = this.filter.id;
      delete this.filter.id;
    }
    
    return this;
  }

  /**
   * Add WHERE IN condition
   */
  whereIn(field: string, values: any[]): this {
    this.filter[field] = { $in: values };
    if (field === 'id') {
      this.filter._id = { $in: values };
      delete this.filter.id;
    }
    return this;
  }

  /**
   * Add WHERE NOT IN condition
   */
  whereNotIn(field: string, values: any[]): this {
    if (values.length > 0) {
      this.filter[field] = { $nin: values };
      if (field === 'id') {
        this.filter._id = { $nin: values };
        delete this.filter.id;
      }
    }
    return this;
  }

  /**
   * Add WHERE NULL condition
   */
  whereNull(field: string): this {
    this.filter[field] = null;
    return this;
  }

  /**
   * Add WHERE NOT NULL condition
   */
  whereNotNull(field: string): this {
    this.filter[field] = { $ne: null };
    return this;
  }

  /**
   * Add ORDER BY
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    if (!this.findOptions.sort) {
      this.findOptions.sort = {};
    }
    (this.findOptions.sort as any)[field] = direction === 'ASC' ? 1 : -1;
    return this;
  }

  /**
   * Add LIMIT
   */
  limit(count: number): this {
    this.findOptions.limit = count;
    return this;
  }

  /**
   * Add OFFSET
   */
  offset(count: number): this {
    this.findOptions.skip = count;
    return this;
  }

  /**
   * Set INSERT operation
   */
  insert(data: Record<string, any>): this {
    this.operation = 'insert';
    this.updateData = data as any;
    return this;
  }

  /**
   * Set UPDATE operation
   */
  update(data: Record<string, any>): this {
    this.operation = 'update';
    this.updateData = { $set: data } as any;
    return this;
  }

  /**
   * Set DELETE operation
   */
  delete(): this {
    this.operation = 'delete';
    return this;
  }

  /**
   * Execute the query
   */
  async execute(): Promise<QueryResult> {
    const adapter = this.connection.getAdapter();
    if (!adapter) {
      throw new Error('Connection adapter not available');
    }

    const operation: any = {
      collection: this.collectionName,
      operation: this.operation,
    };

    switch (this.operation) {
      case 'find':
        operation.filter = this.filter;
        operation.options = this.findOptions;
        break;
      case 'findOne':
        operation.filter = this.filter;
        operation.options = this.findOptions;
        break;
      case 'insert':
        operation.document = this.updateData;
        break;
      case 'update':
        operation.filter = this.filter;
        operation.update = this.updateData;
        break;
      case 'delete':
        operation.filter = this.filter;
        break;
    }

    // Use the adapter's query method with MongoDB operation
    return await adapter.query('', [operation]);
  }
}

