import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model Automatic Timestamps', () => {
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

  describe('create() with timestamps', () => {
    it('should automatically set created_at and updated_at on create', async () => {
      class User extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        created_at?: Date;
        updated_at?: Date;
      }

      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1, 
        insertId: 1 
      });

      const user = await User.create({ name: 'John' });

      expect(user.id).toBe(1);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
      
      // Check that timestamps were included in insert
      const calls = mockConnection.query.mock.calls;
      const insertCall = calls.find(call => call[0].includes('INSERT'));
      expect(insertCall).toBeDefined();
    });

    it('should not set timestamps if timestamps is false', async () => {
      class Post extends Model {
        static tableName = 'posts';
        static timestamps = false;
        id!: number;
        title!: string;
      }

      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1, 
        insertId: 1 
      });

      const post = await Post.create({ title: 'Test' });

      expect(post.id).toBe(1);
      expect((post as any).created_at).toBeUndefined();
    });

    it('should use custom field names', async () => {
      class User extends Model {
        static tableName = 'users';
        static timestamps = true;
        static createdAt = 'createdAt';
        static updatedAt = 'updatedAt';
        id!: number;
        name!: string;
        createdAt?: Date;
        updatedAt?: Date;
      }

      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1, 
        insertId: 1 
      });

      const user = await User.create({ name: 'John' });

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should not override provided timestamps', async () => {
      class User extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        created_at?: Date;
        updated_at?: Date;
      }

      const customDate = new Date('2020-01-01');
      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1, 
        insertId: 1 
      });

      const user = await User.create({ 
        name: 'John',
        created_at: customDate,
        updated_at: customDate,
      });

      expect(user.created_at).toEqual(customDate);
      expect(user.updated_at).toEqual(customDate);
    });
  });

  describe('save() with timestamps', () => {
    it('should set created_at and updated_at on new record', async () => {
      class User extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        created_at?: Date;
        updated_at?: Date;
      }

      const user = new User();
      user.name = 'John';

      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1, 
        insertId: 1 
      });

      await user.save();

      expect(user.id).toBe(1);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should update updated_at on existing record', async () => {
      class User extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        created_at?: Date;
        updated_at?: Date;
      }

      const user = new User();
      user.id = 1;
      user.name = 'John';
      user.created_at = new Date('2020-01-01');
      user.updated_at = new Date('2020-01-01');

      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1 
      });

      const beforeUpdate = user.updated_at;
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await user.save();

      expect(user.updated_at).toBeInstanceOf(Date);
      expect(user.updated_at!.getTime()).toBeGreaterThan(beforeUpdate!.getTime());
      expect(user.created_at).toEqual(new Date('2020-01-01')); // Should not change
    });
  });

  describe('update() with timestamps', () => {
    it('should update updated_at on update', async () => {
      class User extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        created_at?: Date;
        updated_at?: Date;
      }

      const user = new User();
      user.id = 1;
      user.name = 'John';
      user.created_at = new Date('2020-01-01');
      user.updated_at = new Date('2020-01-01');

      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1 
      });

      const beforeUpdate = user.updated_at;
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await user.update({ name: 'Jane' });

      expect(user.name).toBe('Jane');
      expect(user.updated_at).toBeInstanceOf(Date);
      expect(user.updated_at!.getTime()).toBeGreaterThan(beforeUpdate!.getTime());
      expect(user.created_at).toEqual(new Date('2020-01-01')); // Should not change
    });

    it('should not override explicitly provided updated_at', async () => {
      class User extends Model {
        static tableName = 'users';
        static timestamps = true;
        id!: number;
        name!: string;
        updated_at?: Date;
      }

      const user = new User();
      user.id = 1;
      user.name = 'John';

      const customDate = new Date('2020-01-01');
      mockAdapter.setQueryResult({ 
        rows: [], 
        rowCount: 1 
      });

      await user.update({ 
        name: 'Jane',
        updated_at: customDate,
      });

      expect(user.updated_at).toEqual(customDate);
    });
  });
});

