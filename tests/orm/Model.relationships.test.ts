import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model - Relationships', () => {
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
  }

  class Profile extends Model {
    static tableName = 'profiles';
    id!: number;
    user_id!: number;
    bio!: string;
  }

  class Post extends Model {
    static tableName = 'posts';
    id!: number;
    user_id!: number;
    title!: string;
  }

  describe('hasOne', () => {
    it('should create HasOne relationship instance', () => {
      const user = new User();
      user.id = 1;

      const relationship = user.hasOne(Profile, 'user_id');
      expect(relationship).toBeDefined();
    });

    it('should work as static method', () => {
      const relationship = User.hasOne(Profile, 'user_id');
      expect(relationship).toBeDefined();
    });
  });

  describe('hasMany', () => {
    it('should create HasMany relationship instance', () => {
      const user = new User();
      user.id = 1;

      const relationship = user.hasMany(Post, 'user_id');
      expect(relationship).toBeDefined();
    });

    it('should work as static method', () => {
      const relationship = User.hasMany(Post, 'user_id');
      expect(relationship).toBeDefined();
    });
  });

  describe('belongsTo', () => {
    it('should create BelongsTo relationship instance', () => {
      const post = new Post();
      post.id = 1;
      post.user_id = 5;

      const relationship = post.belongsTo(User, 'user_id');
      expect(relationship).toBeDefined();
    });

    it('should work as static method', () => {
      const relationship = Post.belongsTo(User, 'user_id');
      expect(relationship).toBeDefined();
    });
  });

  describe('eager loading', () => {
    it('should accept include option without error', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const users = await User.findAll({ include: ['profile'] });
      expect(Array.isArray(users)).toBe(true);
    });

    it('should work with findById and include', async () => {
      mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'John' }] });

      const user = await User.findById(1, { include: ['profile'] });
      expect(user).toBeDefined();
    });

    it('should work with findOne and include', async () => {
      mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'John' }] });

      const user = await User.findOne({ name: 'John' }, { include: ['profile'] });
      expect(user).toBeDefined();
    });
  });
});

