import { DatabaseConfig, QueryResult } from '../../src/types';
import { DatabaseAdapter } from '../../src/connection/adapters/BaseAdapter';

/**
 * Mock MongoDB adapter for testing
 */
export class MockMongoDBAdapter extends DatabaseAdapter {
  private mockData: Map<string, any[]> = new Map();
  private mockInsertId: number = 1;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.mockData.clear();
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.connected) {
      throw new Error('Database connection is not established');
    }

    // Handle MongoDB operation objects
    if (params && params.length > 0 && typeof params[0] === 'object' && params[0].operation) {
      const operation = params[0];
      return await this.executeMongoOperation(operation);
    }

    throw new Error('Invalid MongoDB operation');
  }

  private async executeMongoOperation(operation: any): Promise<QueryResult> {
    const collection = operation.collection;
    if (!this.mockData.has(collection)) {
      this.mockData.set(collection, []);
    }

    const data = this.mockData.get(collection)!;

    switch (operation.operation) {
      case 'find':
        let results = [...data];
        
        // Apply filter
        if (operation.filter) {
          results = results.filter(doc => this.matchesFilter(doc, operation.filter));
        }
        
        // Apply sort
        if (operation.options?.sort) {
          const sort = operation.options.sort;
          results.sort((a, b) => {
            for (const [field, direction] of Object.entries(sort)) {
              const aVal = a[field];
              const bVal = b[field];
              if (aVal < bVal) return (direction as number) === 1 ? -1 : 1;
              if (aVal > bVal) return (direction as number) === 1 ? 1 : -1;
            }
            return 0;
          });
        }
        
        // Apply skip first (must be before limit)
        if (operation.options?.skip) {
          results = results.slice(operation.options.skip);
        }
        
        // Apply limit after skip
        if (operation.options?.limit) {
          results = results.slice(0, operation.options.limit);
        }
        
        return {
          rows: results.map(doc => this.convertFromMongo(doc)),
          rowCount: results.length,
        };

      case 'findOne':
        const filtered = data.filter(doc => this.matchesFilter(doc, operation.filter || {}));
        const found = filtered.length > 0 ? filtered[0] : null;
        return {
          rows: found ? [this.convertFromMongo(found)] : [],
          rowCount: found ? 1 : 0,
        };

      case 'insert':
        const doc = { ...operation.document };
        if (!doc._id && !doc.id) {
          doc._id = `mock_${this.mockInsertId++}`;
        }
        if (doc.id && !doc._id) {
          doc._id = doc.id;
        }
        data.push(doc);
        return {
          rows: [],
          rowCount: 1,
          insertId: doc._id.toString(),
        };

      case 'update':
        const updateFilter = operation.filter || {};
        const update = operation.update || {};
        let modifiedCount = 0;
        
        data.forEach(doc => {
          if (this.matchesFilter(doc, updateFilter)) {
            if (update.$set) {
              Object.assign(doc, update.$set);
            }
            modifiedCount++;
          }
        });
        
        return {
          rows: [],
          rowCount: modifiedCount,
        };

      case 'delete':
        const deleteFilter = operation.filter || {};
        const initialLength = data.length;
        const filteredData = data.filter(doc => !this.matchesFilter(doc, deleteFilter));
        const deletedCount = initialLength - filteredData.length;
        this.mockData.set(collection, filteredData);
        
        return {
          rows: [],
          rowCount: deletedCount,
        };

      default:
        throw new Error(`Unsupported operation: ${operation.operation}`);
    }
  }

  private matchesFilter(doc: any, filter: any): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === '_id' || key === 'id') {
        const docId = doc._id || doc.id;
        const filterId = value;
        if (docId?.toString() !== filterId?.toString()) {
          return false;
        }
        continue;
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // MongoDB operators
        const mongoValue = value as any;
        if (mongoValue.$eq !== undefined && doc[key] !== mongoValue.$eq) return false;
        if (mongoValue.$ne !== undefined && doc[key] === mongoValue.$ne) return false;
        if (mongoValue.$gt !== undefined && doc[key] <= mongoValue.$gt) return false;
        if (mongoValue.$gte !== undefined && doc[key] < mongoValue.$gte) return false;
        if (mongoValue.$lt !== undefined && doc[key] >= mongoValue.$lt) return false;
        if (mongoValue.$lte !== undefined && doc[key] > mongoValue.$lte) return false;
        if (mongoValue.$in !== undefined && !mongoValue.$in.includes(doc[key])) return false;
        if (mongoValue.$nin !== undefined && mongoValue.$nin.includes(doc[key])) return false;
        if (mongoValue.$regex !== undefined) {
          const regex = new RegExp(mongoValue.$regex, mongoValue.$options || '');
          if (!regex.test(doc[key])) return false;
        }
      } else {
        if (doc[key] !== value) return false;
      }
    }
    return true;
  }

  private convertFromMongo(doc: any): any {
    if (!doc) return doc;
    const converted = { ...doc };
    if (converted._id && !converted.id) {
      converted.id = converted._id.toString();
    }
    return converted;
  }

  // Mock methods for MongoDBAdapter
  getDatabase(): any {
    return {
      collection: (name: string) => this.getCollection(name),
    };
  }

  getCollection(name: string): any {
    return {
      find: (filter: any, options: any) => ({
        toArray: async () => {
          const result = await this.query('', [{
            operation: 'find',
            collection: name,
            filter,
            options,
          }]);
          return result.rows;
        },
      }),
      findOne: async (filter: any, options: any) => {
        const result = await this.query('', [{
          operation: 'findOne',
          collection: name,
          filter,
          options,
        }]);
        return result.rows[0] || null;
      },
      insertOne: async (doc: any) => {
        const result = await this.query('', [{
          operation: 'insert',
          collection: name,
          document: doc,
        }]);
        return {
          insertedId: result.insertId,
        };
      },
      insertMany: async (docs: any[]) => {
        const insertedIds: any[] = [];
        for (const doc of docs) {
          const result = await this.query('', [{
            operation: 'insert',
            collection: name,
            document: doc,
          }]);
          insertedIds.push(result.insertId);
        }
        return {
          insertedIds,
          insertedCount: docs.length,
        };
      },
      updateOne: async (filter: any, update: any) => {
        const result = await this.query('', [{
          operation: 'update',
          collection: name,
          filter,
          update,
        }]);
        return {
          modifiedCount: result.rowCount || 0,
        };
      },
      updateMany: async (filter: any, update: any) => {
        const result = await this.query('', [{
          operation: 'update',
          collection: name,
          filter,
          update,
        }]);
        return {
          modifiedCount: result.rowCount || 0,
        };
      },
      deleteOne: async (filter: any) => {
        const result = await this.query('', [{
          operation: 'delete',
          collection: name,
          filter,
        }]);
        return {
          deletedCount: result.rowCount || 0,
        };
      },
      deleteMany: async (filter: any) => {
        const result = await this.query('', [{
          operation: 'delete',
          collection: name,
          filter,
        }]);
        return {
          deletedCount: result.rowCount || 0,
        };
      },
      countDocuments: async (filter: any) => {
        const result = await this.query('', [{
          operation: 'find',
          collection: name,
          filter,
        }]);
        return result.rowCount || 0;
      },
    };
  }

  getSession(): any {
    return undefined;
  }
}

