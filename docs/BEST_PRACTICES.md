# Best Practices

Best practices for using GambitORM effectively.

## Table of Contents

- [Model Design](#model-design)
- [Query Optimization](#query-optimization)
- [Relationship Management](#relationship-management)
- [Validation](#validation)
- [Transactions](#transactions)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Security](#security)

---

## Model Design

### 1. Use TypeScript Types

Always define types for model properties:

```typescript
class User extends Model {
  static tableName = 'users';
  id!: number;           // ✅ Good
  name!: string;         // ✅ Good
  email!: string;        // ✅ Good
  // name: any;          // ❌ Bad - avoid any
}
```

### 2. Keep Models Focused

Each model should represent a single table:

```typescript
// ✅ Good
class User extends Model {
  static tableName = 'users';
}

class Profile extends Model {
  static tableName = 'profiles';
}

// ❌ Bad - don't mix concerns
class UserWithProfile extends Model {
  // ...
}
```

### 3. Use Meaningful Table Names

```typescript
// ✅ Good
static tableName = 'users';
static tableName = 'user_profiles';
static tableName = 'order_items';

// ❌ Bad
static tableName = 'tbl1';
static tableName = 'data';
```

---

## Query Optimization

### 1. Select Only Needed Fields

```typescript
// ✅ Good - select specific fields
query.select(['id', 'name', 'email']);

// ❌ Bad - selects all fields
query.select(['*']);
```

### 2. Use Indexes

Add indexes for frequently queried columns:

```typescript
// In migration
await this.schema('users')
  .string('email')
  .unique()  // Creates index
  .create();
```

### 3. Avoid N+1 Queries

```typescript
// ❌ Bad - N+1 queries
const users = await User.findAll();
for (const user of users) {
  const posts = await user.posts().load(); // Query per user
}

// ✅ Good - eager loading
const users = await User.findAll({ include: ['posts'] });
```

### 4. Use LIMIT and OFFSET

```typescript
// ✅ Good - pagination
query.limit(20).offset(0);

// ❌ Bad - loading all records
const all = await User.findAll();
```

### 5. Use WHERE Conditions Efficiently

```typescript
// ✅ Good - indexed column
query.where('id', '=', 1);

// ⚠️ Use with caution - may be slow
query.whereLike('name', '%search%');
```

---

## Relationship Management

### 1. Define Relationships Explicitly

```typescript
// ✅ Good - explicit foreign keys
class Post extends Model {
  user() {
    return this.belongsTo(User, { foreignKey: 'user_id' });
  }
}

// ❌ Bad - implicit relationships
// Don't rely on naming conventions
```

### 2. Use Eager Loading

```typescript
// ✅ Good
const users = await User.findAll({ include: ['profile', 'posts'] });

// ❌ Bad
const users = await User.findAll();
for (const user of users) {
  await user.profile().load();
}
```

### 3. Avoid Deep Nesting

```typescript
// ⚠️ Be careful with deep relationships
const users = await User.findAll({ 
  include: ['posts', 'posts.comments'] 
});
```

---

## Validation

### 1. Validate Early

```typescript
// ✅ Good - validate before save
await user.validate();
await user.save();

// ❌ Bad - skip validation
await user.save({ skipValidation: true });
```

### 2. Provide Clear Error Messages

```typescript
// ✅ Good
static validationRules = {
  email: [
    new RequiredValidator('Email is required'),
    new EmailValidator('Please provide a valid email address'),
  ],
};

// ❌ Bad
static validationRules = {
  email: [new RequiredValidator()],
};
```

### 3. Handle Validation Errors

```typescript
// ✅ Good
try {
  await User.create(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.error(error.errors);
  } else {
    throw error;
  }
}
```

---

## Transactions

### 1. Use Transactions for Related Operations

```typescript
// ✅ Good
await orm.transaction(async (tx) => {
  const user = await User.create({ name: 'John' });
  await Profile.create({ user_id: user.id, bio: '...' });
});

// ❌ Bad - no transaction
const user = await User.create({ name: 'John' });
await Profile.create({ user_id: user.id, bio: '...' });
// If profile creation fails, user remains orphaned
```

### 2. Keep Transactions Short

```typescript
// ✅ Good - short transaction
await orm.transaction(async (tx) => {
  await User.create(data);
  await Profile.create(data);
});

// ❌ Bad - long transaction
await orm.transaction(async (tx) => {
  await User.create(data);
  await someLongOperation(); // Don't do this
  await Profile.create(data);
});
```

### 3. Handle Transaction Errors

```typescript
// ✅ Good
try {
  await orm.transaction(async (tx) => {
    // operations
  });
} catch (error) {
  // Transaction automatically rolled back
  console.error('Transaction failed:', error);
}
```

---

## Error Handling

### 1. Handle Specific Errors

```typescript
// ✅ Good
try {
  await User.create(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation
  } else if (error.message.includes('connection')) {
    // Handle connection error
  } else {
    // Handle other errors
  }
}
```

### 2. Don't Swallow Errors

```typescript
// ❌ Bad
try {
  await User.create(data);
} catch (error) {
  // Silent failure
}

// ✅ Good
try {
  await User.create(data);
} catch (error) {
  console.error('Failed to create user:', error);
  throw error; // Or handle appropriately
}
```

### 3. Use Error Messages

```typescript
// ✅ Good
if (!connection.isConnected()) {
  throw new Error('Database connection not established');
}
```

---

## Performance

### 1. Use Connection Pooling

```typescript
// ✅ Good
const orm = new GambitORM({
  // ... config
  pool: {
    min: 2,
    max: 10,
  },
});
```

### 2. Batch Operations

```typescript
// ✅ Good - use transactions for batch inserts
await orm.transaction(async (tx) => {
  for (const data of usersData) {
    await User.create(data);
  }
});
```

### 3. Use Raw Queries for Complex Operations

```typescript
// ✅ Good - complex aggregation
const result = await orm.raw(`
  SELECT user_id, SUM(total) as total_spent
  FROM orders
  GROUP BY user_id
  HAVING SUM(total) > 1000
`);
```

### 4. Monitor Query Performance

```typescript
// Add logging in development
const start = Date.now();
const result = await query.execute();
console.log(`Query took ${Date.now() - start}ms`);
```

---

## Security

### 1. Use Parameterized Queries

```typescript
// ✅ Good - automatic with QueryBuilder
query.where('email', '=', userEmail);

// ❌ Bad - SQL injection risk
query.whereRaw(`email = '${userEmail}'`);
```

### 2. Validate Input

```typescript
// ✅ Good
static validationRules = {
  email: [new EmailValidator()],
  age: [new MinValidator(0), new MaxValidator(120)],
};
```

### 3. Don't Expose Sensitive Data

```typescript
// ✅ Good
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  // Don't include password in model if not needed
}

// ❌ Bad
class User extends Model {
  password!: string; // Exposed in model
}
```

### 4. Use Environment Variables

```typescript
// ✅ Good
const orm = new GambitORM({
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
});

// ❌ Bad
const orm = new GambitORM({
  password: 'hardcoded-password',
});
```

---

## Code Organization

### 1. Organize Models

```
models/
  User.ts
  Post.ts
  Profile.ts
```

### 2. Organize Migrations

```
migrations/
  20240101_create_users.ts
  20240102_create_posts.ts
```

### 3. Use Constants

```typescript
// ✅ Good
const TABLE_NAMES = {
  USERS: 'users',
  POSTS: 'posts',
};

class User extends Model {
  static tableName = TABLE_NAMES.USERS;
}
```

### 4. Document Complex Queries

```typescript
// ✅ Good
/**
 * Finds active users with completed orders
 * Uses subquery to filter users who have at least one completed order
 */
const subquery = QueryBuilder.subquery('orders', connection);
subquery.select(['user_id']).where('status', '=', 'completed');

const query = new QueryBuilder('users', connection);
query.whereSubquery('id', 'IN', subquery);
```

---

## Testing

### 1. Use Test Database

```typescript
// In tests
const testORM = new GambitORM({
  database: 'test_db',
  // ...
});
```

### 2. Clean Up After Tests

```typescript
afterEach(async () => {
  await orm.raw('TRUNCATE TABLE users');
});
```

### 3. Test Transactions

```typescript
it('should rollback on error', async () => {
  await expect(
    orm.transaction(async (tx) => {
      await User.create(data1);
      throw new Error('Test error');
    })
  ).rejects.toThrow();
  
  const count = await User.findAll();
  expect(count.length).toBe(0);
});
```

---

## Summary

1. **Design models properly** - Use TypeScript, keep focused
2. **Optimize queries** - Select needed fields, use indexes, avoid N+1
3. **Manage relationships** - Use eager loading, define explicitly
4. **Validate data** - Validate early, provide clear messages
5. **Use transactions** - For related operations, keep short
6. **Handle errors** - Specifically, don't swallow
7. **Consider performance** - Use pooling, batch operations
8. **Secure your code** - Parameterized queries, validate input
9. **Organize code** - Structure files, use constants
10. **Test thoroughly** - Use test database, clean up

