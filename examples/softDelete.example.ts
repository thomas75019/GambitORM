/**
 * Example: Using Soft Deletes in GambitORM
 * 
 * This file demonstrates how to use soft deletes in models
 */

import { GambitORM, Model } from '../src';

// Example Model with Soft Deletes
class User extends Model {
  static tableName = 'users';
  static softDeletes = true; // Enable soft deletes
  static deletedAt = 'deleted_at'; // Optional: customize field name (default is 'deleted_at')
  
  id!: number;
  name!: string;
  email!: string;
  deleted_at?: Date | null;
}

class Post extends Model {
  static tableName = 'posts';
  static softDeletes = false; // Soft deletes disabled (default)
  
  id!: number;
  title!: string;
  content!: string;
}

async function softDeleteExample() {
  // Initialize ORM
  const orm = new GambitORM({
    host: 'localhost',
    port: 3306,
    database: 'mydb',
    user: 'root',
    password: 'password',
    dialect: 'mysql',
  });

  await orm.connect();
  Model.setConnection(orm.getConnection());

  // Create a user
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
  });

  console.log('Created user:', user.id);

  // Soft delete the user (sets deleted_at instead of removing)
  await user.delete();
  console.log('User soft-deleted:', user.deleted_at);

  // Find all users (excludes soft-deleted by default)
  const activeUsers = await User.findAll();
  console.log('Active users:', activeUsers.length); // 0

  // Include soft-deleted records
  const allUsers = await User.withTrashed().findAll();
  console.log('All users (including deleted):', allUsers.length); // 1

  // Only get soft-deleted records
  const deletedUsers = await User.onlyTrashed().findAll();
  console.log('Deleted users:', deletedUsers.length); // 1

  // Find by ID (excludes soft-deleted by default)
  const found = await User.findById(user.id);
  console.log('Found user:', found); // null

  // Find with withTrashed
  const foundWithTrashed = await User.withTrashed().findById(user.id);
  console.log('Found user (with trashed):', foundWithTrashed?.name); // 'John Doe'

  // Restore the soft-deleted user
  await user.restore();
  console.log('User restored:', user.deleted_at); // null

  // Now the user is back in normal queries
  const restoredUser = await User.findById(user.id);
  console.log('Restored user found:', restoredUser?.name); // 'John Doe'

  // Permanently delete (force delete)
  await user.forceDelete();
  console.log('User permanently deleted');

  // User is now gone forever
  const deletedUser = await User.withTrashed().findById(user.id);
  console.log('User after force delete:', deletedUser); // null

  // Post model doesn't use soft deletes
  const post = await Post.create({
    title: 'My Post',
    content: 'Post content',
  });

  await post.delete(); // Actually deletes from database (hard delete)
  console.log('Post deleted (hard delete)');

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  softDeleteExample().catch(console.error);
}

export { softDeleteExample };

