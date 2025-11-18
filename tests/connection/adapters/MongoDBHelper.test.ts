import { MongoDBHelper } from '../../../src/connection/adapters/MongoDBHelper';
import { MongoDBAdapter } from '../../../src/connection/adapters/MongoDBAdapter';
import { DatabaseConfig } from '../../../src/types';
import { MockMongoDBAdapter } from '../../__mocks__/MongoDBAdapter';

// Mock MongoDBAdapter
jest.mock('../../../src/connection/adapters/MongoDBAdapter', () => {
  return {
    MongoDBAdapter: require('../../__mocks__/MongoDBAdapter').MockMongoDBAdapter,
  };
});

describe('MongoDBHelper', () => {
  let helper: MongoDBHelper;
  let mockAdapter: MockMongoDBAdapter;

  beforeEach(async () => {
    const config: DatabaseConfig = {
      host: 'localhost',
      port: 27017,
      database: 'testdb',
      dialect: 'mongodb',
    };

    mockAdapter = new MockMongoDBAdapter(config);
    await mockAdapter.connect();
    helper = new MongoDBHelper(mockAdapter as any);
  });

  afterEach(async () => {
    await mockAdapter.disconnect();
  });

  describe('find', () => {
    it('should find documents', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);

      const results = await helper.find('users', { age: 30 });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('John');
    });

    it('should find documents with MongoDB operators', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', age: 25 },
      }]);

      const results = await helper.find('users', { age: { $gte: 30 } });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('John');
    });

    it('should find documents with options', async () => {
      for (let i = 0; i < 5; i++) {
        await mockAdapter.query('', [{
          operation: 'insert',
          collection: 'users',
          document: { name: `User${i}`, age: i * 10 },
        }]);
      }

      const results = await helper.find('users', {}, {
        sort: { age: -1 },
        limit: 2,
      });

      expect(results.length).toBe(2);
      expect(results[0].age).toBe(40);
    });
  });

  describe('findOne', () => {
    it('should find one document', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', email: 'john@example.com' },
      }]);

      const result = await helper.findOne('users', { email: 'john@example.com' });
      expect(result).not.toBeNull();
      expect(result?.name).toBe('John');
    });

    it('should return null if not found', async () => {
      const result = await helper.findOne('users', { email: 'nonexistent@example.com' });
      expect(result).toBeNull();
    });
  });

  describe('insertOne', () => {
    it('should insert one document', async () => {
      const result = await helper.insertOne('users', {
        name: 'John',
        email: 'john@example.com',
      });

      expect(result.insertedId).toBeDefined();

      const found = await helper.findOne('users', { _id: result.insertedId });
      expect(found).not.toBeNull();
      expect(found?.name).toBe('John');
    });
  });

  describe('insertMany', () => {
    it('should insert many documents', async () => {
      const result = await helper.insertMany('users', [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ]);

      expect(result.insertedCount).toBe(2);
      expect(result.insertedIds.length).toBe(2);

      const all = await helper.find('users');
      expect(all.length).toBe(2);
    });
  });

  describe('updateOne', () => {
    it('should update one document', async () => {
      const insertResult = await helper.insertOne('users', {
        name: 'John',
        age: 30,
      });

      const result = await helper.updateOne(
        'users',
        { _id: insertResult.insertedId },
        { $set: { age: 31 } }
      );

      expect(result.modifiedCount).toBe(1);

      const updated = await helper.findOne('users', { _id: insertResult.insertedId });
      expect(updated?.age).toBe(31);
    });
  });

  describe('updateMany', () => {
    it('should update many documents', async () => {
      await helper.insertOne('users', { name: 'John', status: 'inactive' });
      await helper.insertOne('users', { name: 'Jane', status: 'inactive' });

      const result = await helper.updateMany(
        'users',
        { status: 'inactive' },
        { $set: { status: 'active' } }
      );

      expect(result.modifiedCount).toBe(2);

      const active = await helper.find('users', { status: 'active' });
      expect(active.length).toBe(2);
    });
  });

  describe('deleteOne', () => {
    it('should delete one document', async () => {
      const insertResult = await helper.insertOne('users', {
        name: 'John',
      });

      const result = await helper.deleteOne('users', { _id: insertResult.insertedId });
      expect(result.deletedCount).toBe(1);

      const found = await helper.findOne('users', { _id: insertResult.insertedId });
      expect(found).toBeNull();
    });
  });

  describe('deleteMany', () => {
    it('should delete many documents', async () => {
      await helper.insertOne('users', { name: 'John', status: 'inactive' });
      await helper.insertOne('users', { name: 'Jane', status: 'inactive' });

      const result = await helper.deleteMany('users', { status: 'inactive' });
      expect(result.deletedCount).toBe(2);

      const remaining = await helper.find('users');
      expect(remaining.length).toBe(0);
    });
  });

  describe('count', () => {
    it('should count documents', async () => {
      await helper.insertOne('users', { name: 'John' });
      await helper.insertOne('users', { name: 'Jane' });

      const count = await helper.count('users');
      expect(count).toBe(2);
    });

    it('should count documents with filter', async () => {
      await helper.insertOne('users', { name: 'John', status: 'active' });
      await helper.insertOne('users', { name: 'Jane', status: 'inactive' });

      const count = await helper.count('users', { status: 'active' });
      expect(count).toBe(1);
    });
  });

  describe('collection', () => {
    it('should return collection instance', () => {
      const collection = helper.collection('users');
      expect(collection).toBeDefined();
    });
  });
});

