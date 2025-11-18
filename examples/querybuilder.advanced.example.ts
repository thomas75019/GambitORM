/**
 * Example: Advanced QueryBuilder Features
 * 
 * This file demonstrates advanced QueryBuilder features including
 * subqueries, raw SQL, and additional WHERE methods
 */

import { GambitORM, QueryBuilder } from '../src';

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
  const connection = orm.getConnection();

  // ============================================
  // WHERE IN / WHERE NOT IN
  // ============================================
  const query1 = new QueryBuilder('users', connection);
  query1
    .whereIn('id', [1, 2, 3, 4, 5])
    .whereNotIn('status', ['deleted', 'banned']);

  const result1 = await query1.execute();
  console.log('Users with IDs 1-5, excluding deleted/banned:', result1.rows);

  // ============================================
  // WHERE NULL / WHERE NOT NULL
  // ============================================
  const query2 = new QueryBuilder('users', connection);
  query2
    .whereNull('deleted_at')
    .whereNotNull('email');

  const result2 = await query2.execute();
  console.log('Active users with email:', result2.rows);

  // ============================================
  // WHERE BETWEEN / WHERE NOT BETWEEN
  // ============================================
  const query3 = new QueryBuilder('users', connection);
  query3
    .whereBetween('age', 18, 65)
    .whereNotBetween('salary', 0, 50000);

  const result3 = await query3.execute();
  console.log('Users aged 18-65 with salary > 50000:', result3.rows);

  // ============================================
  // WHERE LIKE / WHERE NOT LIKE
  // ============================================
  const query4 = new QueryBuilder('users', connection);
  query4
    .whereLike('email', '%@gmail.com')
    .whereNotLike('name', '%test%');

  const result4 = await query4.execute();
  console.log('Gmail users without "test" in name:', result4.rows);

  // ============================================
  // OR WHERE Conditions
  // ============================================
  const query5 = new QueryBuilder('users', connection);
  query5
    .where('status', '=', 'active')
    .orWhere('status', '=', 'pending')
    .orWhere('status', '=', 'verified');

  const result5 = await query5.execute();
  console.log('Users with active, pending, or verified status:', result5.rows);

  // ============================================
  // Raw WHERE Conditions
  // ============================================
  const query6 = new QueryBuilder('users', connection);
  query6.whereRaw('(age > ? OR salary > ?) AND status = ?', [18, 50000, 'active']);

  const result6 = await query6.execute();
  console.log('Complex raw condition results:', result6.rows);

  // ============================================
  // Subqueries
  // ============================================
  // Find users who have placed orders
  const subquery = QueryBuilder.subquery('orders', connection);
  subquery.select(['user_id']).where('status', '=', 'completed');

  const query7 = new QueryBuilder('users', connection);
  query7.whereSubquery('id', 'IN', subquery);

  const result7 = await query7.execute();
  console.log('Users with completed orders:', result7.rows);

  // Find users with orders above average
  const avgSubquery = QueryBuilder.subquery('orders', connection);
  avgSubquery.select(['AVG(total) as avg_total']);

  const query8 = new QueryBuilder('users', connection);
  query8
    .join('orders', { left: 'users.id', right: 'orders.user_id' })
    .whereSubquery('orders.total', '>', avgSubquery);

  const result8 = await query8.execute();
  console.log('Users with orders above average:', result8.rows);

  // ============================================
  // Aggregate Functions
  // ============================================
  // Count users
  const countQuery = new QueryBuilder('users', connection);
  countQuery.count('*', 'total_users');
  const countResult = await countQuery.execute();
  console.log('Total users:', countResult.rows[0].total_users);

  // Sum of order totals
  const sumQuery = new QueryBuilder('orders', connection);
  sumQuery.sum('total', 'total_revenue');
  const sumResult = await sumQuery.execute();
  console.log('Total revenue:', sumResult.rows[0].total_revenue);

  // Average order value
  const avgQuery = new QueryBuilder('orders', connection);
  avgQuery.avg('total', 'avg_order_value');
  const avgResult = await avgQuery.execute();
  console.log('Average order value:', avgResult.rows[0].avg_order_value);

  // Max and Min
  const statsQuery = new QueryBuilder('orders', connection);
  statsQuery
    .select(['MAX(total) as max_order', 'MIN(total) as min_order'])
    .where('status', '=', 'completed');
  const statsResult = await statsQuery.execute();
  console.log('Order statistics:', statsResult.rows[0]);

  // ============================================
  // Raw SQL Execution
  // ============================================
  // Execute raw SQL when needed
  const rawResult = await orm.raw(
    'SELECT u.*, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id',
    []
  );
  console.log('Users with order counts:', rawResult.rows);

  // Using QueryBuilder.raw directly
  const rawResult2 = await QueryBuilder.raw(
    connection,
    'SELECT * FROM users WHERE created_at > ?',
    [new Date('2024-01-01')]
  );
  console.log('Recent users:', rawResult2.rows);

  // ============================================
  // Complex Query Example
  // ============================================
  const complexQuery = new QueryBuilder('users', connection);
  complexQuery
    .select(['users.*', 'COUNT(orders.id) as order_count', 'SUM(orders.total) as total_spent'])
    .leftJoin('orders', { left: 'users.id', right: 'orders.user_id' })
    .where('users.status', '=', 'active')
    .whereIn('users.role', ['customer', 'premium'])
    .whereNotNull('users.email')
    .whereBetween('users.created_at', new Date('2023-01-01'), new Date('2024-12-31'))
    .groupBy('users.id')
    .having('COUNT(orders.id)', '>', 0)
    .orderBy('total_spent', 'DESC')
    .limit(10);

  const complexResult = await complexQuery.execute();
  console.log('Top 10 active customers:', complexResult.rows);

  await orm.disconnect();
}

// Uncomment to run examples
// examples().catch(console.error);

export {};

