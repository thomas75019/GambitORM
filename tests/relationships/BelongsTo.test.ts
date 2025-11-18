import { BelongsTo } from '../../src/relationships/BelongsTo';
import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('BelongsTo', () => {
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

  it('should load related model', async () => {
    const post = new Post();
    post.id = 1;
    post.user_id = 5;
    post.title = 'My Post';

    mockAdapter.setQueryResult({
      rows: [{ id: 5, name: 'John' }],
    });

    const relationship = new BelongsTo(post, User, 'user_id');
    const user = await relationship.load();

    expect(user).toBeInstanceOf(User);
    expect(user?.id).toBe(5);
    expect(user?.name).toBe('John');
  });

  it('should return null when no related model found', async () => {
    const post = new Post();
    post.id = 1;
    post.user_id = 999;

    mockAdapter.setQueryResult({ rows: [] });

    const relationship = new BelongsTo(post, User, 'user_id');
    const user = await relationship.load();

    expect(user).toBeNull();
  });

  it('should return null when owner has no foreign key', async () => {
    const post = new Post();
    post.id = 1;

    const relationship = new BelongsTo(post, User, 'user_id');
    const user = await relationship.load();

    expect(user).toBeNull();
  });
});

