import { HasMany } from '../../src/relationships/HasMany';
import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('HasMany', () => {
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

  class Post extends Model {
    static tableName = 'posts';
    id!: number;
    user_id!: number;
    title!: string;
  }

  it('should load related models', async () => {
    const user = new User();
    user.id = 1;
    user.name = 'John';

    mockAdapter.setQueryResult({
      rows: [
        { id: 1, user_id: 1, title: 'Post 1' },
        { id: 2, user_id: 1, title: 'Post 2' },
      ],
    });

    const relationship = new HasMany(user, Post, 'user_id');
    const posts = await relationship.load();

    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBe(2);
    expect(posts[0]).toBeInstanceOf(Post);
  });

  it('should return empty array when no related models found', async () => {
    const user = new User();
    user.id = 1;

    mockAdapter.setQueryResult({ rows: [] });

    const relationship = new HasMany(user, Post, 'user_id');
    const posts = await relationship.load();

    expect(posts).toEqual([]);
  });

  it('should return empty array when owner has no id', async () => {
    const user = new User();

    const relationship = new HasMany(user, Post, 'user_id');
    const posts = await relationship.load();

    expect(posts).toEqual([]);
  });
});

