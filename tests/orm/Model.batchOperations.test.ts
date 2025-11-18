import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model Batch Operations', () => {
  let mockConnection: jest.Mocked<Connection>;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAdapter = new MockAdapter();
    mockConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      query: jest.fn().mockImplementation((sql, params) => mockAdapter.query(sql, params)),
      getAdapter: jest.fn(),
      getDialect: jest.fn().mockReturnValue('mysql'),
    } as any;

    (Connection as jest.Mock).mockImplementation(() => mockConnection);
    Model.setConnection(mockConnection);
  });

  class User extends Model {
    static tableName = 'users';
    id!: number;
    name!: string;
    email!: string;
    status!: string;
  }

  describe('bulkInsert()', () => {
    it('should insert multiple records', async () => {
      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 2,
      });

      const records = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ];

      const users = await User.bulkInsert(records);

      expect(users.length).toBe(2);
      expect(users[0].name).toBe('John');
      expect(users[1].name).toBe('Jane');
    });

    it('should return empty array for empty input', async () => {
      const users = await User.bulkInsert([]);
      expect(users.length).toBe(0);
    });

    it('should handle automatic timestamps', async () => {
      class TimestampedUser extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        created_at?: Date;
        updated_at?: Date;
      }

      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 1,
      });

      const users = await TimestampedUser.bulkInsert([
        { name: 'John' },
      ]);

      expect(users.length).toBe(1);
      // Check that timestamps were added to the query
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('created_at');
      expect(lastCall[0]).toContain('updated_at');
    });
  });

  describe('bulkUpdate()', () => {
    it('should update multiple records matching conditions', async () => {
      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 3,
      });

      const updated = await User.bulkUpdate(
        { status: 'inactive' },
        { lastLogin: new Date() }
      );

      expect(updated).toBe(3);
    });

    it('should return 0 if no records match', async () => {
      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 0,
      });

      const updated = await User.bulkUpdate(
        { status: 'nonexistent' },
        { lastLogin: new Date() }
      );

      expect(updated).toBe(0);
    });

    it('should handle automatic timestamps', async () => {
      class TimestampedUser extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        updated_at?: Date;
      }

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 2,
      });

      await TimestampedUser.bulkUpdate(
        { status: 'active' },
        { name: 'Updated' }
      );

      // Check that updated_at was added
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('updated_at');
    });
  });

  describe('bulkDelete()', () => {
    it('should delete multiple records matching conditions', async () => {
      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 5,
      });

      const deleted = await User.bulkDelete({ status: 'inactive' });

      expect(deleted).toBe(5);
    });

    it('should return 0 if no records match', async () => {
      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 0,
      });

      const deleted = await User.bulkDelete({ status: 'nonexistent' });

      expect(deleted).toBe(0);
    });

    it('should perform soft delete if enabled', async () => {
      class SoftDeleteUser extends Model {
        static tableName = 'users';
        static softDeletes = true;
        id!: number;
        name!: string;
        deleted_at?: Date;
      }

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 3,
      });

      const deleted = await SoftDeleteUser.bulkDelete({ status: 'inactive' });

      expect(deleted).toBe(3);
      
      // Check that it updated deleted_at instead of deleting
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('UPDATE');
      expect(lastCall[0]).toContain('deleted_at');
    });
  });

  describe('bulkUpsert()', () => {
    it('should insert new records', async () => {
      // First call: findOne returns null (not found)
      mockAdapter.setQueryResult({
        rows: [],
      });

      // Second call: create returns new record
      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
      });

      const records = [
        { name: 'John', email: 'john@example.com' },
      ];

      const users = await User.bulkUpsert(records);

      expect(users.length).toBe(1);
      expect(users[0].name).toBe('John');
    });

    it('should update existing records', async () => {
      // First call: findOne returns existing record
      mockAdapter.setQueryResult({
        rows: [{ id: 1, name: 'John', email: 'john@example.com' }],
      });

      // Second call: update returns success
      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      const records = [
        { id: 1, name: 'John Updated', email: 'john@example.com' },
      ];

      const users = await User.bulkUpsert(records, ['id']);

      expect(users.length).toBe(1);
    });

    it('should handle multiple records with mix of insert and update', async () => {
      // Mock sequence: findOne (null), create, findOne (found), update
      let callCount = 0;
      mockConnection.query = jest.fn().mockImplementation((sql, params) => {
        callCount++;
        if (callCount === 1) {
          // findOne for first record - not found
          return Promise.resolve({ rows: [] });
        } else if (callCount === 2) {
          // create first record
          return Promise.resolve({ rows: [], insertId: 1 });
        } else if (callCount === 3) {
          // findOne for second - found
          return Promise.resolve({ rows: [{ id: 2, name: 'Jane', email: 'jane@example.com' }] });
        } else {
          // update second record
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
      });

      const records = [
        { name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane Updated', email: 'jane@example.com' },
      ];

      const users = await User.bulkUpsert(records, ['id']);

      expect(users.length).toBe(2);
    });
  });
});

