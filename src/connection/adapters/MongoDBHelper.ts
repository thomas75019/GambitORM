import { MongoDBAdapter } from './MongoDBAdapter';
import { Collection, Filter, UpdateFilter, FindOptions } from 'mongodb';

/**
 * Helper class for MongoDB-specific operations
 * Provides a more MongoDB-native API
 */
export class MongoDBHelper {
  private adapter: MongoDBAdapter;

  constructor(adapter: MongoDBAdapter) {
    this.adapter = adapter;
  }

  /**
   * Get a collection for native MongoDB operations
   */
  collection(name: string): Collection | undefined {
    return this.adapter.getCollection(name);
  }

  /**
   * Find documents in a collection
   */
  async find<T = any>(
    collection: string,
    filter: Filter<any> = {},
    options?: FindOptions
  ): Promise<T[]> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const cursor = coll.find(filter, options);
    return await cursor.toArray() as T[];
  }

  /**
   * Find one document
   */
  async findOne<T = any>(
    collection: string,
    filter: Filter<any> = {},
    options?: FindOptions
  ): Promise<T | null> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    return await coll.findOne(filter, options) as T | null;
  }

  /**
   * Insert one document
   */
  async insertOne<T = any>(
    collection: string,
    document: T
  ): Promise<{ insertedId: string }> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const session = this.adapter.getSession();
    const options = session ? { session } : {};

    const result = await coll.insertOne(document as any, options);
    return { insertedId: result.insertedId.toString() };
  }

  /**
   * Insert many documents
   */
  async insertMany<T = any>(
    collection: string,
    documents: T[]
  ): Promise<{ insertedIds: string[]; insertedCount: number }> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const session = this.adapter.getSession();
    const options = session ? { session } : {};

    const result = await coll.insertMany(documents as any[], options);
    return {
      insertedIds: Object.values(result.insertedIds).map(id => id.toString()),
      insertedCount: result.insertedCount,
    };
  }

  /**
   * Update one document
   */
  async updateOne<T = any>(
    collection: string,
    filter: Filter<any>,
    update: UpdateFilter<any>
  ): Promise<{ modifiedCount: number }> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const session = this.adapter.getSession();
    const options = session ? { session } : {};

    const result = await coll.updateOne(filter, update, options);
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Update many documents
   */
  async updateMany<T = any>(
    collection: string,
    filter: Filter<any>,
    update: UpdateFilter<any>
  ): Promise<{ modifiedCount: number }> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const session = this.adapter.getSession();
    const options = session ? { session } : {};

    const result = await coll.updateMany(filter, update, options);
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete one document
   */
  async deleteOne<T = any>(
    collection: string,
    filter: Filter<any>
  ): Promise<{ deletedCount: number }> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const session = this.adapter.getSession();
    const options = session ? { session } : {};

    const result = await coll.deleteOne(filter, options);
    return { deletedCount: result.deletedCount };
  }

  /**
   * Delete many documents
   */
  async deleteMany<T = any>(
    collection: string,
    filter: Filter<any>
  ): Promise<{ deletedCount: number }> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    const session = this.adapter.getSession();
    const options = session ? { session } : {};

    const result = await coll.deleteMany(filter, options);
    return { deletedCount: result.deletedCount };
  }

  /**
   * Count documents
   */
  async count<T = any>(
    collection: string,
    filter: Filter<any> = {}
  ): Promise<number> {
    const coll = this.adapter.getCollection(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    return await coll.countDocuments(filter);
  }
}

