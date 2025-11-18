import { Model } from '../../src/orm/Model';
import { HookEvent } from '../../src/hooks';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model - Hooks', () => {
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

  describe('save hooks', () => {
    it('should execute beforeSave and afterSave hooks on save', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const beforeSaveHook = jest.fn();
      const afterSaveHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_SAVE, beforeSaveHook);
      User.hook(HookEvent.AFTER_SAVE, afterSaveHook);

      const user = new User();
      user.name = 'John';
      user.email = 'john@example.com';

      await user.save();

      expect(beforeSaveHook).toHaveBeenCalledWith(user);
      expect(afterSaveHook).toHaveBeenCalledWith(user);
    });

    it('should execute beforeCreate and afterCreate hooks for new records', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const beforeCreateHook = jest.fn();
      const afterCreateHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_CREATE, beforeCreateHook);
      User.hook(HookEvent.AFTER_CREATE, afterCreateHook);

      const user = new User();
      user.name = 'John';
      user.email = 'john@example.com';

      await user.save();

      expect(beforeCreateHook).toHaveBeenCalledWith(user);
      expect(afterCreateHook).toHaveBeenCalledWith(user);
    });

    it('should execute beforeUpdate and afterUpdate hooks for existing records', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const beforeUpdateHook = jest.fn();
      const afterUpdateHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_UPDATE, beforeUpdateHook);
      User.hook(HookEvent.AFTER_UPDATE, afterUpdateHook);

      const user = await User.create({ name: 'John', email: 'john@example.com' });
      await user.save();

      expect(beforeUpdateHook).toHaveBeenCalledWith(user);
      expect(afterUpdateHook).toHaveBeenCalledWith(user);
    });
  });

  describe('create hooks', () => {
    it('should execute beforeCreate and afterCreate hooks on create', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const beforeCreateHook = jest.fn();
      const afterCreateHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_CREATE, beforeCreateHook);
      User.hook(HookEvent.AFTER_CREATE, afterCreateHook);

      const user = await User.create({ name: 'John', email: 'john@example.com' });

      expect(beforeCreateHook).toHaveBeenCalledWith(user);
      expect(afterCreateHook).toHaveBeenCalledWith(user);
    });
  });

  describe('update hooks', () => {
    it('should execute beforeUpdate and afterUpdate hooks on update', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const beforeUpdateHook = jest.fn();
      const afterUpdateHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_UPDATE, beforeUpdateHook);
      User.hook(HookEvent.AFTER_UPDATE, afterUpdateHook);

      const user = await User.create({ name: 'John', email: 'john@example.com' });
      await user.update({ name: 'Jane' });

      expect(beforeUpdateHook).toHaveBeenCalledWith(user);
      expect(afterUpdateHook).toHaveBeenCalledWith(user);
    });
  });

  describe('delete hooks', () => {
    it('should execute beforeDelete and afterDelete hooks on delete', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const beforeDeleteHook = jest.fn();
      const afterDeleteHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_DELETE, beforeDeleteHook);
      User.hook(HookEvent.AFTER_DELETE, afterDeleteHook);

      const user = await User.create({ name: 'John', email: 'john@example.com' });
      await user.delete();

      expect(beforeDeleteHook).toHaveBeenCalledWith(user);
      expect(afterDeleteHook).toHaveBeenCalledWith(user);
    });

    it('should not execute afterDelete if delete fails', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 }); // Delete fails

      const beforeDeleteHook = jest.fn();
      const afterDeleteHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_DELETE, beforeDeleteHook);
      User.hook(HookEvent.AFTER_DELETE, afterDeleteHook);

      const user = await User.create({ name: 'John', email: 'john@example.com' });
      await user.delete();

      expect(beforeDeleteHook).toHaveBeenCalledWith(user);
      expect(afterDeleteHook).not.toHaveBeenCalled();
    });
  });

  describe('validate hooks', () => {
    it('should execute beforeValidate and afterValidate hooks', async () => {
      const beforeValidateHook = jest.fn();
      const afterValidateHook = jest.fn();
      
      User.hook(HookEvent.BEFORE_VALIDATE, beforeValidateHook);
      User.hook(HookEvent.AFTER_VALIDATE, afterValidateHook);

      const user = new User();
      user.name = 'John';
      user.email = 'john@example.com';

      await user.validate();

      expect(beforeValidateHook).toHaveBeenCalled();
      expect(afterValidateHook).toHaveBeenCalled();
      
      // Check that hooks were called with the user instance
      const beforeCall = beforeValidateHook.mock.calls[0];
      const afterCall = afterValidateHook.mock.calls[0];
      expect(beforeCall[0]).toBe(user);
      expect(afterCall[0]).toBe(user);
    });
  });

  describe('hook priority', () => {
    it('should execute hooks in priority order', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const order: number[] = [];
      const hook1 = jest.fn(() => { order.push(1); });
      const hook2 = jest.fn(() => { order.push(2); });
      const hook3 = jest.fn(() => { order.push(3); });

      User.hook(HookEvent.BEFORE_SAVE, hook1, 200);
      User.hook(HookEvent.BEFORE_SAVE, hook2, 50);
      User.hook(HookEvent.BEFORE_SAVE, hook3, 100);

      const user = new User();
      user.name = 'John';
      user.email = 'john@example.com';

      await user.save();

      expect(order).toEqual([2, 3, 1]); // Sorted by priority
    });
  });

  describe('unhook', () => {
    it('should remove a hook', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const hook = jest.fn();
      User.hook(HookEvent.BEFORE_SAVE, hook);
      User.unhook(HookEvent.BEFORE_SAVE, hook);

      const user = new User();
      user.name = 'John';
      user.email = 'john@example.com';

      await user.save();

      expect(hook).not.toHaveBeenCalled();
    });
  });

  describe('clearHooks', () => {
    it('should clear all hooks for an event', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const hook1 = jest.fn();
      const hook2 = jest.fn();
      
      User.hook(HookEvent.BEFORE_SAVE, hook1);
      User.hook(HookEvent.BEFORE_SAVE, hook2);
      User.clearHooks(HookEvent.BEFORE_SAVE);

      const user = new User();
      user.name = 'John';
      user.email = 'john@example.com';

      await user.save();

      expect(hook1).not.toHaveBeenCalled();
      expect(hook2).not.toHaveBeenCalled();
    });
  });
});

