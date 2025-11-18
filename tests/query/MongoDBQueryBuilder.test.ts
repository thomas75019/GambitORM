import { MongoDBQueryBuilder } from '../../src/query/MongoDBQueryBuilder';
import { Connection } from '../../src/connection/Connection';
import { DatabaseConfig } from '../../src/types';
import { MockMongoDBAdapter } from '../__mocks__/MongoDBAdapter';

describe('MongoDBQueryBuilder', () => {
  let connection: Connection;
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

    // Create connection with mock adapter
    connection = new Connection(config);
    (connection as any).adapter = mockAdapter;
  });

  afterEach(async () => {
    await mockAdapter.disconnect();
  });

  describe('where', () => {
    it('should build WHERE condition', async () => {
      // Insert test data
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.where('name', '=', 'John');

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('John');
    });

    it('should support > operator', async () => {
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

      const query = new MongoDBQueryBuilder('users', connection);
      query.where('age', '>', 25);

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('John');
    });

    it('should support >= operator', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.where('age', '>=', 30);

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
    });

    it('should convert id to _id', async () => {
      const insertResult = await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John' },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.where('id', '=', insertResult.insertId);

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
    });
  });

  describe('whereIn', () => {
    it('should build WHERE IN condition', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', status: 'active' },
      }]);
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', status: 'inactive' },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.whereIn('status', ['active']);

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('active');
    });
  });

  describe('whereNotIn', () => {
    it('should build WHERE NOT IN condition', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', status: 'active' },
      }]);
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', status: 'inactive' },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.whereNotIn('status', ['inactive']);

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('active');
    });
  });

  describe('whereNull and whereNotNull', () => {
    it('should build WHERE NULL condition', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', email: null },
      }]);
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', email: 'jane@example.com' },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.whereNull('email');

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('John');
    });

    it('should build WHERE NOT NULL condition', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', email: null },
      }]);
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'Jane', email: 'jane@example.com' },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.whereNotNull('email');

      const result = await query.execute();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('Jane');
    });
  });

  describe('orderBy', () => {
    it('should sort results ASC', async () => {
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

      const query = new MongoDBQueryBuilder('users', connection);
      query.orderBy('age', 'ASC');

      const result = await query.execute();
      expect(result.rows[0].age).toBe(25);
      expect(result.rows[1].age).toBe(30);
    });

    it('should sort results DESC', async () => {
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

      const query = new MongoDBQueryBuilder('users', connection);
      query.orderBy('age', 'DESC');

      const result = await query.execute();
      expect(result.rows[0].age).toBe(30);
      expect(result.rows[1].age).toBe(25);
    });
  });

  describe('limit and offset', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await mockAdapter.query('', [{
          operation: 'insert',
          collection: 'users',
          document: { name: `User${i}` },
        }]);
      }
    });

    it('should limit results', async () => {
      const query = new MongoDBQueryBuilder('users', connection);
      query.limit(2);

      const result = await query.execute();
      expect(result.rows.length).toBe(2);
    });

    it('should skip results', async () => {
      const query = new MongoDBQueryBuilder('users', connection);
      query.offset(2);

      const result = await query.execute();
      expect(result.rows.length).toBe(3);
    });

    it('should combine limit and offset', async () => {
      const query = new MongoDBQueryBuilder('users', connection);
      query.limit(2).offset(1);

      const result = await query.execute();
      // After offset 1, we have 4 remaining, limit 2 gives us 2
      expect(result.rows.length).toBe(2);
    });
  });

  describe('insert', () => {
    it('should insert a document', async () => {
      const query = new MongoDBQueryBuilder('users', connection);
      query.insert({ name: 'John', email: 'john@example.com' });

      const result = await query.execute();
      expect(result.insertId).toBeDefined();
      expect(result.rowCount).toBe(1);
    });
  });

  describe('update', () => {
    it('should update documents', async () => {
      const insertResult = await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John', age: 30 },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.update({ age: 31 });
      query.where('_id', '=', insertResult.insertId);

      const result = await query.execute();
      expect(result.rowCount).toBe(1);

      const findResult = await mockAdapter.query('', [{
        operation: 'findOne',
        collection: 'users',
        filter: { _id: insertResult.insertId },
      }]);

      expect(findResult.rows[0].age).toBe(31);
    });
  });

  describe('delete', () => {
    it('should delete documents', async () => {
      await mockAdapter.query('', [{
        operation: 'insert',
        collection: 'users',
        document: { name: 'John' },
      }]);

      const query = new MongoDBQueryBuilder('users', connection);
      query.delete();
      query.where('name', '=', 'John');

      const result = await query.execute();
      expect(result.rowCount).toBe(1);

      const findResult = await mockAdapter.query('', [{
        operation: 'find',
        collection: 'users',
      }]);

      expect(findResult.rows.length).toBe(0);
    });
  });
});

