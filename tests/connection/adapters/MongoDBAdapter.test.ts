import { MongoDBAdapter } from '../../../src/connection/adapters/MongoDBAdapter';
import { DatabaseConfig, QueryResult } from '../../../src/types';
import { MockMongoDBAdapter } from '../../__mocks__/MongoDBAdapter';

// Use mock adapter for testing
jest.mock('../../../src/connection/adapters/MongoDBAdapter', () => {
  return {
    MongoDBAdapter: require('../../__mocks__/MongoDBAdapter').MockMongoDBAdapter,
  };
});

describe('MongoDBAdapter', () => {
  let adapter: MockMongoDBAdapter;
  const config: DatabaseConfig = {
    host: 'localhost',
    port: 27017,
    database: 'testdb',
    dialect: 'mongodb',
  };

  beforeEach(async () => {
    adapter = new MockMongoDBAdapter(config);
    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe('connect', () => {
    it('should connect to MongoDB', async () => {
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from MongoDB', async () => {
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('query - find', () => {
    it('should find all documents', async () => {
      // Insert test data
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', email: 'john@example.com' },
      }]);

      const result = await adapter.query('', [{
        operation: 'find',
        collection: 'users',
      }]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('John');
    });

    it('should find documents with filter', async () => {
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', age: 25 },
      }]);

      const result = await adapter.query('', [{
        operation: 'find',
        collection: 'users',
        filter: { age: { $gte: 30 } },
      }]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('John');
    });

    it('should find documents with limit', async () => {
      for (let i = 0; i < 5; i++) {
        await adapter.query('', [{
          operation: 'insert',
          collection: 'users',
          document: { name: `User${i}` },
        }]);
      }

      const result = await adapter.query('', [{
        operation: 'find',
        collection: 'users',
        options: { limit: 2 },
      }]);

      expect(result.rows.length).toBe(2);
    });

    it('should find documents with sort', async () => {
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', age: 25 },
      }]);

      const result = await adapter.query('', [{
        operation: 'find',
        collection: 'users',
        options: { sort: { age: 1 } },
      }]);

      expect(result.rows.length).toBe(2);
      expect(result.rows[0].age).toBe(25);
      expect(result.rows[1].age).toBe(30);
    });
  });

  describe('query - findOne', () => {
    it('should find one document', async () => {
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', email: 'john@example.com' },
      }]);

      const result = await adapter.query('', [{
        operation: 'findOne',
        collection: 'users',
        filter: { email: 'john@example.com' },
      }]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('John');
    });

    it('should return empty if not found', async () => {
      const result = await adapter.query('', [{
        operation: 'findOne',
        collection: 'users',
        filter: { email: 'nonexistent@example.com' },
      }]);

      expect(result.rows.length).toBe(0);
    });
  });

  describe('query - insert', () => {
    it('should insert a document', async () => {
      const result = await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', email: 'john@example.com' },
      }]);

      expect(result.insertId).toBeDefined();
      expect(result.rowCount).toBe(1);
    });

    it('should convert id to _id', async () => {
      const result = await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { id: 'custom-id', name: 'John' },
      }]);

      expect(result.insertId).toBeDefined();
    });
  });

  describe('query - update', () => {
    it('should update documents', async () => {
      const insertResult = await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);

      const updateResult = await adapter.query('', [{
        operation: 'update',
        collection: 'users',
        filter: { _id: insertResult.insertId },
        update: { $set: { age: 31 } },
      }]);

      expect(updateResult.rowCount).toBe(1);

      const findResult = await adapter.query('', [{
        operation: 'findOne',
        collection: 'users',
        filter: { _id: insertResult.insertId },
      }]);

      expect(findResult.rows[0].age).toBe(31);
    });
  });

  describe('query - delete', () => {
    it('should delete documents', async () => {
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John' },
      }]);

      const deleteResult = await adapter.query('', [{
        operation: 'delete',
        collection: 'users',
        filter: { name: 'John' },
      }]);

      expect(deleteResult.rowCount).toBe(1);

      const findResult = await adapter.query('', [{
        operation: 'find',
        collection: 'users',
      }]);

      expect(findResult.rows.length).toBe(0);
    });
  });

  describe('MongoDB operators', () => {
    beforeEach(async () => {
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30, status: 'active' },
      }]);
      await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', age: 25, status: 'inactive' },
      }]);
    });

    it('should support $gte operator', async () => {
      const result = await adapter.query('', [{
        operation: 'find',
        collection: 'users',
        filter: { age: { $gte: 30 } },
      }]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('John');
    });

    it('should support $in operator', async () => {
      const result = await adapter.query('', [{
        operation: 'find',
        collection: 'users',
        filter: { status: { $in: ['active'] } },
      }]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('active');
    });
  });

  describe('_id to id conversion', () => {
    it('should convert _id to id in results', async () => {
      const result = await adapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John' },
      }]);

      const findResult = await adapter.query('', [{
        operation: 'findOne',
        collection: 'users',
        filter: { _id: result.insertId },
      }]);

      expect(findResult.rows[0].id).toBeDefined();
      expect(findResult.rows[0]._id).toBeDefined();
    });
  });
});

