/**
 * Example: Using Hooks/Events in GambitORM
 * 
 * This file demonstrates how to use lifecycle hooks in models
 */

import { GambitORM, Model, HookEvent } from '../src';

// Example Models
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
  created_at?: Date;
  updated_at?: Date;
}

class Post extends Model {
  static tableName = 'posts';
  id!: number;
  title!: string;
  content!: string;
  user_id!: number;
  published_at?: Date;
}

// Initialize ORM
const orm = new GambitORM({
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  user: 'user',
  password: 'password',
  dialect: 'mysql',
});

async function examples() {
  await orm.connect();

  // ============================================
  // Register Hooks
  // ============================================
  
  // Before Save Hook - Set timestamps
  User.hook(HookEvent.BEFORE_SAVE, async (user) => {
    if (!user.id) {
      // New record
      user.created_at = new Date();
    }
    user.updated_at = new Date();
  });

  // After Create Hook - Send welcome email
  User.hook(HookEvent.AFTER_CREATE, async (user) => {
    console.log(`Welcome email sent to ${user.email}`);
    // await sendWelcomeEmail(user.email);
  });

  // Before Delete Hook - Prevent deletion of admin users
  User.hook(HookEvent.BEFORE_DELETE, async (user) => {
    if (user.email === 'admin@example.com') {
      throw new Error('Cannot delete admin user');
    }
  });

  // After Delete Hook - Cleanup related data
  User.hook(HookEvent.AFTER_DELETE, async (user) => {
    console.log(`Cleaning up data for user ${user.id}`);
    // await cleanupUserData(user.id);
  });

  // ============================================
  // Hook Priority
  // ============================================
  // Hooks with lower priority numbers run first
  
  // This hook runs first (priority 10)
  User.hook(HookEvent.BEFORE_SAVE, async (user) => {
    console.log('First hook (priority 10)');
  }, 10);

  // This hook runs second (priority 50)
  User.hook(HookEvent.BEFORE_SAVE, async (user) => {
    console.log('Second hook (priority 50)');
  }, 50);

  // This hook runs last (priority 100, default)
  User.hook(HookEvent.BEFORE_SAVE, async (user) => {
    console.log('Third hook (priority 100)');
  });

  // ============================================
  // Using Hooks
  // ============================================
  
  // Create a user - triggers beforeCreate, afterCreate, beforeSave, afterSave
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
  });
  // Hooks executed:
  // 1. beforeSave
  // 2. beforeCreate
  // 3. afterCreate
  // 4. afterSave

  // Update a user - triggers beforeUpdate, afterUpdate, beforeSave, afterSave
  await user.save();
  // Hooks executed:
  // 1. beforeSave
  // 2. beforeUpdate
  // 3. afterUpdate
  // 4. afterSave

  // Delete a user - triggers beforeDelete, afterDelete
  await user.delete();
  // Hooks executed:
  // 1. beforeDelete
  // 2. afterDelete

  // ============================================
  // Validation Hooks
  // ============================================
  
  User.hook(HookEvent.BEFORE_VALIDATE, async (user) => {
    // Normalize email before validation
    if (user.email) {
      user.email = user.email.toLowerCase().trim();
    }
  });

  User.hook(HookEvent.AFTER_VALIDATE, async (user) => {
    console.log(`Validation passed for user: ${user.name}`);
  });

  // ============================================
  // Complex Hook Example
  // ============================================
  
  // When a post is created, update user's post count
  Post.hook(HookEvent.AFTER_CREATE, async (post) => {
    const user = await User.findById(post.user_id);
    if (user) {
      // Update user's post count (assuming there's a post_count field)
      // await user.update({ post_count: (user.post_count || 0) + 1 });
      console.log(`Post created for user ${user.name}`);
    }
  });

  // When a post is deleted, update user's post count
  Post.hook(HookEvent.AFTER_DELETE, async (post) => {
    const user = await User.findById(post.user_id);
    if (user) {
      // await user.update({ post_count: (user.post_count || 0) - 1 });
      console.log(`Post deleted for user ${user.name}`);
    }
  });

  // ============================================
  // Unregister Hooks
  // ============================================
  
  const myHook = async (user: User) => {
    console.log('This hook will be removed');
  };

  User.hook(HookEvent.BEFORE_SAVE, myHook);
  
  // Later, remove the hook
  User.unhook(HookEvent.BEFORE_SAVE, myHook);

  // ============================================
  // Clear All Hooks for an Event
  // ============================================
  
  // Remove all beforeSave hooks
  User.clearHooks(HookEvent.BEFORE_SAVE);

  await orm.disconnect();
}

// Uncomment to run examples
// examples().catch(console.error);

export { User, Post };

