import { ModelAttributes, ModelInstance, QueryOptions, RelationshipOptions } from '../types';
import { QueryBuilder } from '../query/QueryBuilder';
import { Connection } from '../connection/Connection';
import { HasOne } from '../relationships/HasOne';
import { HasMany } from '../relationships/HasMany';
import { BelongsTo } from '../relationships/BelongsTo';

/**
 * Base Model class that all models should extend
 */
export abstract class Model {
  static tableName: string;
  static connection: Connection | null = null;
  private static relationships: Map<string, { type: string; model: new () => Model; foreignKey?: string; localKey?: string }> = new Map();
  
  [key: string]: any;

  /**
   * Set the database connection for all models
   */
  static setConnection(connection: Connection): void {
    Model.connection = connection;
  }

  /**
   * Get the database connection
   */
  static getConnection(): Connection {
    if (!Model.connection) {
      throw new Error('Database connection not set. Call Model.setConnection() or use GambitORM.');
    }
    return Model.connection;
  }

  /**
   * Define a hasOne relationship
   */
  static hasOne<T extends Model>(
    this: (new () => T) & { tableName: string },
    relatedModel: new () => Model,
    foreignKey?: string,
    localKey?: string
  ): HasOne {
    const instance = new this();
    return new HasOne(instance, relatedModel, foreignKey, localKey);
  }

  /**
   * Define a hasMany relationship
   */
  static hasMany<T extends Model>(
    this: (new () => T) & { tableName: string },
    relatedModel: new () => Model,
    foreignKey?: string,
    localKey?: string
  ): HasMany {
    const instance = new this();
    return new HasMany(instance, relatedModel, foreignKey, localKey);
  }

  /**
   * Define a belongsTo relationship
   */
  static belongsTo<T extends Model>(
    this: (new () => T) & { tableName: string },
    relatedModel: new () => Model,
    foreignKey?: string,
    localKey?: string
  ): BelongsTo {
    const instance = new this();
    return new BelongsTo(instance, relatedModel, foreignKey, localKey);
  }

  /**
   * Instance method: hasOne relationship
   */
  hasOne(relatedModel: new () => Model, foreignKey?: string, localKey?: string): HasOne {
    return new HasOne(this, relatedModel, foreignKey, localKey);
  }

  /**
   * Instance method: hasMany relationship
   */
  hasMany(relatedModel: new () => Model, foreignKey?: string, localKey?: string): HasMany {
    return new HasMany(this, relatedModel, foreignKey, localKey);
  }

  /**
   * Instance method: belongsTo relationship
   */
  belongsTo(relatedModel: new () => Model, foreignKey?: string, localKey?: string): BelongsTo {
    return new BelongsTo(this, relatedModel, foreignKey, localKey);
  }

  /**
   * Find all records with optional eager loading
   */
  static async findAll<T extends Model>(
    this: (new () => T) & { tableName: string },
    options?: QueryOptions & { include?: string[] }
  ): Promise<T[]> {
    const connection = Model.getConnection();
    const query = new QueryBuilder(this.tableName, connection);

    // Apply where conditions
    if (options?.where) {
      for (const [field, value] of Object.entries(options.where)) {
        query.where(field, '=', value);
      }
    }

    // Apply order by
    if (options?.orderBy) {
      if (typeof options.orderBy === 'string') {
        // Simple string format: "column ASC" or "column DESC"
        const parts = options.orderBy.trim().split(/\s+/);
        const column = parts[0];
        const direction = parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        query.orderBy(column, direction);
      } else if (Array.isArray(options.orderBy)) {
        options.orderBy.forEach(order => {
          query.orderBy(order.column, order.direction);
        });
      }
    }

    // Apply limit and offset
    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    const result = await query.execute();
    const instances = result.rows.map(row => Model.hydrate(this, row)) as T[];

    // Eager load relationships if specified
    if (options?.include && options.include.length > 0) {
      await Model.eagerLoadRelations(instances, options.include);
    }

    return instances;
  }

  /**
   * Find a single record by ID with optional eager loading
   */
  static async findById<T extends Model>(
    this: (new () => T) & { tableName: string },
    id: number | string,
    options?: { include?: string[] }
  ): Promise<T | null> {
    const connection = Model.getConnection();
    const query = new QueryBuilder(this.tableName, connection);
    query.where('id', '=', id);

    const result = await query.execute();
    if (result.rows.length === 0) {
      return null;
    }

    const instance = Model.hydrate(this, result.rows[0]) as T;

    // Eager load relationships if specified
    if (options?.include && options.include.length > 0) {
      await Model.eagerLoadRelations([instance], options.include);
    }

    return instance;
  }

  /**
   * Find a single record by conditions with optional eager loading
   */
  static async findOne<T extends Model>(
    this: (new () => T) & { tableName: string },
    conditions: Record<string, any>,
    options?: { include?: string[] }
  ): Promise<T | null> {
    const connection = Model.getConnection();
    const query = new QueryBuilder(this.tableName, connection);

    for (const [field, value] of Object.entries(conditions)) {
      query.where(field, '=', value);
    }

    query.limit(1);
    const result = await query.execute();

    if (result.rows.length === 0) {
      return null;
    }

    const instance = Model.hydrate(this, result.rows[0]) as T;

    // Eager load relationships if specified
    if (options?.include && options.include.length > 0) {
      await Model.eagerLoadRelations([instance], options.include);
    }

    return instance;
  }

  /**
   * Eager load relationships for multiple instances
   */
  private static async eagerLoadRelations<T extends Model>(
    instances: T[],
    relationships: string[]
  ): Promise<void> {
    if (instances.length === 0) {
      return;
    }

    // This is a simplified version - in a full implementation,
    // you would need to track relationship definitions on the model
    // For now, we'll implement basic eager loading that works with
    // the relationship methods defined on instances
    
    // Group instances by their IDs for batch loading
    const ids = instances.map(inst => inst.id).filter(id => id !== undefined);
    
    if (ids.length === 0) {
      return;
    }

    // For each relationship, load it for all instances
    // This is a placeholder - full implementation would need relationship registry
    for (const relName of relationships) {
      // The actual relationship loading would be handled by the relationship classes
      // This is a simplified implementation
    }
  }

  /**
   * Create a new record
   */
  static async create<T extends Model>(
    this: (new () => T) & { tableName: string },
    attributes: ModelAttributes
  ): Promise<T> {
    const connection = Model.getConnection();
    const query = new QueryBuilder(this.tableName, connection);
    query.insert(attributes);

    const result = await query.execute();
    const instance = Model.hydrate(this, { ...attributes, id: result.insertId }) as T;
    return instance;
  }

  /**
   * Hydrate a model instance from database row
   */
  private static hydrate<T extends Model>(ModelClass: new () => T, data: any): T {
    const instance = new ModelClass();
    Object.assign(instance, data);
    return instance;
  }

  /**
   * Save the current instance (insert or update)
   */
  async save(): Promise<this> {
    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const connection = Model.getConnection();
    const query = new QueryBuilder(ModelClass.tableName, connection);

    // Get all attributes except methods
    const attributes: ModelAttributes = {};
    for (const key in this) {
      if (this.hasOwnProperty(key) && typeof this[key] !== 'function') {
        attributes[key] = this[key];
      }
    }

    if (this.id) {
      // Update existing record
      query.update(attributes);
      query.where('id', '=', this.id);
      await query.execute();
    } else {
      // Insert new record
      query.insert(attributes);
      const result = await query.execute();
      this.id = result.insertId;
    }

    return this;
  }

  /**
   * Update the current instance with new attributes
   */
  async update(attributes: Partial<ModelAttributes>): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot update a model instance without an id. Use save() to create a new record.');
    }

    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const connection = Model.getConnection();
    const query = new QueryBuilder(ModelClass.tableName, connection);

    query.update(attributes);
    query.where('id', '=', this.id);

    await query.execute();

    // Update instance attributes
    Object.assign(this, attributes);

    return this;
  }

  /**
   * Delete the current instance
   */
  async delete(): Promise<boolean> {
    if (!this.id) {
      throw new Error('Cannot delete a model instance without an id.');
    }

    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const connection = Model.getConnection();
    const query = new QueryBuilder(ModelClass.tableName, connection);

    query.delete();
    query.where('id', '=', this.id);

    const result = await query.execute();

    if (result.rowCount && result.rowCount > 0) {
      // Clear the id to mark as deleted
      this.id = undefined;
      return true;
    }

    return false;
  }
}

