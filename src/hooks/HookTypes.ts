import { Model } from '../orm/Model';

/**
 * Hook callback function type
 */
export type HookCallback<T extends Model = Model> = (instance: T) => Promise<void> | void;

/**
 * Hook event types
 */
export enum HookEvent {
  BEFORE_SAVE = 'beforeSave',
  AFTER_SAVE = 'afterSave',
  BEFORE_CREATE = 'beforeCreate',
  AFTER_CREATE = 'afterCreate',
  BEFORE_UPDATE = 'beforeUpdate',
  AFTER_UPDATE = 'afterUpdate',
  BEFORE_DELETE = 'beforeDelete',
  AFTER_DELETE = 'afterDelete',
  BEFORE_VALIDATE = 'beforeValidate',
  AFTER_VALIDATE = 'afterValidate',
}

/**
 * Hook registration
 */
export interface HookRegistration {
  event: HookEvent;
  callback: HookCallback;
  priority?: number; // Lower numbers run first, default is 100
}

