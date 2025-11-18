import { Model } from '../orm/Model';
import { HookEvent, HookCallback, HookRegistration } from './HookTypes';

/**
 * Manages lifecycle hooks for models
 */
export class HookManager {
  private hooks: Map<string, HookRegistration[]> = new Map();

  /**
   * Register a hook
   */
  register(event: HookEvent, callback: HookCallback, priority: number = 100): void {
    const key = this.getKey(event);
    if (!this.hooks.has(key)) {
      this.hooks.set(key, []);
    }

    const registration: HookRegistration = {
      event,
      callback,
      priority,
    };

    const hooks = this.hooks.get(key)!;
    hooks.push(registration);
    
    // Sort by priority (lower numbers first)
    hooks.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  /**
   * Unregister a hook
   */
  unregister(event: HookEvent, callback: HookCallback): void {
    const key = this.getKey(event);
    const hooks = this.hooks.get(key);
    if (hooks) {
      const index = hooks.findIndex(h => h.callback === callback);
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    }
  }

  /**
   * Clear all hooks for an event
   */
  clear(event: HookEvent): void {
    const key = this.getKey(event);
    this.hooks.delete(key);
  }

  /**
   * Clear all hooks
   */
  clearAll(): void {
    this.hooks.clear();
  }

  /**
   * Execute hooks for an event
   */
  async execute<T extends Model>(event: HookEvent, instance: T): Promise<void> {
    const key = this.getKey(event);
    const hooks = this.hooks.get(key) || [];

    for (const hook of hooks) {
      const result = hook.callback(instance);
      if (result instanceof Promise) {
        await result;
      }
    }
  }

  /**
   * Get hooks for an event
   */
  getHooks(event: HookEvent): HookRegistration[] {
    const key = this.getKey(event);
    return this.hooks.get(key) || [];
  }

  /**
   * Check if any hooks are registered for an event
   */
  hasHooks(event: HookEvent): boolean {
    const key = this.getKey(event);
    return this.hooks.has(key) && this.hooks.get(key)!.length > 0;
  }

  /**
   * Get a unique key for an event
   */
  private getKey(event: HookEvent): string {
    return event;
  }
}

