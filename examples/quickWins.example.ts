/**
 * Example: Using Quick Win Helper Methods in GambitORM
 * 
 * This file demonstrates the quick helper methods available on models
 */

import { GambitORM, Model } from '../src';

// Example Model
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
  views!: number;
  status!: string;
  updated_at?: Date;
}

async function quickWinsExample() {
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

  console.log('=== Quick Helper Methods ===\n');

  // 1. count() - Count records
  console.log('1. Count Records:');
  const totalUsers = await User.count();
  console.log(`Total users: ${totalUsers}`);

  const activeUsers = await User.count({ status: 'active' });
  console.log(`Active users: ${activeUsers}`);

  // 2. exists() - Check if records exist
  console.log('\n2. Check Existence:');
  const userExists = await User.exists({ email: 'john@example.com' });
  console.log(`User with email exists: ${userExists}`);

  // 3. pluck() - Get column values
  console.log('\n3. Pluck Column Values:');
  const allNames = await User.pluck('name');
  console.log('All names:', allNames);

  const topNames = await User.pluck('name', { 
    orderBy: 'created_at DESC',
    limit: 10 
  });
  console.log('Top 10 names:', topNames);

  // 4. first() - Get first record
  console.log('\n4. Get First Record:');
  const firstUser = await User.first();
  console.log('First user:', firstUser?.name);

  const firstActive = await User.first({ where: { status: 'active' } });
  console.log('First active user:', firstActive?.name);

  // 5. last() - Get last record
  console.log('\n5. Get Last Record:');
  const lastUser = await User.last();
  console.log('Last user:', lastUser?.name);

  // 6. increment() - Increment column value
  console.log('\n6. Increment Column:');
  const user = await User.findById(1);
  if (user) {
    console.log(`Views before: ${user.views}`);
    await user.increment('views', 5);
    console.log(`Views after increment(5): ${user.views}`);

    await user.increment('views'); // Default: increment by 1
    console.log(`Views after increment(): ${user.views}`);
  }

  // 7. decrement() - Decrement column value
  console.log('\n7. Decrement Column:');
  if (user) {
    await user.decrement('views', 2);
    console.log(`Views after decrement(2): ${user.views}`);
  }

  // 8. touch() - Update timestamp
  console.log('\n8. Touch Timestamp:');
  if (user) {
    const beforeTouch = user.updated_at;
    await user.touch();
    console.log(`Updated at before: ${beforeTouch}`);
    console.log(`Updated at after: ${user.updated_at}`);

    // Touch custom column
    await user.touch('last_seen_at');
    console.log('Last seen at:', (user as any).last_seen_at);
  }

  // 9. fresh() - Reload from database
  console.log('\n9. Reload from Database:');
  if (user) {
    user.name = 'Modified Name';
    console.log(`Name before fresh: ${user.name}`);
    
    await user.fresh();
    console.log(`Name after fresh: ${user.name}`);
  }

  // 10. isDirty() - Check if modified
  console.log('\n10. Check if Modified:');
  if (user) {
    user.name = 'New Name';
    console.log(`Is dirty: ${user.isDirty()}`);
    console.log(`Is name dirty: ${user.isDirty('name')}`);
    console.log(`Is email dirty: ${user.isDirty('email')}`);
  }

  // 11. isClean() - Check if not modified
  console.log('\n11. Check if Clean:');
  if (user) {
    await user.fresh(); // Reset to clean state
    console.log(`Is clean: ${user.isClean()}`);
    console.log(`Is name clean: ${user.isClean('name')}`);

    user.name = 'Changed';
    console.log(`Is clean after change: ${user.isClean()}`);
  }

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  quickWinsExample().catch(console.error);
}

export { quickWinsExample };

