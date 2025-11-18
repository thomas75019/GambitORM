/**
 * MongoDB Example
 * 
 * This example demonstrates how to use GambitORM with MongoDB
 */

import { GambitORM, Model, MongoDBHelper } from 'gambitorm';

// Define a model for MongoDB
class User extends Model {
  static tableName = 'users';
  
  _id?: string;
  id?: string;
  name!: string;
  email!: string;
  age?: number;
}

// Initialize ORM with MongoDB
const orm = new GambitORM({
  host: 'localhost',
  port: 27017,
  database: 'mydb',
  dialect: 'mongodb',
});

async function main() {
  try {
    // Connect to MongoDB
    await orm.connect();
    Model.setConnection(orm.getConnection());

    // Method 1: Using Model API (works with basic operations)
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    });
    console.log('Created user:', user);

    // Find users
    const users = await User.findAll();
    console.log('All users:', users);

    // Method 2: Using MongoDB Helper for native MongoDB operations
    const connection = orm.getConnection();
    const mongoHelper = connection.getMongoDBHelper();

    // Native MongoDB find
    const mongoUsers = await mongoHelper.find('users', { age: { $gte: 25 } });
    console.log('Users 25 or older:', mongoUsers);

    // Native MongoDB insert
    await mongoHelper.insertOne('users', {
      name: 'Jane Doe',
      email: 'jane@example.com',
      age: 28,
    });

    // Native MongoDB update
    await mongoHelper.updateOne(
      'users',
      { email: 'john@example.com' },
      { $set: { age: 31 } }
    );

    // Native MongoDB delete
    await mongoHelper.deleteOne('users', { email: 'jane@example.com' });

    // Transactions (MongoDB 4.0+)
    await orm.transaction(async (tx) => {
      await User.create({ name: 'Alice', email: 'alice@example.com' });
      await User.create({ name: 'Bob', email: 'bob@example.com' });
      // Automatically commits or rolls back
    });

    // Using native MongoDB collection directly
    const collection = mongoHelper.collection('users');
    if (collection) {
      const count = await collection.countDocuments();
      console.log(`Total users: ${count}`);
    }

    // Disconnect
    await orm.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run example
if (require.main === module) {
  main();
}

