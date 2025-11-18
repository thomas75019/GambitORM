import { Model } from '../../src/orm/Model';
import { ModelAttributes } from '../../src/types';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model', () => {
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
  }

  describe('findAll', () => {
    it('should return an array of model instances', async () => {
      mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'John', email: 'john@example.com' }] });

      const result = await User.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toBeInstanceOf(User);
      expect(result[0].name).toBe('John');
    });

    it('should accept QueryOptions', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const result = await User.findAll({ limit: 10 });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return model instance when found', async () => {
      mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'John', email: 'john@example.com' }] });

      const result = await User.findById(1);

      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('John');
    });

    it('should return null when not found', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const result = await User.findById(1);

      expect(result).toBeNull();
    });

    it('should accept string ID', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const result = await User.findById('123');

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return model instance when found', async () => {
      mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'John', email: 'test@example.com' }] });

      const result = await User.findOne({ email: 'test@example.com' });

      expect(result).toBeInstanceOf(User);
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when not found', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const result = await User.findOne({ email: 'test@example.com' });

      expect(result).toBeNull();
    });

    it('should accept conditions object', async () => {
      mockAdapter.setQueryResult({ rows: [] });

      const conditions = { name: 'John', active: true };
      const result = await User.findOne(conditions);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should return a new model instance', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const attributes: ModelAttributes = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await User.create(attributes);

      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
    });
  });

  describe('save', () => {
    it('should insert new record when id is not set', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const user = new User();
      user.name = 'John';
      user.email = 'john@example.com';

      const result = await user.save();

      expect(result).toBe(user);
      expect(user.id).toBe(1);
    });

    it('should update existing record when id is set', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const user = new User();
      user.id = 1;
      user.name = 'John';
      user.email = 'john@example.com';

      const result = await user.save();

      expect(result).toBe(user);
    });
  });

  describe('update', () => {
    it('should update the instance attributes', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const user = new User();
      user.id = 1;
      user.name = 'John';

      const result = await user.update({ name: 'Jane' });

      expect(result).toBe(user);
      expect(user.name).toBe('Jane');
    });

    it('should throw error when id is not set', async () => {
      const user = new User();
      user.name = 'John';

      await expect(user.update({ name: 'Jane' })).rejects.toThrow('Cannot update a model instance without an id');
    });
  });

  describe('delete', () => {
    it('should return true when deletion succeeds', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const user = new User();
      user.id = 1;

      const result = await user.delete();

      expect(result).toBe(true);
      expect(user.id).toBeUndefined();
    });

    it('should return false when deletion fails', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const user = new User();
      user.id = 1;

      const result = await user.delete();

      expect(result).toBe(false);
    });

    it('should throw error when id is not set', async () => {
      const user = new User();

      await expect(user.delete()).rejects.toThrow('Cannot delete a model instance without an id');
    });
  });

  describe('tableName', () => {
    it('should have a static tableName property', () => {
      expect(User.tableName).toBe('users');
    });
  });
});

