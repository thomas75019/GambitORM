# GambitORM Usage Examples

Comprehensive usage examples for GambitORM.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic CRUD Operations](#basic-crud-operations)
- [Query Building](#query-building)
- [Relationships](#relationships)
- [Migrations](#migrations)
- [Validation](#validation)
- [Hooks](#hooks)
- [Transactions](#transactions)
- [Advanced Queries](#advanced-queries)

---

## Getting Started

### Installation

```bash
npm install gambitorm
```

### Basic Setup

```typescript
import { GambitORM, Model } from 'gambitorm';

// Initialize ORM
const orm = new GambitORM({
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  user: 'root',
  password: 'password',
  dialect: 'mysql',
});

// Connect
await orm.connect();

// Define a model
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
}

// Set connection for models
Model.setConnection(orm.getConnection());

// Disconnect when done
await orm.disconnect();
```

---

## Basic CRUD Operations

### Create

```typescript
// Using Model.create()
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
});

// Using instance.save()
const user = new User();
user.name = 'Jane Doe';
user.email = 'jane@example.com';
await user.save();
```

### Read

```typescript
// Find all
const users = await User.findAll();

// Find by ID
const user = await User.findById(1);

// Find one with conditions
const user = await User.findOne({ email: 'john@example.com' });

// With options
const users = await User.findAll({
  where: { status: 'active' },
  orderBy: 'name',
  limit: 10,
  offset: 0,
});
```

### Update

```typescript
// Using instance.update()
const user = await User.findById(1);
await user.update({ name: 'John Updated' });

// Using instance.save()
user.name = 'John Updated';
await user.save();
```

### Delete

```typescript
const user = await User.findById(1);
await user.delete();
```

---

## Query Building

### Basic Queries

```typescript
import { QueryBuilder } from 'gambitorm';

const query = new QueryBuilder('users', connection);
query
  .select(['id', 'name', 'email'])
  .where('status', '=', 'active')
  .orderBy('name', 'ASC')
  .limit(10);

const result = await query.execute();
```

### Joins

```typescript
const query = new QueryBuilder('users', connection);
query
  .select(['users.*', 'profiles.bio'])
  .leftJoin('profiles', { left: 'users.id', right: 'profiles.user_id' })
  .where('users.status', '=', 'active');

const result = await query.execute();
```

### Aggregates

```typescript
// Count
const countQuery = new QueryBuilder('users', connection);
countQuery.count('*', 'total');
const count = await countQuery.execute();

// Sum
const sumQuery = new QueryBuilder('orders', connection);
sumQuery.sum('total', 'revenue');
const revenue = await sumQuery.execute();

// Group by
const groupQuery = new QueryBuilder('orders', connection);
groupQuery
  .select(['user_id', 'SUM(total) as total_spent'])
  .groupBy('user_id')
  .having('SUM(total)', '>', 1000);
const results = await groupQuery.execute();
```

### Advanced WHERE Conditions

```typescript
const query = new QueryBuilder('users', connection);
query
  .whereIn('id', [1, 2, 3, 4, 5])
  .whereNotNull('email')
  .whereBetween('age', 18, 65)
  .whereLike('name', '%John%')
  .orWhere('status', '=', 'pending');
```

### Subqueries

```typescript
// Create subquery
const subquery = QueryBuilder.subquery('orders', connection);
subquery.select(['user_id']).where('total', '>', 1000);

// Use in main query
const query = new QueryBuilder('users', connection);
query.whereSubquery('id', 'IN', subquery);
```

---

## Relationships

### Defining Relationships

```typescript
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;

  // Has one profile
  profile() {
    return this.hasOne(Profile, { foreignKey: 'user_id' });
  }

  // Has many posts
  posts() {
    return this.hasMany(Post, { foreignKey: 'user_id' });
  }
}

class Profile extends Model {
  static tableName = 'profiles';
  id!: number;
  user_id!: number;
  bio!: string;

  // Belongs to user
  user() {
    return this.belongsTo(User, { foreignKey: 'user_id' });
  }
}
```

### Loading Relationships

```typescript
// Lazy loading
const user = await User.findById(1);
const profile = await user.profile().load();
const posts = await user.posts().load();

// Eager loading
const user = await User.findById(1, { include: ['profile', 'posts'] });
const users = await User.findAll({ include: ['profile'] });
```

---

## Migrations

### Creating Migrations

```bash
gambit migrate:create create_users_table
```

### Migration File

```typescript
import { Migration } from 'gambitorm';

export class CreateUsersTable extends Migration {
  async up(): Promise<void> {
    await this.schema('users')
      .id()
      .string('name')
      .string('email', 255)
      .unique()
      .notNull()
      .timestamp('created_at')
      .timestamp('updated_at')
      .create();
  }

  async down(): Promise<void> {
    await this.schema('users').drop();
  }

  getName(): string {
    return 'create_users_table';
  }
}
```

### Running Migrations

```bash
# Run migrations
gambit migrate

# Check status
gambit migrate:status

# Rollback
gambit migrate:rollback

# Rollback all
gambit migrate:rollback --all
```

### Programmatic Migrations

```typescript
import { CreateUsersTable } from './migrations/CreateUsersTable';

await orm.migrate([CreateUsersTable]);
const status = await orm.migrationStatus([CreateUsersTable]);
```

---

## Validation

### Defining Validation Rules

```typescript
import { RequiredValidator, EmailValidator, MinLengthValidator } from 'gambitorm';

class User extends Model {
  static tableName = 'users';
  static validationRules = {
    name: [
      new RequiredValidator('Name is required'),
      new MinLengthValidator(3, 'Name must be at least 3 characters'),
    ],
    email: [
      new RequiredValidator('Email is required'),
      new EmailValidator('Email must be valid'),
    ],
  };
}
```

### Custom Validators

```typescript
import { CustomValidator } from 'gambitorm';

class User extends Model {
  static tableName = 'users';
  static validationRules = {
    password: [
      new RequiredValidator(),
      new MinLengthValidator(8),
      new CustomValidator(
        (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value),
        'Password must contain uppercase, lowercase, and number'
      ),
    ],
  };
}
```

### Validation Usage

```typescript
// Automatic validation on save/create/update
try {
  await User.create({ name: 'Jo', email: 'invalid' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.errors);
  }
}

// Manual validation
const user = new User();
user.name = 'John';
await user.validate();

// Skip validation
await user.save({ skipValidation: true });
```

---

## Hooks

### Registering Hooks

```typescript
// Before save
User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  user.updated_at = new Date();
  if (!user.id) {
    user.created_at = new Date();
  }
});

// After create
User.hook(HookEvent.AFTER_CREATE, async (user) => {
  console.log(`User created: ${user.name}`);
  // Send welcome email, etc.
});

// Before delete
User.hook(HookEvent.BEFORE_DELETE, async (user) => {
  if (user.email === 'admin@example.com') {
    throw new Error('Cannot delete admin user');
  }
});
```

### Hook Priority

```typescript
// Lower priority runs first
User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  console.log('First');
}, 10);

User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  console.log('Second');
}, 50);

User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  console.log('Third');
}, 100);
```

---

## Transactions

### Manual Transaction Management

```typescript
const transaction = await orm.beginTransaction();

try {
  await User.create({ name: 'John', email: 'john@example.com' });
  await Post.create({ title: 'My Post', user_id: 1 });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### Automatic Transaction Management

```typescript
await orm.transaction(async (tx) => {
  await User.create({ name: 'John', email: 'john@example.com' });
  await Post.create({ title: 'My Post', user_id: 1 });
  // Automatically commits or rolls back
});
```

### Using Connection Directly

```typescript
const connection = orm.getConnection();
await connection.beginTransaction();
try {
  await connection.query('UPDATE users SET balance = balance - 100 WHERE id = 1');
  await connection.query('UPDATE users SET balance = balance + 100 WHERE id = 2');
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}
```

---

## Advanced Queries

### Complex Queries

```typescript
const query = new QueryBuilder('users', connection);
query
  .select(['users.*', 'COUNT(orders.id) as order_count'])
  .leftJoin('orders', { left: 'users.id', right: 'orders.user_id' })
  .where('users.status', '=', 'active')
  .whereIn('users.role', ['customer', 'premium'])
  .whereNotNull('users.email')
  .whereBetween('users.created_at', new Date('2023-01-01'), new Date('2024-12-31'))
  .groupBy('users.id')
  .having('COUNT(orders.id)', '>', 0)
  .orderBy('order_count', 'DESC')
  .limit(10);

const results = await query.execute();
```

### Raw SQL

```typescript
// Using ORM
const result = await orm.raw(
  'SELECT * FROM users WHERE created_at > ?',
  [new Date('2024-01-01')]
);

// Using QueryBuilder
const result = await QueryBuilder.raw(
  connection,
  'SELECT * FROM users WHERE id = ?',
  [1]
);
```

---

## Best Practices

1. **Always use transactions for multiple related operations**
2. **Validate data before saving**
3. **Use eager loading to avoid N+1 queries**
4. **Use parameterized queries (automatic with QueryBuilder)**
5. **Handle errors appropriately**
6. **Close connections when done**
7. **Use migrations for schema changes**
8. **Define relationships explicitly**

