import { ModelAttributes, ModelInstance, QueryOptions, RelationshipOptions } from '../types';
import { QueryBuilder } from '../query/QueryBuilder';
import { MongoDBQueryBuilder } from '../query/MongoDBQueryBuilder';
import { Connection } from '../connection/Connection';
import { HasOne } from '../relationships/HasOne';
import { HasMany } from '../relationships/HasMany';
import { BelongsTo } from '../relationships/BelongsTo';
import { Validator, ValidationEngine, ValidationError } from '../validation';
import { HookManager, HookEvent, HookCallback } from '../hooks';
import { ScopeQueryBuilder } from './ScopeQueryBuilder';

/**
 * Base Model class that all models should extend
 */
export abstract class Model {
  static tableName: string;
  static connection: Connection | null = null;
  private static relationships: Map<string, { type: string; model: new () => Model; foreignKey?: string; localKey?: string }> = new Map();
  static validationRules?: Record<string, Validator[]>;
  private static hookManagers: Map<typeof Model, HookManager> = new Map();
  private static scopes: Map<typeof Model, Record<string, (query: QueryBuilder | MongoDBQueryBuilder, ...args: any[]) => void>> = new Map();
  private static globalScopes: Map<typeof Model, Array<(query: QueryBuilder | MongoDBQueryBuilder) => void>> = new Map();
  static timestamps: boolean = false;
  static createdAt: string = 'created_at';
  static updatedAt: string = 'updated_at';
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
   * Define a local scope
   */
  static scope<T extends Model>(
    this: (new () => T) & typeof Model,
    name: string,
    callback: (query: QueryBuilder | MongoDBQueryBuilder, ...args: any[]) => void
  ): void {
    const ModelClass = this as typeof Model;
    if (!Model.scopes.has(ModelClass)) {
      Model.scopes.set(ModelClass, {});
    }
    const scopes = Model.scopes.get(ModelClass)!;
    scopes[name] = callback;
  }

  /**
   * Add a global scope
   */
  static addGlobalScope<T extends Model>(
    this: (new () => T) & typeof Model,
    name: string,
    callback: (query: QueryBuilder | MongoDBQueryBuilder) => void
  ): void {
    const ModelClass = this as typeof Model;
    if (!Model.globalScopes.has(ModelClass)) {
      Model.globalScopes.set(ModelClass, []);
    }
    const globalScopes = Model.globalScopes.get(ModelClass)!;
    globalScopes.push(callback);
  }

  /**
   * Remove a global scope
   */
  static removeGlobalScope<T extends Model>(
    this: (new () => T) & typeof Model,
    name: string
  ): void {
    const ModelClass = this as typeof Model;
    // Note: Simplified implementation - in full version would track names
    const globalScopes = Model.globalScopes.get(ModelClass);
    if (globalScopes && globalScopes.length > 0) {
      Model.globalScopes.set(ModelClass, []);
    }
  }

  /**
   * Create a scope query builder instance
   */
  static query<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string }
  ): ScopeQueryBuilder<T> {
    const connection = Model.getConnection();
    return new ScopeQueryBuilder(this, connection);
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

    // Apply global scopes
    const ModelClass = this as unknown as typeof Model;
    const globalScopes = Model.globalScopes.get(ModelClass);
    if (globalScopes) {
      for (const scope of globalScopes) {
        scope(query);
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

    // Apply soft delete filtering if enabled
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

    const result = await query.execute();
    const instances = result.rows.map(row => Model.hydrate(this, row)) as T[];

    // Reset soft delete modifiers after query
    Model.resetSoftDeleteModifiers(ModelClass);

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

    // Apply global scopes
    const ModelClass = this as unknown as typeof Model;
    const globalScopes = Model.globalScopes.get(ModelClass);
    if (globalScopes) {
      for (const scope of globalScopes) {
        scope(query);
      }
    }

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

    // Apply global scopes
    const ModelClass = this as unknown as typeof Model;
    const globalScopes = Model.globalScopes.get(ModelClass);
    if (globalScopes) {
      for (const scope of globalScopes) {
        scope(query);
      }
    }

    for (const [field, value] of Object.entries(conditions)) {
      query.where(field, '=', value);
    }

    // Apply soft delete filtering if enabled
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
    this: (new () => T) & typeof Model & { 
      tableName: string; 
      validationRules?: Record<string, Validator[]>;
      timestamps?: boolean;
      createdAt?: string;
      updatedAt?: string;
    },
    attributes: ModelAttributes,
    options?: { skipValidation?: boolean }
  ): Promise<T> {
    const ModelClass = this as typeof Model & {
      timestamps?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
    const hookManager = Model.getHookManager(ModelClass);
    
    // Handle automatic timestamps before creating instance
    const createAttributes = { ...attributes };
    if (ModelClass.timestamps) {
      const createdAtField = ModelClass.createdAt || 'created_at';
      const updatedAtField = ModelClass.updatedAt || 'updated_at';
      const now = new Date();
      
      // Set timestamps if not provided
      if (!createAttributes[createdAtField]) {
        createAttributes[createdAtField] = now;
      }
      if (!createAttributes[updatedAtField]) {
        createAttributes[updatedAtField] = now;
      }
    }
    
    const instance = Model.hydrate(this, createAttributes) as T;

    // Execute beforeCreate hooks
    await hookManager.execute(HookEvent.BEFORE_CREATE, instance);

    // Validate attributes before creating unless explicitly skipped
    if (!options?.skipValidation && this.validationRules) {
      await ValidationEngine.validate(instance, this.validationRules);
    }

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(this.tableName, connection)
      : new QueryBuilder(this.tableName, connection);
    query.insert(createAttributes);

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
    // Store original attributes for dirty checking
    (instance as any).originalAttributes = { ...data };
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
    const ModelClass = this.constructor as typeof Model & { 
      tableName: string;
      timestamps?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
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

    // Handle automatic timestamps
    if (ModelClass.timestamps) {
      const createdAtField = ModelClass.createdAt || 'created_at';
      const updatedAtField = ModelClass.updatedAt || 'updated_at';
      const now = new Date();

      if (isNew) {
        // Set created_at on new records
        if (!attributes[createdAtField]) {
          attributes[createdAtField] = now;
          (this as any)[createdAtField] = now;
        }
        // Set updated_at on new records
        if (!attributes[updatedAtField]) {
          attributes[updatedAtField] = now;
          (this as any)[updatedAtField] = now;
        }
      } else {
        // Update updated_at on existing records
        attributes[updatedAtField] = now;
        (this as any)[updatedAtField] = now;
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

    // Update original attributes after save
    (this as any).originalAttributes = { ...this };
    Object.keys(this).forEach(key => {
      if (key !== 'originalAttributes' && typeof this[key] !== 'function') {
        (this as any).originalAttributes[key] = (this as any)[key];
      }
    });

    return this;
  }

  /**
   * Update the current instance with new attributes
   */
  async update(attributes: Partial<ModelAttributes>, options?: { skipValidation?: boolean }): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot update a model instance without an id. Use save() to create a new record.');
    }

    const ModelClass = this.constructor as typeof Model & { 
      tableName: string;
      timestamps?: boolean;
      updatedAt?: string;
    };
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

    // Handle automatic timestamps
    const updateAttributes = { ...attributes };
    if (ModelClass.timestamps) {
      const updatedAtField = ModelClass.updatedAt || 'updated_at';
      // Only update updated_at if not explicitly provided
      if (!updateAttributes[updatedAtField]) {
        updateAttributes[updatedAtField] = new Date();
      }
    }

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    if (isMongoDB) {
      (query as MongoDBQueryBuilder).update(updateAttributes);
      (query as MongoDBQueryBuilder).where('id', '=', this.id);
    } else {
      (query as QueryBuilder).update(updateAttributes);
      (query as QueryBuilder).where('id', '=', this.id);
    }

    await query.execute();

    // Update instance attributes
    Object.assign(this, updateAttributes);

    // Update original attributes after update
    (this as any).originalAttributes = {};
    Object.keys(this).forEach(key => {
      if (key !== 'originalAttributes' && typeof this[key] !== 'function') {
        (this as any).originalAttributes[key] = (this as any)[key];
      }
    });

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

  /**
   * Count records matching conditions
   */
  static async count<T extends Model>(
    this: (new () => T) & { tableName: string },
    conditions?: Record<string, any>
  ): Promise<number> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(this.tableName, connection)
      : new QueryBuilder(this.tableName, connection);

    // Apply global scopes
    const ModelClass = this as unknown as typeof Model;
    const globalScopesMap = (Model as any).globalScopes;
    if (globalScopesMap) {
      const globalScopes = globalScopesMap.get(ModelClass);
      if (globalScopes) {
        for (const scope of globalScopes) {
          scope(query);
        }
      }
    }

    // Apply where conditions
    if (conditions) {
      for (const [field, value] of Object.entries(conditions)) {
        query.where(field, '=', value);
      }
    }

    if (isMongoDB) {
      const result = await query.execute();
      return result.rowCount || 0;
    } else {
      (query as QueryBuilder).count();
      const result = await query.execute();
      return parseInt(result.rows[0]?.count || '0', 10);
    }
  }

  /**
   * Check if records exist matching conditions
   */
  static async exists<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string },
    conditions?: Record<string, any>
  ): Promise<boolean> {
    const count = await (this as any).count(conditions);
    return count > 0;
  }

  /**
   * Pluck a single column's value from the first N results
   */
  static async pluck<T extends Model>(
    this: (new () => T) & { tableName: string },
    column: string,
    options?: QueryOptions
  ): Promise<any[]> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(this.tableName, connection)
      : new QueryBuilder(this.tableName, connection);

    // Apply global scopes
    const ModelClass = this as unknown as typeof Model;
    const globalScopesMap = (Model as any).globalScopes;
    if (globalScopesMap) {
      const globalScopes = globalScopesMap.get(ModelClass);
      if (globalScopes) {
        for (const scope of globalScopes) {
          scope(query);
        }
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
        const parts = options.orderBy.trim().split(/\s+/);
        const col = parts[0];
        const direction = parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        query.orderBy(col, direction);
      }
    }

    // Apply limit
    if (options?.limit) {
      query.limit(options.limit);
    }

    if (isMongoDB) {
      const result = await query.execute();
      return result.rows.map(row => row[column]);
    } else {
      (query as QueryBuilder).select([column]);
      const result = await query.execute();
      return result.rows.map(row => row[column]);
    }
  }

  /**
   * Get the first record
   */
  static async first<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string },
    options?: QueryOptions & { include?: string[] }
  ): Promise<T | null> {
    const results = await (this as any).findAll({ ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get the last record
   */
  static async last<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string },
    options?: QueryOptions & { include?: string[] }
  ): Promise<T | null> {
    const orderBy = options?.orderBy || 'id DESC';
    const results = await (this as any).findAll({ ...options, orderBy, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Increment a column's value
   */
  async increment(column: string, amount: number = 1): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot increment a model instance without an id.');
    }

    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';

    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(ModelClass.tableName, connection);
      query.update({ $inc: { [column]: amount } });
      query.where('id', '=', this.id);
      await query.execute();
    } else {
      // Use raw SQL for increment
      const sql = `UPDATE ${ModelClass.tableName} SET ${column} = ${column} + ? WHERE id = ?`;
      await connection.query(sql, [amount, this.id]);
    }

    // Update instance
    (this as any)[column] = ((this as any)[column] || 0) + amount;
    (this as any).originalAttributes[column] = (this as any)[column];

    return this;
  }

  /**
   * Decrement a column's value
   */
  async decrement(column: string, amount: number = 1): Promise<this> {
    return this.increment(column, -amount);
  }

  /**
   * Touch the updated_at timestamp
   */
  async touch(column?: string): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot touch a model instance without an id.');
    }

    const ModelClass = this.constructor as typeof Model & { 
      tableName: string;
      timestamps?: boolean;
      updatedAt?: string;
    };

    const updatedAtField = column || ModelClass.updatedAt || 'updated_at';
    const now = new Date();

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    if (isMongoDB) {
      (query as MongoDBQueryBuilder).update({ [updatedAtField]: now });
      (query as MongoDBQueryBuilder).where('id', '=', this.id);
    } else {
      (query as QueryBuilder).update({ [updatedAtField]: now });
      (query as QueryBuilder).where('id', '=', this.id);
    }

    await query.execute();

    // Update instance
    (this as any)[updatedAtField] = now;
    (this as any).originalAttributes[updatedAtField] = now;

    return this;
  }

  /**
   * Reload the model from the database
   */
  async fresh(): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot reload a model instance without an id.');
    }

    const ModelClass = this.constructor as typeof Model & { tableName: string };
    const freshInstance = await (ModelClass as any).findById(this.id);

    if (!freshInstance) {
      throw new Error('Model instance no longer exists in the database.');
    }

    // Copy all attributes from fresh instance
    Object.keys(freshInstance).forEach(key => {
      if (key !== 'originalAttributes') {
        (this as any)[key] = (freshInstance as any)[key];
      }
    });

    // Update original attributes
    (this as any).originalAttributes = {};
    Object.keys(freshInstance).forEach(key => {
      if (key !== 'originalAttributes') {
        (this as any).originalAttributes[key] = (freshInstance as any)[key];
      }
    });

    return this;
  }

  /**
   * Check if the model has been modified
   */
  isDirty(attribute?: string): boolean {
    if (attribute) {
      return (this as any)[attribute] !== (this as any).originalAttributes[attribute];
    }

    // Check all attributes
    for (const key in this) {
      if (this.hasOwnProperty(key) && typeof this[key] !== 'function' && key !== 'originalAttributes') {
        if ((this as any)[key] !== (this as any).originalAttributes[key]) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if the model is clean (not modified)
   */
  isClean(attribute?: string): boolean {
    return !this.isDirty(attribute);
  }

  /**
   * Bulk insert multiple records
   */
  static async bulkInsert<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string },
    records: ModelAttributes[]
  ): Promise<T[]> {
    if (!records || records.length === 0) {
      return [];
    }

    const ModelClass = this as typeof Model & { 
      tableName: string;
      timestamps?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    
    // Handle automatic timestamps if enabled
    const processedRecords = records.map(record => {
      const processed = { ...record };
      if (ModelClass.timestamps) {
        const createdAtField = ModelClass.createdAt || 'created_at';
        const updatedAtField = ModelClass.updatedAt || 'updated_at';
        const now = new Date();
        
        if (!processed[createdAtField]) {
          processed[createdAtField] = now;
        }
        if (!processed[updatedAtField]) {
          processed[updatedAtField] = now;
        }
      }
      return processed;
    });

    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(ModelClass.tableName, connection);
      const result = await query.insert(processedRecords).execute();
      
      // For MongoDB bulk insert, we need to fetch the inserted IDs
      // The adapter returns the first insertId, but we need all of them
      // For now, we'll create instances without IDs and let MongoDB handle them
      const instances: T[] = [];
      for (let i = 0; i < processedRecords.length; i++) {
        // MongoDB will assign _id automatically, but we don't have them here
        // So we'll create instances without IDs for now
        const instance = Model.hydrate(this, { ...processedRecords[i] }) as T;
        instances.push(instance);
      }
      
      return instances;
    } else {
      // For SQL databases, use bulk insert
      const query = new QueryBuilder(ModelClass.tableName, connection);
      const result = await query.insert(processedRecords).execute();
      
      // Hydrate instances - for bulk insert, we may not get individual IDs
      // So we'll create instances with the data and let the database assign IDs
      const instances: T[] = [];
      for (let i = 0; i < processedRecords.length; i++) {
        // Try to get insert ID if available, otherwise use index-based ID
        let insertId: number | string | undefined;
        if (result.insertId) {
          if (typeof result.insertId === 'number') {
            insertId = result.insertId + i;
          } else {
            // For string IDs, we can't increment, so use undefined
            insertId = i === 0 ? result.insertId : undefined;
          }
        }
        const instance = Model.hydrate(this, { ...processedRecords[i], id: insertId }) as T;
        instances.push(instance);
      }
      
      return instances;
    }
  }

  /**
   * Bulk update multiple records matching conditions
   */
  static async bulkUpdate<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string },
    conditions: Record<string, any>,
    updates: Partial<ModelAttributes>
  ): Promise<number> {
    const ModelClass = this as typeof Model & { 
      tableName: string;
      timestamps?: boolean;
      updatedAt?: string;
    };

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    
    // Handle automatic timestamps if enabled
    const updateData = { ...updates };
    if (ModelClass.timestamps) {
      const updatedAtField = ModelClass.updatedAt || 'updated_at';
      if (!updateData[updatedAtField]) {
        updateData[updatedAtField] = new Date();
      }
    }

    // Apply global scopes
    const globalScopesMap = (Model as any).globalScopes;
    if (globalScopesMap) {
      const globalScopes = globalScopesMap.get(ModelClass);
      if (globalScopes) {
        // Create a temporary query to apply scopes
        const tempQuery = isMongoDB
          ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
          : new QueryBuilder(ModelClass.tableName, connection);
        for (const scope of globalScopes) {
          scope(tempQuery);
        }
      }
    }

    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    // Apply conditions
    for (const [field, value] of Object.entries(conditions)) {
      query.where(field, '=', value);
    }

    // Apply soft delete filtering if enabled
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

    if (isMongoDB) {
      (query as MongoDBQueryBuilder).update(updateData);
    } else {
      (query as QueryBuilder).update(updateData);
    }

    const result = await query.execute();
    return result.rowCount || 0;
  }

  /**
   * Bulk delete multiple records matching conditions
   */
  static async bulkDelete<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string },
    conditions: Record<string, any>
  ): Promise<number> {
    const ModelClass = this as typeof Model & { 
      tableName: string;
      softDeletes?: boolean;
      deletedAt?: string;
    };

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const query = isMongoDB
      ? new MongoDBQueryBuilder(ModelClass.tableName, connection)
      : new QueryBuilder(ModelClass.tableName, connection);

    // Apply global scopes
    const globalScopesMap = (Model as any).globalScopes;
    if (globalScopesMap) {
      const globalScopes = globalScopesMap.get(ModelClass);
      if (globalScopes) {
        for (const scope of globalScopes) {
          scope(query);
        }
      }
    }

    // Apply conditions
    for (const [field, value] of Object.entries(conditions)) {
      query.where(field, '=', value);
    }

    // Apply soft delete filtering if enabled
    const state = Model.softDeleteState.get(ModelClass) || { includeTrashed: false, onlyTrashed: false };
    const softDeletes = (ModelClass as any).softDeletes as boolean | undefined;
    const deletedAt = (ModelClass as any).deletedAt as string | undefined;
    
    // If soft deletes are enabled, perform soft delete instead of hard delete
    if (softDeletes && !state.includeTrashed) {
      const deletedAtField = deletedAt || 'deleted_at';
      const now = new Date();
      
      if (isMongoDB) {
        (query as MongoDBQueryBuilder).update({ [deletedAtField]: now });
      } else {
        (query as QueryBuilder).update({ [deletedAtField]: now });
      }
    } else {
      query.delete();
    }

    const result = await query.execute();
    return result.rowCount || 0;
  }

  /**
   * Bulk upsert (insert or update) multiple records
   */
  static async bulkUpsert<T extends Model>(
    this: (new () => T) & typeof Model & { tableName: string },
    records: ModelAttributes[],
    uniqueKeys: string[] = ['id']
  ): Promise<T[]> {
    if (!records || records.length === 0) {
      return [];
    }

    const ModelClass = this as typeof Model & { 
      tableName: string;
      timestamps?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };

    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    
    const instances: T[] = [];

    for (const record of records) {
      // Check if record exists based on unique keys
      const whereConditions: Record<string, any> = {};
      for (const key of uniqueKeys) {
        if (record[key] !== undefined) {
          whereConditions[key] = record[key];
        }
      }

      let existing: T | null = null;
      if (Object.keys(whereConditions).length > 0) {
        existing = await (this as any).findOne(whereConditions);
      }

      if (existing) {
        // Update existing record
        await existing.update(record);
        instances.push(existing);
      } else {
        // Insert new record
        const newInstance = await (this as any).create(record);
        instances.push(newInstance);
      }
    }

    return instances;
  }
}

