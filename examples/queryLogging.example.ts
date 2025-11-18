/**
 * Example: Using Query Logging in GambitORM
 * 
 * This file demonstrates query logging and debugging features
 */

import { GambitORM, Model } from '../src';

// Example Model
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
}

async function queryLoggingExample() {
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

  console.log('=== Query Logging ===\n');

  // 1. Enable Query Logging
  console.log('1. Enable Query Logging:');
  orm.enableQueryLog({
    logToConsole: true,        // Log queries to console
    maxQueries: 1000,          // Keep last 1000 queries in memory
    slowQueryThreshold: 1000,  // Track queries slower than 1 second
  });
  console.log('Query logging enabled\n');

  // 2. Execute Queries (they will be logged)
  console.log('2. Execute Queries:');
  await User.findAll();
  await User.findById(1);
  await User.create({ name: 'John', email: 'john@example.com' });
  await User.update({ name: 'John Updated' }, { id: 1 });
  await User.count();
  console.log('Queries executed\n');

  // 3. Get Query Log
  console.log('3. Get Query Log:');
  const queries = orm.getQueryLog();
  console.log(`Total queries logged: ${queries.length}`);
  queries.forEach((query, index) => {
    console.log(`Query ${index + 1}:`);
    console.log(`  SQL: ${query.sql.substring(0, 50)}...`);
    console.log(`  Execution time: ${query.executionTime}ms`);
    console.log(`  Timestamp: ${query.timestamp}`);
    if (query.result) {
      console.log(`  Rows: ${query.result.rowCount ?? 'N/A'}`);
    }
    if (query.error) {
      console.log(`  Error: ${query.error.message}`);
    }
    console.log('');
  });

  // 4. Get Slow Queries
  console.log('4. Get Slow Queries:');
  const slowQueries = orm.getSlowQueries();
  console.log(`Slow queries: ${slowQueries.length}`);
  if (slowQueries.length > 0) {
    slowQueries.forEach((query, index) => {
      console.log(`Slow Query ${index + 1}: ${query.executionTime}ms`);
      console.log(`  SQL: ${query.sql.substring(0, 100)}...`);
    });
  }
  console.log('');

  // 5. Get Query Statistics
  console.log('5. Get Query Statistics:');
  const stats = orm.getQueryStats();
  console.log(`Total queries: ${stats.totalQueries}`);
  console.log(`Total execution time: ${stats.totalExecutionTime}ms`);
  console.log(`Average execution time: ${stats.averageExecutionTime.toFixed(2)}ms`);
  console.log(`Slow queries: ${stats.slowQueries}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');

  // 6. Get Last Query
  console.log('6. Get Last Query:');
  const lastQuery = orm.getLastQuery();
  if (lastQuery) {
    console.log(`Last query: ${lastQuery.sql.substring(0, 50)}...`);
    console.log(`Execution time: ${lastQuery.executionTime}ms`);
    console.log(`Timestamp: ${lastQuery.timestamp}`);
  }
  console.log('');

  // 7. Query with Parameters
  console.log('7. Query with Parameters:');
  await User.findAll({ where: { name: 'John' } });
  const queriesWithParams = orm.getQueryLog();
  const lastQueryWithParams = queriesWithParams[queriesWithParams.length - 1];
  if (lastQueryWithParams.params) {
    console.log(`Query parameters: ${JSON.stringify(lastQueryWithParams.params)}`);
  }
  console.log('');

  // 8. Clear Query Log
  console.log('8. Clear Query Log:');
  console.log(`Queries before clear: ${orm.getQueryLog().length}`);
  orm.clearQueryLog();
  console.log(`Queries after clear: ${orm.getQueryLog().length}`);
  console.log('');

  // 9. Disable Query Logging
  console.log('9. Disable Query Logging:');
  orm.disableQueryLog();
  await User.findAll(); // This query won't be logged
  console.log(`Queries after disable: ${orm.getQueryLog().length}`);
  console.log('');

  // 10. Re-enable with Different Options
  console.log('10. Re-enable with Different Options:');
  orm.enableQueryLog({
    logToConsole: false,      // Don't log to console
    maxQueries: 100,          // Keep only last 100 queries
    slowQueryThreshold: 500,  // Track queries slower than 500ms
  });
  await User.findAll();
  console.log(`Queries after re-enable: ${orm.getQueryLog().length}`);
  console.log('');

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  queryLoggingExample().catch(console.error);
}

export { queryLoggingExample };

