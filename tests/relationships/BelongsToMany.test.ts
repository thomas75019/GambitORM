import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { BelongsToMany } from '../../src/relationships/BelongsToMany';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('BelongsToMany', () => {
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

  class Role extends Model {
    static tableName = 'roles';
    id!: number;
    name!: string;
  }

  describe('load()', () => {
    it('should load related models through pivot table', async () => {
      const user = new User();
      user.id = 1;

      // Mock joined query result (SQL uses JOIN)
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'Admin' },
          { id: 2, name: 'User' },
        ],
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const roles = await relationship.load();

      expect(roles.length).toBe(2);
      expect(roles[0].name).toBe('Admin');
      expect(roles[1].name).toBe('User');
    });

    it('should return empty array if owner has no id', async () => {
      const user = new User();
      // user.id is undefined

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
      });

      const roles = await relationship.load();
      expect(roles.length).toBe(0);
    });

    it('should attach pivot data when withPivot is specified', async () => {
      const user = new User();
      user.id = 1;

      // Mock joined query result with pivot data (SQL uses JOIN with pivot fields)
      // The query returns rows with pivot_ prefix for pivot fields
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: 'Admin', pivot_assigned_at: '2024-01-01', pivot_assigned_by: 5 },
        ],
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
        withPivot: ['assigned_at', 'assigned_by'],
      });

      const roles = await relationship.load();

      expect(roles.length).toBe(1);
      expect((roles[0] as any).pivot_assigned_at).toBe('2024-01-01');
      expect((roles[0] as any).pivot_assigned_by).toBe(5);
    });
  });

  describe('attach()', () => {
    it('should attach a related model to pivot table', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 1,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      await relationship.attach(2);

      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('INSERT INTO');
      expect(lastCall[0]).toContain('user_roles');
    });

    it('should attach with pivot data', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 1,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      await relationship.attach(2, { assigned_at: new Date(), assigned_by: 5 });

      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('assigned_at');
    });

    it('should throw error if owner has no id', async () => {
      const user = new User();
      // user.id is undefined

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
      });

      await expect(relationship.attach(2)).rejects.toThrow('Cannot attach: owner model has no id');
    });
  });

  describe('attachMany()', () => {
    it('should attach multiple related models', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 2,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      await relationship.attachMany([2, 3]);

      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('INSERT INTO');
      expect(lastCall[0]).toContain('user_roles');
    });
  });

  describe('detach()', () => {
    it('should detach a specific related model', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const deleted = await relationship.detach(2);

      expect(deleted).toBe(1);
      const calls = mockConnection.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('DELETE FROM');
      expect(lastCall[0]).toContain('user_roles');
    });

    it('should detach all related models if no id specified', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 3,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const deleted = await relationship.detach();

      expect(deleted).toBe(3);
    });
  });

  describe('sync()', () => {
    it('should sync related models (detach all and attach specified)', async () => {
      const user = new User();
      user.id = 1;

      // First call: detach
      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 2,
      });

      // Second call: attach
      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 2,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      await relationship.sync([2, 3]);

      const calls = mockConnection.query.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[calls.length - 2][0]).toContain('DELETE');
      expect(calls[calls.length - 1][0]).toContain('INSERT');
    });

    it('should sync without detaching if detaching is false', async () => {
      const user = new User();
      user.id = 1;

      // Only attach call
      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 2,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      await relationship.sync([2, 3], false);

      const calls = mockConnection.query.mock.calls;
      expect(calls[calls.length - 1][0]).toContain('INSERT');
      expect(calls[calls.length - 1][0]).not.toContain('DELETE');
    });
  });

  describe('toggle()', () => {
    it('should attach if not attached', async () => {
      const user = new User();
      user.id = 1;

      // First call: check if exists (returns empty)
      mockAdapter.setQueryResult({
        rows: [],
      });

      // Second call: attach
      mockAdapter.setQueryResult({
        rows: [],
        insertId: 1,
        rowCount: 1,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const attached = await relationship.toggle(2);

      expect(attached).toBe(true);
    });

    it('should detach if already attached', async () => {
      const user = new User();
      user.id = 1;

      // First call: check if exists (returns found)
      mockAdapter.setQueryResult({
        rows: [{ user_id: 1, role_id: 2 }],
      });

      // Second call: detach
      mockAdapter.setQueryResult({
        rows: [],
        rowCount: 1,
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const attached = await relationship.toggle(2);

      expect(attached).toBe(false);
    });
  });

  describe('has()', () => {
    it('should return true if related model is attached', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [{ user_id: 1, role_id: 2 }],
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const has = await relationship.has(2);

      expect(has).toBe(true);
    });

    it('should return false if related model is not attached', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [],
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const has = await relationship.has(2);

      expect(has).toBe(false);
    });
  });

  describe('count()', () => {
    it('should count related models', async () => {
      const user = new User();
      user.id = 1;

      mockAdapter.setQueryResult({
        rows: [{ count: '3' }],
      });

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
        foreignKey: 'user_id',
        relatedKey: 'role_id',
      });

      const count = await relationship.count();

      expect(count).toBe(3);
    });

    it('should return 0 if owner has no id', async () => {
      const user = new User();
      // user.id is undefined

      const relationship = new BelongsToMany(user, Role, {
        pivotTable: 'user_roles',
      });

      const count = await relationship.count();
      expect(count).toBe(0);
    });
  });
});

