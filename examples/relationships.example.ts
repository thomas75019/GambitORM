/**
 * Example: Using Relationships in GambitORM
 * 
 * This file demonstrates how to use hasOne, hasMany, and belongsTo relationships
 */

import { GambitORM, Model } from '../src';

// Example Models
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
}

class Profile extends Model {
  static tableName = 'profiles';
  id!: number;
  user_id!: number;
  bio!: string;
  avatar_url!: string;
}

class Post extends Model {
  static tableName = 'posts';
  id!: number;
  user_id!: number;
  title!: string;
  content!: string;
}

class Comment extends Model {
  static tableName = 'comments';
  id!: number;
  post_id!: number;
  user_id!: number;
  content!: string;
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
  // HasOne Relationship
  // ============================================
  // User has one Profile
  const user = await User.findById(1);
  if (user) {
    const profile = await user.hasOne(Profile, 'user_id').load();
    console.log('User profile:', profile);
  }

  // ============================================
  // HasMany Relationship
  // ============================================
  // User has many Posts
  const userWithPosts = await User.findById(1);
  if (userWithPosts) {
    const posts = await userWithPosts.hasMany(Post, 'user_id').load();
    console.log('User posts:', posts);
  }

  // ============================================
  // BelongsTo Relationship
  // ============================================
  // Post belongs to User
  const post = await Post.findById(1);
  if (post) {
    const author = await post.belongsTo(User, 'user_id').load();
    console.log('Post author:', author);
  }

  // ============================================
  // Eager Loading
  // ============================================
  // Load users with their profiles
  const usersWithProfiles = await User.findAll({
    include: ['profile'], // This would need relationship registry to work fully
  });

  // ============================================
  // Using QueryBuilder with Joins
  // ============================================
  const { QueryBuilder } = await import('../src');
  const connection = orm.getConnection();
  
  const query = new QueryBuilder('users', connection)
    .select(['users.*', 'profiles.bio', 'profiles.avatar_url'])
    .leftJoin('profiles', { left: 'users.id', right: 'profiles.user_id' })
    .where('users.active', '=', true)
    .orderBy('users.name', 'ASC')
    .limit(10);

  const result = await query.execute();
  console.log('Users with profiles:', result.rows);

  // ============================================
  // Complex Join Query
  // ============================================
  const postsQuery = new QueryBuilder('posts', connection)
    .select([
      'posts.*',
      'users.name as author_name',
      'users.email as author_email',
      'COUNT(comments.id) as comment_count',
    ])
    .leftJoin('users', { left: 'posts.user_id', right: 'users.id' })
    .leftJoin('comments', { left: 'posts.id', right: 'comments.post_id' })
    .where('posts.published', '=', true)
    .groupBy(['posts.id', 'users.name', 'users.email'])
    .having('COUNT(comments.id)', '>', 0)
    .orderBy('comment_count', 'DESC')
    .limit(10);

  const postsResult = await postsQuery.execute();
  console.log('Popular posts:', postsResult.rows);

  await orm.disconnect();
}

// Uncomment to run examples
// examples().catch(console.error);

export { User, Profile, Post, Comment };

