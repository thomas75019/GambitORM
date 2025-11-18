/**
 * Example: Using Automatic Timestamps in GambitORM
 * 
 * This file demonstrates how to use automatic timestamps in models
 */

import { GambitORM, Model } from '../src';

// Example Model with Automatic Timestamps
class User extends Model {
  static tableName = 'users';
  static timestamps = true; // Enable automatic timestamps
  static createdAt = 'created_at'; // Optional: customize field name (default: 'created_at')
  static updatedAt = 'updated_at'; // Optional: customize field name (default: 'updated_at')
  
  id!: number;
  name!: string;
  email!: string;
  created_at?: Date;
  updated_at?: Date;
}

// Example with custom field names (camelCase)
class Post extends Model {
  static tableName = 'posts';
  static timestamps = true;
  static createdAt = 'createdAt'; // Use camelCase
  static updatedAt = 'updatedAt';
  
  id!: number;
  title!: string;
  content!: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Example without timestamps
class Comment extends Model {
  static tableName = 'comments';
  static timestamps = false; // Disable automatic timestamps
  
  id!: number;
  text!: string;
}

async function timestampsExample() {
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

  // Create a user - automatically sets created_at and updated_at
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
  });

  console.log('Created user:', user.id);
  console.log('Created at:', user.created_at);
  console.log('Updated at:', user.updated_at);

  // Save a new record - automatically sets both timestamps
  const newUser = new User();
  newUser.name = 'Jane Doe';
  newUser.email = 'jane@example.com';
  await newUser.save();

  console.log('New user created at:', newUser.created_at);
  console.log('New user updated at:', newUser.updated_at);

  // Update existing record - automatically updates updated_at
  const beforeUpdate = user.updated_at;
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  user.name = 'John Updated';
  await user.save();

  console.log('Updated at changed:', user.updated_at!.getTime() > beforeUpdate!.getTime());
  console.log('Created at unchanged:', user.created_at);

  // Update method - automatically updates updated_at
  await user.update({ name: 'John Final' });
  console.log('Updated via update() method:', user.updated_at);

  // Custom field names
  const post = await Post.create({
    title: 'My Post',
    content: 'Post content',
  });

  console.log('Post createdAt:', post.createdAt);
  console.log('Post updatedAt:', post.updatedAt);

  // Without timestamps
  const comment = await Comment.create({
    text: 'Great post!',
  });

  console.log('Comment (no timestamps):', comment);
  console.log('Comment has no created_at:', !(comment as any).created_at);

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  timestampsExample().catch(console.error);
}

export { timestampsExample };

