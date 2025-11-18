/**
 * Example: Using Model Scopes in GambitORM
 * 
 * This file demonstrates how to use local and global scopes in models
 */

import { GambitORM, Model } from '../src';

// Example Model with Scopes
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
  status!: string;
  age!: number;
  verified!: boolean;
  published!: boolean;
}

async function scopesExample() {
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

  // Define local scopes
  User.scope('active', (query) => {
    query.where('status', '=', 'active');
  });

  User.scope('verified', (query) => {
    query.where('verified', '=', true);
  });

  User.scope('adults', (query) => {
    query.where('age', '>=', 18);
  });

  User.scope('byName', (query, name: string) => {
    query.where('name', '=', name);
  });

  User.scope('recent', (query, days: number = 30) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    query.where('created_at', '>=', date);
  });

  // Use local scopes
  console.log('=== Local Scopes ===');

  // Single scope
  const activeUsers = await User.query()
    .scope('active')
    .get();
  console.log('Active users:', activeUsers.length);

  // Chain multiple scopes
  const verifiedAdults = await User.query()
    .scope('active')
    .scope('verified')
    .scope('adults')
    .get();
  console.log('Verified adult users:', verifiedAdults.length);

  // Scope with arguments
  const john = await User.query()
    .scope('byName', 'John')
    .first();
  console.log('User named John:', john?.name);

  // Scope with default arguments
  const recentUsers = await User.query()
    .scope('recent', 7) // Last 7 days
    .get();
  console.log('Recent users (7 days):', recentUsers.length);

  // Combine scopes with other query methods
  const topActiveUsers = await User.query()
    .scope('active')
    .orderBy('created_at', 'DESC')
    .limit(10)
    .get();
  console.log('Top 10 active users:', topActiveUsers.length);

  // Use scopes() method for multiple scopes
  const users = await User.query()
    .scopes('active', 'verified')
    .get();
  console.log('Active and verified users:', users.length);

  // Global scopes (always applied)
  console.log('\n=== Global Scopes ===');

  User.addGlobalScope('published', (query) => {
    query.where('published', '=', true);
  });

  // All queries automatically include global scopes
  const allUsers = await User.findAll(); // Includes published scope
  console.log('All published users:', allUsers.length);

  const userById = await User.findById(1); // Includes published scope
  console.log('User by ID (with global scope):', userById?.name);

  const userByEmail = await User.findOne({ email: 'john@example.com' }); // Includes published scope
  console.log('User by email (with global scope):', userByEmail?.name);

  // Query builder also includes global scopes
  const usersWithQuery = await User.query()
    .scope('active')
    .get(); // Includes both global scope and local scope
  console.log('Published and active users:', usersWithQuery.length);

  // Multiple global scopes
  User.addGlobalScope('notDeleted', (query) => {
    query.whereNull('deleted_at');
  });

  // Both global scopes are applied
  const allActiveUsers = await User.findAll(); // Includes both published and notDeleted scopes
  console.log('All published, not deleted users:', allActiveUsers.length);

  // Scope query builder methods
  console.log('\n=== Scope Query Builder Methods ===');

  // get() - Get all results
  const allActive = await User.query()
    .scope('active')
    .get();
  console.log('All active users:', allActive.length);

  // first() - Get first result
  const firstActive = await User.query()
    .scope('active')
    .orderBy('created_at', 'DESC')
    .first();
  console.log('First active user:', firstActive?.name);

  // count() - Get count
  const activeCount = await User.query()
    .scope('active')
    .count();
  console.log('Active users count:', activeCount);

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  scopesExample().catch(console.error);
}

export { scopesExample };

