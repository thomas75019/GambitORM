import { HasOne } from '../../src/relationships/HasOne';
import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('HasOne', () => {
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

  it('should load related model', async () => {
    const user = new User();
    user.id = 1;
    user.name = 'John';

    mockAdapter.setQueryResult({
      rows: [{ id: 1, user_id: 1, bio: 'Developer' }],
    });

    const relationship = new HasOne(user, Profile, 'user_id');
    const profile = await relationship.load();

    expect(profile).toBeInstanceOf(Profile);
    expect(profile?.user_id).toBe(1);
  });

  it('should return null when no related model found', async () => {
    const user = new User();
    user.id = 1;

    mockAdapter.setQueryResult({ rows: [] });

    const relationship = new HasOne(user, Profile, 'user_id');
    const profile = await relationship.load();

    expect(profile).toBeNull();
  });

  it('should return null when owner has no id', async () => {
    const user = new User();

    const relationship = new HasOne(user, Profile, 'user_id');
    const profile = await relationship.load();

    expect(profile).toBeNull();
  });

  it('should use custom foreign key', async () => {
    const user = new User();
    user.id = 1;

    mockAdapter.setQueryResult({
      rows: [{ id: 1, owner_id: 1, bio: 'Developer' }],
    });

    const relationship = new HasOne(user, Profile, 'owner_id');
    const profile = await relationship.load();

    expect(profile).toBeInstanceOf(Profile);
  });
});

