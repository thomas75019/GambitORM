/**
 * Example: Using Batch Operations in GambitORM
 * 
 * This file demonstrates batch operations for efficient bulk database operations
 */

import { GambitORM, Model } from '../src';

// Example Model
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
  status!: string;
  lastLogin?: Date;
}

async function batchOperationsExample() {
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

  console.log('=== Batch Operations ===\n');

  // 1. Bulk Insert
  console.log('1. Bulk Insert:');
  const newUsers = await User.bulkInsert([
    { name: 'John', email: 'john@example.com', status: 'active' },
    { name: 'Jane', email: 'jane@example.com', status: 'active' },
    { name: 'Bob', email: 'bob@example.com', status: 'pending' },
    { name: 'Alice', email: 'alice@example.com', status: 'active' },
  ]);
  console.log(`Inserted ${newUsers.length} users`);
  console.log('First user:', newUsers[0].name);

  // 2. Bulk Update
  console.log('\n2. Bulk Update:');
  const updatedCount = await User.bulkUpdate(
    { status: 'pending' },
    { status: 'active', lastLogin: new Date() }
  );
  console.log(`Updated ${updatedCount} users`);

  // Update all active users
  const activeUpdated = await User.bulkUpdate(
    { status: 'active' },
    { lastLogin: new Date() }
  );
  console.log(`Updated ${activeUpdated} active users`);

  // 3. Bulk Delete
  console.log('\n3. Bulk Delete:');
  const deletedCount = await User.bulkDelete({ status: 'inactive' });
  console.log(`Deleted ${deletedCount} inactive users`);

  // 4. Bulk Upsert
  console.log('\n4. Bulk Upsert:');
  const upsertedUsers = await User.bulkUpsert(
    [
      { name: 'New User', email: 'new@example.com', status: 'active' }, // Will insert
      { id: 1, name: 'John Updated', email: 'john@example.com' }, // Will update if exists
      { email: 'existing@example.com', name: 'Existing User' }, // Will update if email exists
    ],
    ['id', 'email'] // Unique keys to check
  );
  console.log(`Upserted ${upsertedUsers.length} users`);

  // 5. Batch Operations with Transactions
  console.log('\n5. Batch Operations in Transaction:');
  await orm.transaction(async (tx) => {
    // All operations in this block are atomic
    await User.bulkInsert([
      { name: 'Tx User 1', email: 'tx1@example.com' },
      { name: 'Tx User 2', email: 'tx2@example.com' },
    ]);

    await User.bulkUpdate(
      { status: 'pending' },
      { status: 'active' }
    );

    // If any operation fails, all are rolled back
  });
  console.log('Transaction completed successfully');

  // 6. Batch Operations with Automatic Timestamps
  console.log('\n6. Batch Operations with Timestamps:');
  class TimestampedUser extends Model {
    static tableName = 'users';
    static timestamps = true;
    id!: number;
    name!: string;
    created_at?: Date;
    updated_at?: Date;
  }

  const timestampedUsers = await TimestampedUser.bulkInsert([
    { name: 'User 1' },
    { name: 'User 2' },
  ]);
  console.log('First user created_at:', timestampedUsers[0].created_at);

  // 7. Batch Operations with Soft Deletes
  console.log('\n7. Batch Operations with Soft Deletes:');
  class SoftDeleteUser extends Model {
    static tableName = 'users';
    static softDeletes = true;
    id!: number;
    name!: string;
    deleted_at?: Date;
  }

  // Bulk delete will perform soft delete
  const softDeleted = await SoftDeleteUser.bulkDelete({ status: 'inactive' });
  console.log(`Soft deleted ${softDeleted} users`);

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  batchOperationsExample().catch(console.error);
}

export { batchOperationsExample };

