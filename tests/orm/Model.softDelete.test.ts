import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model Soft Deletes', () => {
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
    static softDeletes = true;
    static deletedAt = 'deleted_at';
    id!: number;
    name!: string;
    email!: string;
    deleted_at?: Date | null;
  }

  describe('delete() with soft deletes', () => {
    it('should set deleted_at instead of deleting', async () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';
      user.email = 'john@example.com';

      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const result = await user.delete();

      expect(result).toBe(true);
      expect(mockConnection.query).toHaveBeenCalled();
      
      // Check that it was an UPDATE query, not DELETE
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('UPDATE');
      expect(user.deleted_at).toBeDefined();
    });

    it('should not delete if soft deletes are disabled', async () => {
      class Post extends Model {
        static tableName = 'posts';
        static softDeletes = false;
        id!: number;
        title!: string;
      }

      const post = new Post();
      post.id = 1;
      post.title = 'Test';

      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      await post.delete();

      // Should be a DELETE query
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('DELETE');
    });
  });

  describe('forceDelete()', () => {
    it('should permanently delete even with soft deletes enabled', async () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';

      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const result = await user.forceDelete();

      expect(result).toBe(true);
      
      // Should be a DELETE query
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('DELETE');
      expect(user.id).toBeUndefined();
    });
  });

  describe('restore()', () => {
    it('should restore a soft-deleted record', async () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';
      user.deleted_at = new Date();

      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const result = await user.restore();

      expect(result).toBe(true);
      
      // Should be an UPDATE query setting deleted_at to null
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('UPDATE');
      expect(user.deleted_at).toBeNull();
    });

    it('should return false if record is not soft-deleted', async () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';
      user.deleted_at = null;

      const result = await user.restore();

      expect(result).toBe(false);
    });

    it('should throw error if soft deletes are not enabled', async () => {
      class Post extends Model {
        static tableName = 'posts';
        static softDeletes = false;
        id!: number;
      }

      const post = new Post();
      post.id = 1;

      await expect(post.restore()).rejects.toThrow('Cannot restore a model that does not use soft deletes');
    });
  });

  describe('findAll() with soft deletes', () => {
    it('should exclude soft-deleted records by default', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', email: 'john@example.com', deleted_at: null },
          { id: 2, name: 'Jane', email: 'jane@example.com', deleted_at: null },
        ],
      });

      const users = await User.findAll();

      expect(users.length).toBe(2);
      
      // Check that WHERE deleted_at IS NULL was added
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('deleted_at');
    });

    it('should include soft-deleted records with withTrashed()', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', deleted_at: null },
          { id: 2, name: 'Jane', deleted_at: new Date() },
        ],
      });

      const users = await User.withTrashed().findAll();

      expect(users.length).toBe(2);
    });

    it('should only return soft-deleted records with onlyTrashed()', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 2, name: 'Jane', deleted_at: new Date() },
        ],
      });

      const users = await User.onlyTrashed().findAll();

      expect(users.length).toBe(1);
      expect(users[0].name).toBe('Jane');
    });
  });

  describe('findById() with soft deletes', () => {
    it('should not find soft-deleted records by default', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const user = await User.findById(1);

      expect(user).toBeNull();
    });

    it('should find soft-deleted records with withTrashed()', async () => {
      mockAdapter.setQueryResult({
        rows: [{ id: 1, name: 'John', deleted_at: new Date() }],
      });

      const user = await User.withTrashed().findById(1);

      expect(user).not.toBeNull();
      expect(user?.name).toBe('John');
    });
  });

  describe('findOne() with soft deletes', () => {
    it('should not find soft-deleted records by default', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const user = await User.findOne({ email: 'john@example.com' });

      expect(user).toBeNull();
    });

    it('should find soft-deleted records with withTrashed()', async () => {
      mockAdapter.setQueryResult({
        rows: [{ id: 1, name: 'John', email: 'john@example.com', deleted_at: new Date() }],
      });

      const user = await User.withTrashed().findOne({ email: 'john@example.com' });

      expect(user).not.toBeNull();
    });
  });
});

