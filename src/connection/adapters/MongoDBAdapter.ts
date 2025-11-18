import { DatabaseConfig, QueryResult } from '../../types';
import { DatabaseAdapter } from './BaseAdapter';
import { MongoClient, Db, Collection, ClientSession, Filter, UpdateFilter, FindOptions } from 'mongodb';

/**
 * MongoDB database adapter
 * Supports MongoDB 4.0+ with transaction support
 * 
 * Note: MongoDB doesn't use SQL. This adapter provides native MongoDB operations.
 * For SQL-like queries, use the Model API or MongoDBHelper.
 */
export class MongoDBAdapter extends DatabaseAdapter {
  private client?: MongoClient;
  private db?: Db;
  private session?: ClientSession;

  async connect(): Promise<void> {
    if (!this.config.database) {
      throw new Error('MongoDB requires database name');
    }

    // Build connection string
    let connectionString: string;

    if (this.config.host && this.config.port) {
      // Standard connection
      const auth = this.config.user && this.config.password
        ? `${this.config.user}:${encodeURIComponent(this.config.password)}@`
        : '';
      connectionString = `mongodb://${auth}${this.config.host}:${this.config.port}/${this.config.database}`;
    } else if (this.config.host) {
      // Connection string provided in host (e.g., mongodb://localhost:27017/mydb)
      connectionString = this.config.host;
    } else {
      // Default to localhost
      connectionString = `mongodb://localhost:27017/${this.config.database}`;
    }

    // Add connection options
    const options: any = {};
    if (this.config.pool) {
      options.maxPoolSize = this.config.pool.max || 10;
      options.minPoolSize = this.config.pool.min || 0;
    }

    this.client = new MongoClient(connectionString, options);
    await this.client.connect();
    this.db = this.client.db(this.config.database);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.endSession();
      this.session = undefined;
    }

    if (this.client) {
      await this.client.close();
      this.client = undefined;
      this.db = undefined;
    }
    this.connected = false;
  }

  /**
   * Execute a query
   * 
   * For MongoDB, this method accepts MongoDB operations in a special format:
   * - For SELECT: { operation: 'find', collection: string, filter?: Filter, options?: FindOptions }
   * - For INSERT: { operation: 'insert', collection: string, document: any }
   * - For UPDATE: { operation: 'update', collection: string, filter: Filter, update: UpdateFilter }
   * - For DELETE: { operation: 'delete', collection: string, filter: Filter }
   * 
   * For native MongoDB operations, use MongoDBHelper or getCollection() directly.
   */
  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.connected || !this.db) {
      throw new Error('Database connection is not established');
    }

    // If sql is actually a MongoDB operation object, use it directly
    if (typeof sql === 'object' && sql !== null) {
      return await this.executeMongoOperation(sql as any);
    }

    // Otherwise, try to parse as MongoDB operation from params
    if (params && params.length > 0 && typeof params[0] === 'object') {
      const operation = params[0];
      return await this.executeMongoOperation(operation);
    }

    throw new Error('MongoDB adapter requires MongoDB operation objects, not SQL. Use MongoDBHelper or Model API for MongoDB operations.');
  }

  /**
   * Execute a MongoDB operation
   */
  private async executeMongoOperation(operation: {
    operation: 'find' | 'findOne' | 'insert' | 'insertMany' | 'update' | 'updateMany' | 'delete' | 'deleteMany';
    collection: string;
    filter?: Filter<any>;
    document?: any;
    documents?: any[];
    update?: UpdateFilter<any>;
    options?: FindOptions;
  }): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const collection = this.db.collection(operation.collection);
    const sessionOptions = this.session ? { session: this.session } : {};

    try {
      switch (operation.operation) {
        case 'find':
          const cursor = collection.find(operation.filter || {}, operation.options || {});
          const rows = await cursor.toArray();
          return {
            rows: this.convertFromMongo(rows),
            rowCount: rows.length,
          };

        case 'findOne':
          const doc = await collection.findOne(operation.filter || {}, operation.options || {});
          return {
            rows: doc ? [this.convertFromMongo(doc)] : [],
            rowCount: doc ? 1 : 0,
          };

        case 'insert':
          if (!operation.document) {
            throw new Error('Document required for insert operation');
          }
          const insertDoc = this.convertToMongo(operation.document);
          const insertResult = await collection.insertOne(insertDoc, sessionOptions);
          return {
            rows: [],
            rowCount: 1,
            insertId: insertResult.insertedId.toString(),
          };

        case 'insertMany':
          if (!operation.documents || !Array.isArray(operation.documents)) {
            throw new Error('Documents array required for insertMany operation');
          }
          const insertDocs = operation.documents.map(doc => this.convertToMongo(doc));
          const insertManyResult = await collection.insertMany(insertDocs, sessionOptions);
          return {
            rows: [],
            rowCount: insertManyResult.insertedCount,
            insertId: insertManyResult.insertedIds[0]?.toString(),
          };

        case 'update':
          if (!operation.filter || !operation.update) {
            throw new Error('Filter and update required for update operation');
          }
          const updateResult = await collection.updateOne(
            operation.filter,
            operation.update,
            sessionOptions
          );
          return {
            rows: [],
            rowCount: updateResult.modifiedCount,
          };

        case 'updateMany':
          if (!operation.filter || !operation.update) {
            throw new Error('Filter and update required for updateMany operation');
          }
          const updateManyResult = await collection.updateMany(
            operation.filter,
            operation.update,
            sessionOptions
          );
          return {
            rows: [],
            rowCount: updateManyResult.modifiedCount,
          };

        case 'delete':
          if (!operation.filter) {
            throw new Error('Filter required for delete operation');
          }
          const deleteResult = await collection.deleteOne(operation.filter, sessionOptions);
          return {
            rows: [],
            rowCount: deleteResult.deletedCount,
          };

        case 'deleteMany':
          if (!operation.filter) {
            throw new Error('Filter required for deleteMany operation');
          }
          const deleteManyResult = await collection.deleteMany(operation.filter, sessionOptions);
          return {
            rows: [],
            rowCount: deleteManyResult.deletedCount,
          };

        default:
          throw new Error(`Unsupported MongoDB operation: ${(operation as any).operation}`);
      }
    } catch (error) {
      throw new Error(`MongoDB operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert document from MongoDB format (_id) to ORM format (id)
   */
  private convertFromMongo(doc: any): any {
    if (!doc) return doc;
    
    const converted = { ...doc };
    if (converted._id && !converted.id) {
      converted.id = converted._id.toString();
    }
    // Keep _id for MongoDB compatibility
    return converted;
  }

  /**
   * Convert document from ORM format (id) to MongoDB format (_id)
   */
  private convertToMongo(doc: any): any {
    if (!doc) return doc;
    
    const converted = { ...doc };
    // If id is provided and _id is not, use id as _id
    if (converted.id !== undefined && converted._id === undefined) {
      converted._id = converted.id;
      delete converted.id;
    }
    return converted;
  }

  /**
   * Begin a transaction (MongoDB 4.0+)
   */
  async beginTransaction(): Promise<void> {
    if (!this.client) {
      throw new Error('Database connection is not established');
    }

    if (this.session) {
      throw new Error('Transaction already in progress');
    }

    this.session = this.client.startSession();
    this.session.startTransaction();
  }

  /**
   * Commit a transaction
   */
  async commit(): Promise<void> {
    if (!this.session) {
      throw new Error('No active transaction');
    }

    await this.session.commitTransaction();
    await this.session.endSession();
    this.session = undefined;
  }

  /**
   * Rollback a transaction
   */
  async rollback(): Promise<void> {
    if (!this.session) {
      throw new Error('No active transaction');
    }

    await this.session.abortTransaction();
    await this.session.endSession();
    this.session = undefined;
  }

  /**
   * Get the MongoDB database instance for native operations
   */
  getDatabase(): Db | undefined {
    return this.db;
  }

  /**
   * Get a collection for native MongoDB operations
   */
  getCollection(name: string): Collection | undefined {
    return this.db?.collection(name);
  }

  /**
   * Get the current session for transaction operations
   */
  getSession(): ClientSession | undefined {
    return this.session;
  }
}
