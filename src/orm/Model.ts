import { ModelAttributes, ModelInstance, QueryOptions, RelationshipOptions } from '../types';
import { QueryBuilder } from '../query/QueryBuilder';
import { MongoDBQueryBuilder } from '../query/MongoDBQueryBuilder';
import { Connection } from '../connection/Connection';
import { HasOne } from '../relationships/HasOne';
import { HasMany } from '../relationships/HasMany';
import { BelongsTo } from '../relationships/BelongsTo';
import { Validator, ValidationEngine, ValidationError } from '../validation';
import { HookManager, HookEvent, HookCallback } from '../hooks';

/**
 * Base Model class that all models should extend
 */
export abstract class Model {
  static tableName: string;
  static connection: Connection | null = null;
  private static relationships: Map<string, { type: string; model: new () => Model; foreignKey?: string; localKey?: string }> = new Map();
  static validationRules?: Record<string, Validator[]>;
  private static hookManagers: Map<typeof Model, HookManager> = new Map();
  static softDeletes: boolean = false;
  static deletedAt: string = 'deleted_at';
  private static softDeleteState: Map<typeof Model, { includeTrashed: boolean; onlyTrashed: boolean }> = new Map();
  
  [key: string]: any;

  /**
   * Get or create hook manager for this model class
   */
  private static getHookManager(ModelClass: typeof Model): HookManager {
    if (!this.hookManagers.has(ModelClass)) {
      this.hookManagers.set(ModelClass, new HookManager());
    }
    return this.hookManagers.get(ModelClass)!;
  }

  /**
   * Register a lifecycle hook
   */
  static hook<T extends Model>(
    this: (new () => T) & typeof Model,
    event: HookEvent,
    callback: HookCallback<T>,
    priority?: number
  ): void {
    const manager = this.getHookManager(this);
    manager.register(event, callback as HookCallback, priority);
  }

  /**
   * Unregister a lifecycle hook
   */
  static unhook<T extends Model>(
    this: (new () => T) & typeof Model,
    event: HookEvent,
    callback: HookCallback<T>
  ): void {
    const manager = this.getHookManager(this);
    manager.unregister(event, callback as HookCallback);
  }

  /**
   * Clear all hooks for an event
   */
  static clearHooks<T extends Model>(
    this: (new () => T) & typeof Model,
    event: HookEvent
  ): void {
    const manager = this.getHookManager(this);
    manager.clear(event);
  }

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
    this: (new () => T) & { tableName: string; softDeletes?: boolean; deletedAt?: string },
    options?: QueryOptions & { include?: string[] }
  ): Promise<T[]> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(this.tableName, connection)
      : new QueryBuilder(this.tableName, connection);

    // Apply soft delete filtering if enabled
    const ModelClass = this as unknown as typeof Model;
    const state = Model.softDeleteState.get(ModelClass) || { includeTrashed: false, onlyTrashed: false };
    const softDeletes = (ModelClass as any).softDeletes as boolean | undefined;
    const deletedAt = (ModelClass as any).deletedAt as string | undefined;
    if (softDeletes && !state.includeTrashed) {
      const deletedAtField = deletedAt || 'deleted_at';
      if (state.onlyTrashed) {
        query.where(deletedAtField, '!=', null);
      } else {
        query.whereNull(deletedAtField);
      }
    }

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

    // Reset soft delete modifiers after query
    const ModelClassForAll = this as unknown as typeof Model;
    Model.resetSoftDeleteModifiers(ModelClassForAll);

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
    this: (new () => T) & { tableName: string; softDeletes?: boolean; deletedAt?: string },
    id: number | string,
    options?: { include?: string[] }
  ): Promise<T | null> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(this.tableName, connection)
      : new QueryBuilder(this.tableName, connection);
    query.where('id', '=', id);

    // Apply soft delete filtering if enabled
    const ModelClassForId = this as unknown as typeof Model;
    const stateForId = Model.softDeleteState.get(ModelClassForId) || { includeTrashed: false, onlyTrashed: false };
    const softDeletesForId = (ModelClassForId as any).softDeletes as boolean | undefined;
    const deletedAtForId = (ModelClassForId as any).deletedAt as string | undefined;
    if (softDeletesForId && !stateForId.includeTrashed) {
      const deletedAtField = deletedAtForId || 'deleted_at';
      if (stateForId.onlyTrashed) {
        query.where(deletedAtField, '!=', null);
      } else {
        query.whereNull(deletedAtField);
      }
    }

    const result = await query.execute();
    if (result.rows.length === 0) {
      // Reset soft delete modifiers after query
      Model.resetSoftDeleteModifiers(ModelClassForId);
      return null;
    }

    const instance = Model.hydrate(this, result.rows[0]) as T;

    // Reset soft delete modifiers after query
    Model.resetSoftDeleteModifiers(ModelClassForId);

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
    this: (new () => T) & { tableName: string; softDeletes?: boolean; deletedAt?: string },
    conditions: Record<string, any>,
    options?: { include?: string[] }
  ): Promise<T | null> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(this.tableName, connection)
      : new QueryBuilder(this.tableName, connection);

    for (const [field, value] of Object.entries(conditions)) {
      query.where(field, '=', value);
    }

    // Apply soft delete filtering if enabled
    const ModelClass = this as unknown as typeof Model;
    const state = Model.softDeleteState.get(ModelClass) || { includeTrashed: false, onlyTrashed: false };
    const softDeletes = (ModelClass as any).softDeletes as boolean | undefined;
    const deletedAt = (ModelClass as any).deletedAt as string | undefined;
    if (softDeletes && !state.includeTrashed) {
      const deletedAtField = deletedAt || 'deleted_at';
      if (state.onlyTrashed) {
        query.where(deletedAtField, '!=', null);
      } else {
        query.whereNull(deletedAtField);
      }
    }

    query.limit(1);
    const result = await query.execute();

    if (result.rows.length === 0) {
      // Reset soft delete modifiers after query
      Model.resetSoftDeleteModifiers(ModelClass);
      return null;
    }

    const instance = Model.hydrate(this, result.rows[0]) as T;

    // Reset soft delete modifiers after query
    Model.resetSoftDeleteModifiers(ModelClass);

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
    this: (new () => T) & typeof Model & { tableName: string; validationRules?: Record<string, Validator[]> },
    attributes: ModelAttributes,
    options?: { skipValidation?: boolean }
  ): Promise<T> {
    const ModelClass = this as typeof Model;
    const hookManager = Model.getHookManager(ModelClass);
    const instance = Model.hydrate(this, attributes) as T;

    // Execute beforeCreate hooks
    await hookManager.execute(HookEvent.BEFORE_CREATE, instance);

    // Validate attributes before creating unless explicitly skipped
    if (!options?.skipValidation && this.validationRules) {
      await ValidationEngine.validate(instance, this.validationRules);
    }

    const connection = Model.getConnection();
    const query = new QueryBuilder(this.tableName, connection);
    query.insert(attributes);

    const result = await query.execute();
    (instance as any).id = result.insertId;

    // Execute afterCreate hooks
    await hookManager.execute(HookEvent.AFTER_CREATE, instance);

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
   * Validate the current instance
   */
  async validate(): Promise<void> {
    const ModelClass = this.constructor as typeof Model;
    const hookManager = Model.getHookManager(ModelClass);
    const ModelClassWithRules = ModelClass as typeof Model & { validationRules?: Record<string, Validator[]> };
    
    // Execute beforeValidate hooks
    await hookManager.execute(HookEvent.BEFORE_VALIDATE, this);
    
    if (ModelClassWithRules.validationRules) {
      await ValidationEngine.validate(this, ModelClassWithRules.validationRules);
    }
    
    // Execute afterValidate hooks
    await hookManager.execute(HookEvent.AFTER_VALIDATE, this);
  }

  /**
   * Save the current instance (insert or update)
   */
  async save(options?: { skipValidation?: boolean }): Promise<this> {
    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const hookManager = Model.getHookManager(ModelClass);
    const isNew = !this.id;

    // Execute beforeSave hooks
    await hookManager.execute(HookEvent.BEFORE_SAVE, this);

    // Validate before save unless explicitly skipped
    if (!options?.skipValidation) {
      await this.validate();
    }

    // Execute beforeCreate or beforeUpdate hooks
    if (isNew) {
      await hookManager.execute(HookEvent.BEFORE_CREATE, this);
    } else {
      await hookManager.execute(HookEvent.BEFORE_UPDATE, this);
    }

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    // Get all attributes except methods
    const attributes: ModelAttributes = {};
    for (const key in this) {
      if (this.hasOwnProperty(key) && typeof this[key] !== 'function') {
        attributes[key] = this[key];
      }
    }

    if (this.id) {
      // Update existing record
      if (isMongoDB) {
        (query as MongoDBQueryBuilder).update(attributes);
        (query as MongoDBQueryBuilder).where('id', '=', this.id);
      } else {
        (query as QueryBuilder).update(attributes);
        (query as QueryBuilder).where('id', '=', this.id);
      }
      await query.execute();
      
      // Execute afterUpdate hooks
      await hookManager.execute(HookEvent.AFTER_UPDATE, this);
    } else {
      // Insert new record
      query.insert(attributes);
      const result = await query.execute();
      this.id = result.insertId;
      
      // Execute afterCreate hooks
      await hookManager.execute(HookEvent.AFTER_CREATE, this);
    }

    // Execute afterSave hooks
    await hookManager.execute(HookEvent.AFTER_SAVE, this);

    return this;
  }

  /**
   * Update the current instance with new attributes
   */
  async update(attributes: Partial<ModelAttributes>, options?: { skipValidation?: boolean }): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot update a model instance without an id. Use save() to create a new record.');
    }

    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const hookManager = Model.getHookManager(ModelClass);

    // Execute beforeUpdate hooks
    await hookManager.execute(HookEvent.BEFORE_UPDATE, this);

    // Validate updated attributes unless explicitly skipped
    if (!options?.skipValidation) {
      const ModelClassWithRules = ModelClass as typeof Model & { validationRules?: Record<string, Validator[]> };
      
      if (ModelClassWithRules.validationRules) {
        // Create a temporary object with updated values for validation
        const tempModel = { ...this, ...attributes };
        await ValidationEngine.validate(tempModel as Model, ModelClassWithRules.validationRules);
      }
    }

    const connection = Model.getConnection();
    const query = new QueryBuilder(ModelClass.tableName, connection);

    query.update(attributes);
    query.where('id', '=', this.id);

    await query.execute();

    // Update instance attributes
    Object.assign(this, attributes);

    // Execute afterUpdate hooks
    await hookManager.execute(HookEvent.AFTER_UPDATE, this);

    return this;
  }

  /**
   * Delete the current instance (soft delete if enabled, otherwise hard delete)
   */
  async delete(): Promise<boolean> {
    if (!this.id) {
      throw new Error('Cannot delete a model instance without an id.');
    }

    const ModelClass = this.constructor as typeof Model & { 
      tableName: string; 
      softDeletes?: boolean; 
      deletedAt?: string;
    };
    const hookManager = Model.getHookManager(ModelClass);

    // Execute beforeDelete hooks
    await hookManager.execute(HookEvent.BEFORE_DELETE, this);

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    // If soft deletes are enabled, update deleted_at instead of deleting
    if (ModelClass.softDeletes) {
      const deletedAtField = ModelClass.deletedAt || 'deleted_at';
      const deletedAtValue = new Date();
      
      query.update({ [deletedAtField]: deletedAtValue });
      query.where('id', '=', this.id);
      
      const result = await query.execute();
      
      if (result.rowCount && result.rowCount > 0) {
        // Update instance
        (this as any)[deletedAtField] = deletedAtValue;
        
        // Execute afterDelete hooks
        await hookManager.execute(HookEvent.AFTER_DELETE, this);
        
        return true;
      }
      
      return false;
    } else {
      // Hard delete
      query.delete();
      query.where('id', '=', this.id);

      const result = await query.execute();

      if (result.rowCount && result.rowCount > 0) {
        // Execute afterDelete hooks
        await hookManager.execute(HookEvent.AFTER_DELETE, this);
        
        // Clear the id to mark as deleted
        this.id = undefined;
        return true;
      }

      return false;
    }
  }

  /**
   * Permanently delete the current instance (force delete)
   */
  async forceDelete(): Promise<boolean> {
    if (!this.id) {
      throw new Error('Cannot delete a model instance without an id.');
    }

    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const hookManager = Model.getHookManager(ModelClass);

    // Execute beforeDelete hooks
    await hookManager.execute(HookEvent.BEFORE_DELETE, this);

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    query.delete();
    query.where('id', '=', this.id);

    const result = await query.execute();

    if (result.rowCount && result.rowCount > 0) {
      // Execute afterDelete hooks
      await hookManager.execute(HookEvent.AFTER_DELETE, this);
      
      // Clear the id to mark as deleted
      this.id = undefined;
      return true;
    }

    return false;
  }

  /**
   * Restore a soft-deleted instance
   */
  async restore(): Promise<boolean> {
    if (!this.id) {
      throw new Error('Cannot restore a model instance without an id.');
    }

    const ModelClass = this.constructor as typeof Model & { 
      tableName: string; 
      softDeletes?: boolean; 
      deletedAt?: string;
    };

    if (!ModelClass.softDeletes) {
      throw new Error('Cannot restore a model that does not use soft deletes.');
    }

    const deletedAtField = ModelClass.deletedAt || 'deleted_at';
    const deletedAtValue = (this as any)[deletedAtField];

    if (!deletedAtValue) {
      return false; // Not soft-deleted
    }

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    query.update({ [deletedAtField]: null });
    query.where('id', '=', this.id);

    const result = await query.execute();

    if (result.rowCount && result.rowCount > 0) {
      // Update instance
      (this as any)[deletedAtField] = null;
      return true;
    }

    return false;
  }

  /**
   * Include soft-deleted records in the next query
   */
  static withTrashed<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string; softDeletes?: boolean }
  ): (new () => T) & typeof Model & { tableName: string; softDeletes?: boolean; deletedAt?: string } {
    const ModelClass = this as typeof Model;
    Model.softDeleteState.set(ModelClass, { includeTrashed: true, onlyTrashed: false });
    return this;
  }

  /**
   * Only retrieve soft-deleted records in the next query
   */
  static onlyTrashed<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string; softDeletes?: boolean }
  ): (new () => T) & typeof Model & { tableName: string; softDeletes?: boolean; deletedAt?: string } {
    const ModelClass = this as typeof Model;
    Model.softDeleteState.set(ModelClass, { includeTrashed: false, onlyTrashed: true });
    return this;
  }

  /**
   * Reset soft delete query modifiers
   */
  private static resetSoftDeleteModifiers(ModelClass: typeof Model): void {
    Model.softDeleteState.delete(ModelClass);
  }
}

