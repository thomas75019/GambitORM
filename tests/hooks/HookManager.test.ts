import { HookManager } from '../../src/hooks/HookManager';
import { HookEvent } from '../../src/hooks/HookTypes';
import { Model } from '../../src/orm/Model';

describe('HookManager', () => {
  let hookManager: HookManager;

  beforeEach(() => {
    hookManager = new HookManager();
  });

  describe('register', () => {
    it('should register a hook', () => {
      const callback = jest.fn();
      hookManager.register(HookEvent.BEFORE_SAVE, callback);

      expect(hookManager.hasHooks(HookEvent.BEFORE_SAVE)).toBe(true);
      expect(hookManager.getHooks(HookEvent.BEFORE_SAVE).length).toBe(1);
    });

    it('should register multiple hooks for the same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      hookManager.register(HookEvent.BEFORE_SAVE, callback1);
      hookManager.register(HookEvent.BEFORE_SAVE, callback2);

      expect(hookManager.getHooks(HookEvent.BEFORE_SAVE).length).toBe(2);
    });

    it('should sort hooks by priority', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      
      hookManager.register(HookEvent.BEFORE_SAVE, callback1, 200);
      hookManager.register(HookEvent.BEFORE_SAVE, callback2, 50);
      hookManager.register(HookEvent.BEFORE_SAVE, callback3, 100);

      const hooks = hookManager.getHooks(HookEvent.BEFORE_SAVE);
      expect(hooks[0].callback).toBe(callback2); // Priority 50
      expect(hooks[1].callback).toBe(callback3); // Priority 100
      expect(hooks[2].callback).toBe(callback1); // Priority 200
    });
  });

  describe('unregister', () => {
    it('should unregister a hook', () => {
      const callback = jest.fn();
      hookManager.register(HookEvent.BEFORE_SAVE, callback);
      hookManager.unregister(HookEvent.BEFORE_SAVE, callback);

      expect(hookManager.hasHooks(HookEvent.BEFORE_SAVE)).toBe(false);
    });

    it('should not affect other hooks when unregistering', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      hookManager.register(HookEvent.BEFORE_SAVE, callback1);
      hookManager.register(HookEvent.BEFORE_SAVE, callback2);
      hookManager.unregister(HookEvent.BEFORE_SAVE, callback1);

      expect(hookManager.getHooks(HookEvent.BEFORE_SAVE).length).toBe(1);
      expect(hookManager.getHooks(HookEvent.BEFORE_SAVE)[0].callback).toBe(callback2);
    });
  });

  describe('clear', () => {
    it('should clear all hooks for an event', () => {
      hookManager.register(HookEvent.BEFORE_SAVE, jest.fn());
      hookManager.register(HookEvent.BEFORE_SAVE, jest.fn());
      hookManager.clear(HookEvent.BEFORE_SAVE);

      expect(hookManager.hasHooks(HookEvent.BEFORE_SAVE)).toBe(false);
    });

    it('should not affect other events', () => {
      hookManager.register(HookEvent.BEFORE_SAVE, jest.fn());
      hookManager.register(HookEvent.AFTER_SAVE, jest.fn());
      hookManager.clear(HookEvent.BEFORE_SAVE);

      expect(hookManager.hasHooks(HookEvent.BEFORE_SAVE)).toBe(false);
      expect(hookManager.hasHooks(HookEvent.AFTER_SAVE)).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all hooks', () => {
      hookManager.register(HookEvent.BEFORE_SAVE, jest.fn());
      hookManager.register(HookEvent.AFTER_SAVE, jest.fn());
      hookManager.register(HookEvent.BEFORE_DELETE, jest.fn());
      hookManager.clearAll();

      expect(hookManager.hasHooks(HookEvent.BEFORE_SAVE)).toBe(false);
      expect(hookManager.hasHooks(HookEvent.AFTER_SAVE)).toBe(false);
      expect(hookManager.hasHooks(HookEvent.BEFORE_DELETE)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute hooks in order', async () => {
      const order: number[] = [];
      const callback1 = jest.fn(() => { order.push(1); });
      const callback2 = jest.fn(() => { order.push(2); });
      const callback3 = jest.fn(() => { order.push(3); });

      hookManager.register(HookEvent.BEFORE_SAVE, callback1, 100);
      hookManager.register(HookEvent.BEFORE_SAVE, callback2, 50);
      hookManager.register(HookEvent.BEFORE_SAVE, callback3, 75);

      const mockModel = {} as Model;
      await hookManager.execute(HookEvent.BEFORE_SAVE, mockModel);

      expect(order).toEqual([2, 3, 1]); // Sorted by priority
      expect(callback1).toHaveBeenCalledWith(mockModel);
      expect(callback2).toHaveBeenCalledWith(mockModel);
      expect(callback3).toHaveBeenCalledWith(mockModel);
    });

    it('should handle async hooks', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      
      hookManager.register(HookEvent.BEFORE_SAVE, callback);
      
      const mockModel = {} as Model;
      await hookManager.execute(HookEvent.BEFORE_SAVE, mockModel);

      expect(callback).toHaveBeenCalled();
    });

    it('should not execute hooks for unregistered events', async () => {
      const callback = jest.fn();
      hookManager.register(HookEvent.BEFORE_SAVE, callback);

      const mockModel = {} as Model;
      await hookManager.execute(HookEvent.AFTER_SAVE, mockModel);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

