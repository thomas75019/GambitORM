import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model Scopes', () => {
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
    status!: string;
    age!: number;
  }

  describe('Local Scopes', () => {
    beforeEach(() => {
      // Define local scopes
      User.scope('active', (query) => {
        query.where('status', '=', 'active');
      });

      User.scope('verified', (query) => {
        query.where('verified', '=', true);
      });

      User.scope('adults', (query) => {
        query.where('age', '>=', 18);
      });

      User.scope('byName', (query, name: string) => {
        query.where('name', '=', name);
      });
    });

    it('should apply local scope using query builder', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', status: 'active' },
        ],
      });

      const users = await User.query()
        .scope('active')
        .get();

      expect(users.length).toBe(1);
      expect(users[0].status).toBe('active');
    });

    it('should chain multiple scopes', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', status: 'active', verified: true },
        ],
      });

      const users = await User.query()
        .scope('active')
        .scope('verified')
        .get();

      expect(users.length).toBe(1);
    });

    it('should apply scope with arguments', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', status: 'active' },
        ],
      });

      const users = await User.query()
        .scope('byName', 'John')
        .get();

      expect(users.length).toBe(1);
      expect(users[0].name).toBe('John');
    });

    it('should combine scopes with other query methods', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', status: 'active', age: 25 },
        ],
      });

      const users = await User.query()
        .scope('active')
        .scope('adults')
        .orderBy('name', 'ASC')
        .limit(10)
        .get();

      expect(users.length).toBe(1);
    });

    it('should throw error for undefined scope', async () => {
      expect(() => {
        User.query().scope('nonexistent');
      }).toThrow('Scope "nonexistent" is not defined');
    });
  });

  describe('Global Scopes', () => {
    it('should apply global scope to findAll', async () => {
      User.addGlobalScope('published', (query) => {
        query.where('published', '=', true);
      });

      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', published: true },
        ],
      });

      const users = await User.findAll();

      // Check that global scope was applied
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('published');
    });

    it('should apply global scope to findById', async () => {
      User.addGlobalScope('published', (query) => {
        query.where('published', '=', true);
      });

      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', published: true },
        ],
      });

      const user = await User.findById(1);

      expect(user).not.toBeNull();
    });

    it('should apply global scope to findOne', async () => {
      User.addGlobalScope('published', (query) => {
        query.where('published', '=', true);
      });

      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', published: true },
        ],
      });

      const user = await User.findOne({ name: 'John' });

      expect(user).not.toBeNull();
    });

    it('should apply global scope to query builder', async () => {
      User.addGlobalScope('published', (query) => {
        query.where('published', '=', true);
      });

      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', published: true },
        ],
      });

      const users = await User.query()
        .scope('active')
        .get();

      expect(users.length).toBe(1);
    });

    it('should apply multiple global scopes', async () => {
      User.addGlobalScope('published', (query) => {
        query.where('published', '=', true);
      });

      User.addGlobalScope('notDeleted', (query) => {
        query.whereNull('deleted_at');
      });

      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', published: true, deleted_at: null },
        ],
      });

      const users = await User.findAll();

      expect(users.length).toBe(1);
    });
  });

  describe('Scope Query Builder Methods', () => {
    beforeEach(() => {
      User.scope('active', (query) => {
        query.where('status', '=', 'active');
      });
    });

    it('should support get() method', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', status: 'active' },
          { id: 2, name: 'Jane', status: 'active' },
        ],
      });

      const users = await User.query()
        .scope('active')
        .get();

      expect(users.length).toBe(2);
      expect(users[0]).toBeInstanceOf(User);
    });

    it('should support first() method', async () => {
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'John', status: 'active' },
        ],
      });

      const user = await User.query()
        .scope('active')
        .first();

      expect(user).not.toBeNull();
      expect(user?.name).toBe('John');
    });

    it('should support count() method', async () => {
      mockAdapter.setQueryResult({
        rows: [{ count: 5 }],
        rowCount: 5,
      });

      const count = await User.query()
        .scope('active')
        .count();

      expect(count).toBe(5);
    });
  });
});

