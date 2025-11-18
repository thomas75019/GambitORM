/**
 * Example: Using Transactions in GambitORM
 * 
 * This file demonstrates how to use transactions for atomic operations
 */

import { GambitORM, Model, Transaction } from '../src';

// Example Models
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
  balance!: number;
}

class TransactionRecord extends Model {
  static tableName = 'transactions';
  id!: number;
  from_user_id!: number;
  to_user_id!: number;
  amount!: number;
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
  // Manual Transaction Management
  // ============================================
  const transaction = await orm.beginTransaction();

  try {
    // Perform multiple operations within the transaction
    const user1 = await User.findById(1);
    const user2 = await User.findById(2);

    if (user1 && user2) {
      // Transfer money from user1 to user2
      const amount = 100;
      
      await user1.update({ balance: user1.balance - amount });
      await user2.update({ balance: user2.balance + amount });
      
      // Record the transaction
      await TransactionRecord.create({
        from_user_id: user1.id,
        to_user_id: user2.id,
        amount: amount,
      });

      // Commit if everything succeeds
      await transaction.commit();
      console.log('Transaction completed successfully');
    }
  } catch (error) {
    // Rollback on any error
    await transaction.rollback();
    console.error('Transaction rolled back:', error);
    throw error;
  }

  // ============================================
  // Automatic Transaction Management (Recommended)
  // ============================================
  // Using the transaction() method automatically commits on success
  // or rolls back on error
  await orm.transaction(async (tx) => {
    const user1 = await User.findById(1);
    const user2 = await User.findById(2);

    if (user1 && user2) {
      const amount = 50;
      
      await user1.update({ balance: user1.balance - amount });
      await user2.update({ balance: user2.balance + amount });
      
      await TransactionRecord.create({
        from_user_id: user1.id,
        to_user_id: user2.id,
        amount: amount,
      });
    }
  }); // Automatically commits or rolls back

  // ============================================
  // Transaction with Connection
  // ============================================
  const connection = orm.getConnection();
  
  // Manual transaction with Connection
  await connection.beginTransaction();
  try {
    await connection.query('UPDATE users SET balance = balance - 100 WHERE id = 1');
    await connection.query('UPDATE users SET balance = balance + 100 WHERE id = 2');
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  // ============================================
  // Nested Operations (all within same transaction)
  // ============================================
  await orm.transaction(async (tx) => {
    // Create a user
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      balance: 1000,
    });

    // Create related records
    await TransactionRecord.create({
      from_user_id: 1,
      to_user_id: newUser.id,
      amount: 500,
    });

    // All operations are atomic - either all succeed or all fail
  });

  await orm.disconnect();
}

// Uncomment to run examples
// examples().catch(console.error);

export { User, TransactionRecord };

