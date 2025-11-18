import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model Quick Wins', () => {
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
    views!: number;
    updated_at?: Date;
  }

  describe('count()', () => {
    it('should count all records', async () => {
      mockAdapter.setQueryResult({
        rows: [{ count: '5' }],
      });

      const count = await User.count();
      expect(count).toBe(5);
    });

    it('should count records with conditions', async () => {
      mockAdapter.setQueryResult({
        rows: [{ count: '2' }],
      });

      const count = await User.count({ status: 'active' });
      expect(count).toBe(2);
    });
  });

  describe('exists()', () => {
    it('should return true if records exist', async () => {
      mockAdapter.setQueryResult({
        rows: [{ count: '1' }],
      });

      const exists = await User.exists({ email: 'test@example.com' });
      expect(exists).toBe(true);
    });

    it('should return false if no records exist', async () => {
      mockAdapter.setQueryResult({
        rows: [{ count: '0' }],
      });

      const exists = await User.exists({ email: 'test@example.com' });
      expect(exists).toBe(false);
    });
  });

  describe('pluck()', () => {
    it('should pluck a single column', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { name: 'John' },
          { name: 'Jane' },
          { name: 'Bob' },
        ],
      });

      const names = await User.pluck('name');
      expect(names).toEqual(['John', 'Jane', 'Bob']);
    });

    it('should pluck with conditions', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { name: 'John' },
        ],
      });

      const names = await User.pluck('name', { where: { status: 'active' } });
      expect(names).toEqual(['John']);
    });

    it('should pluck with limit', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { name: 'John' },
        ],
      });

      const names = await User.pluck('name', { limit: 1 });
      expect(names).toEqual(['John']);
    });
  });

  describe('first()', () => {
    it('should return first record', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', email: 'john@example.com' },
        ],
      });

      const user = await User.first();
      expect(user).not.toBeNull();
      expect(user?.name).toBe('John');
    });

    it('should return null if no records', async () => {
      mockAdapter.setQueryResult({
        rows: [],
      });

      const user = await User.first();
      expect(user).toBeNull();
    });
  });

  describe('last()', () => {
    it('should return last record', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 3, name: 'Bob', email: 'bob@example.com' },
        ],
      });

      const user = await User.last();
      expect(user).not.toBeNull();
      expect(user?.name).toBe('Bob');
    });
  });

  describe('increment()', () => {
    it('should increment a column value', async () => {
      const user = new User();
      user.id = 1;
      user.views = 10;
      (user as any).originalAttributes = { id: 1, views: 10 };

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      await user.increment('views', 5);
      expect(user.views).toBe(15);
    });

    it('should increment by default amount of 1', async () => {
      const user = new User();
      user.id = 1;
      user.views = 10;
      (user as any).originalAttributes = { id: 1, views: 10 };

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      await user.increment('views');
      expect(user.views).toBe(11);
    });
  });

  describe('decrement()', () => {
    it('should decrement a column value', async () => {
      const user = new User();
      user.id = 1;
      user.views = 10;
      (user as any).originalAttributes = { id: 1, views: 10 };

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      await user.decrement('views', 3);
      expect(user.views).toBe(7);
    });
  });

  describe('touch()', () => {
    it('should update updated_at timestamp', async () => {
      const user = new User();
      user.id = 1;
      (user as any).originalAttributes = { id: 1 };

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      await user.touch();
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should update custom timestamp column', async () => {
      const user = new User();
      user.id = 1;
      (user as any).originalAttributes = { id: 1 };

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      await user.touch('modified_at');
      expect((user as any).modified_at).toBeInstanceOf(Date);
    });
  });

  describe('fresh()', () => {
    it('should reload model from database', async () => {
      const user = new User();
      user.id = 1;
      user.name = 'Old Name';
      (user as any).originalAttributes = { id: 1, name: 'Old Name' };

      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'New Name', email: 'new@example.com' },
        ],
      });

      await user.fresh();
      expect(user.name).toBe('New Name');
      expect(user.email).toBe('new@example.com');
    });

    it('should throw error if model no longer exists', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [],
      });

      await expect(user.fresh()).rejects.toThrow('Model instance no longer exists');
    });
  });

  describe('isDirty()', () => {
    it('should return true if model is modified', () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';
      (user as any).originalAttributes = { id: 1, name: 'Jane' };

      expect(user.isDirty()).toBe(true);
      expect(user.isDirty('name')).toBe(true);
    });

    it('should return false if model is not modified', () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';
      (user as any).originalAttributes = { id: 1, name: 'John' };

      expect(user.isDirty()).toBe(false);
      expect(user.isDirty('name')).toBe(false);
    });
  });

  describe('isClean()', () => {
    it('should return true if model is not modified', () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';
      (user as any).originalAttributes = { id: 1, name: 'John' };

      expect(user.isClean()).toBe(true);
      expect(user.isClean('name')).toBe(true);
    });

    it('should return false if model is modified', () => {
      const user = new User();
      user.id = 1;
      user.name = 'John';
      (user as any).originalAttributes = { id: 1, name: 'Jane' };

      expect(user.isClean()).toBe(false);
      expect(user.isClean('name')).toBe(false);
    });
  });
});

