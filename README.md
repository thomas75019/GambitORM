# GambitORM

[![npm version](https://badge.fury.io/js/gambitorm.svg)](https://badge.fury.io/js/gambitorm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![Build Status](https://github.com/your-username/GambitORM/workflows/CI/badge.svg)](https://github.com/your-username/GambitORM/actions)

A modern, type-safe ORM for Node.js built with TypeScript.

## Features

- 🚀 Type-safe database queries
- 📦 Lightweight and performant
- 🔧 Flexible query builder
- 🎯 Model-based approach
- 🔄 Migration support
- 💪 Full TypeScript support
- 🔗 Relationship support (hasOne, hasMany, belongsTo)
- ⚡ Eager loading
- 🔀 Join queries
- 💼 Transaction support
- ✅ Model validation with custom validators
- 🎣 Lifecycle hooks (beforeSave, afterSave, beforeDelete, etc.)
- 🛠️ CLI tool for migration management
- 🔍 Advanced query methods (whereIn, whereNull, whereBetween, subqueries, raw SQL)
- 🍃 MongoDB support with native operations
- 🗑️ Soft deletes support

## Installation

```bash
npm install gambitorm
```

### Optional Database Drivers

**SQLite Support:**
```bash
npm install better-sqlite3
```

**Note for Windows users:** `better-sqlite3` requires native compilation. You'll need:
- Visual Studio Build Tools with "Desktop development with C++" workload
- Windows SDK

**MongoDB Support:**
MongoDB support is included by default. The `mongodb` package is already in dependencies.

If you don't need SQLite support, you can skip it. MySQL, PostgreSQL, and MongoDB will work without it.

## Quick Start

```typescript
import { GambitORM, Model } from 'gambitorm';

// Define your model
class User extends Model {
  static tableName = 'users';
  
  id!: number;
  name!: string;
  email!: string;
}

// Initialize the ORM
const orm = new GambitORM({
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  user: 'user',
  password: 'password',
  dialect: 'mysql',
});

await orm.connect();

// Use your model
const users = await User.findAll();
const user = await User.findById(1);
```

## Relationships

GambitORM supports three types of relationships:

### HasOne

```typescript
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
}

class Profile extends Model {
  static tableName = 'profiles';
  id!: number;
  user_id!: number;
  bio!: string;
}

// Load a user's profile
const user = await User.findById(1);
const profile = await user.hasOne(Profile, 'user_id').load();
```

### HasMany

```typescript
class Post extends Model {
  static tableName = 'posts';
  id!: number;
  user_id!: number;
  title!: string;
}

// Load a user's posts
const user = await User.findById(1);
const posts = await user.hasMany(Post, 'user_id').load();
```

### BelongsTo

```typescript
// Load the author of a post
const post = await Post.findById(1);
const author = await post.belongsTo(User, 'user_id').load();
```

## Join Queries

Use the QueryBuilder for complex join queries:

```typescript
import { QueryBuilder } from 'gambitorm';

const connection = orm.getConnection();
const query = new QueryBuilder('users', connection)
  .select(['users.*', 'profiles.bio'])
  .leftJoin('profiles', { left: 'users.id', right: 'profiles.user_id' })
  .where('users.active', '=', true)
  .orderBy('users.name', 'ASC')
  .limit(10);

const result = await query.execute();
```

## Eager Loading

Load relationships when fetching models:

```typescript
// Load users with their profiles (basic support)
const users = await User.findAll({ include: ['profile'] });
const user = await User.findById(1, { include: ['profile', 'posts'] });
```

## Transactions

GambitORM supports database transactions for atomic operations:

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

### Automatic Transaction Management (Recommended)

```typescript
// Automatically commits on success or rolls back on error
await orm.transaction(async (tx) => {
  await User.create({ name: 'John', email: 'john@example.com' });
  await Post.create({ title: 'My Post', user_id: 1 });
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

## Validation

GambitORM supports model validation before save/update operations:

### Basic Validation

```typescript
import { Model, RequiredValidator, EmailValidator, MinLengthValidator } from 'gambitorm';

class User extends Model {
  static tableName = 'users';
  
  // Define validation rules
  static validationRules = {
    name: [
      new RequiredValidator('Name is required'),
      new MinLengthValidator(3, 'Name must be at least 3 characters'),
    ],
    email: [
      new RequiredValidator(),
      new EmailValidator('Email must be valid'),
    ],
  };

  id!: number;
  name!: string;
  email!: string;
}

// Validation runs automatically on create, save, and update
try {
  await User.create({ name: 'Jo', email: 'invalid' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors);
  }
}
```

### Built-in Validators

- `RequiredValidator` - Field is required
- `EmailValidator` - Valid email format
- `MinLengthValidator` / `MaxLengthValidator` - String length constraints
- `MinValidator` / `MaxValidator` - Numeric value constraints
- `TypeValidator` - Type checking (string, number, boolean, date, array, object)
- `CustomValidator` - Custom validation function (supports async)

### Custom Validators

```typescript
import { CustomValidator } from 'gambitorm';

class Product extends Model {
  static tableName = 'products';
  
  static validationRules = {
    sku: [
      new RequiredValidator(),
      new CustomValidator(
        (value) => /^[A-Z0-9-]+$/.test(value),
        'SKU must contain only uppercase letters, numbers, and hyphens'
      ),
    ],
    price: [
      new CustomValidator(
        async (value) => {
          // Async validation example
          const isValid = await checkPriceFromAPI(value);
          return isValid;
        },
        'Price validation failed'
      ),
    ],
  };
}
```

### Skip Validation

```typescript
// Skip validation when needed
await user.save({ skipValidation: true });
await User.create(data, { skipValidation: true });
await user.update(data, { skipValidation: true });
```

### Manual Validation

```typescript
const user = new User();
user.name = 'John';
user.email = 'john@example.com';

try {
  await user.validate();
  console.log('Validation passed');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Errors:', error.errors);
    console.error('Field errors:', error.getFieldErrors('name'));
  }
}
```

## Lifecycle Hooks

GambitORM supports lifecycle hooks for models to execute code at specific points:

### Available Hooks

- `beforeSave` / `afterSave` - Before/after save (create or update)
- `beforeCreate` / `afterCreate` - Before/after creating a new record
- `beforeUpdate` / `afterUpdate` - Before/after updating a record
- `beforeDelete` / `afterDelete` - Before/after deleting a record
- `beforeValidate` / `afterValidate` - Before/after validation

### Basic Usage

```typescript
import { Model, HookEvent } from 'gambitorm';

class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
  created_at?: Date;
  updated_at?: Date;
}

// Register hooks
User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  user.updated_at = new Date();
  if (!user.id) {
    user.created_at = new Date();
  }
});

User.hook(HookEvent.AFTER_CREATE, async (user) => {
  console.log(`User created: ${user.name}`);
  // Send welcome email, etc.
});

User.hook(HookEvent.BEFORE_DELETE, async (user) => {
  if (user.email === 'admin@example.com') {
    throw new Error('Cannot delete admin user');
  }
});

// Hooks are automatically executed
const user = await User.create({ name: 'John', email: 'john@example.com' });
await user.save();
await user.delete();
```

### Hook Priority

Hooks can have priorities (lower numbers run first):

```typescript
User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  console.log('Runs first');
}, 10);

User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  console.log('Runs second');
}, 50);

User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  console.log('Runs last (default priority 100)');
});
```

### Managing Hooks

```typescript
const myHook = async (user: User) => {
  console.log('My hook');
};

// Register
User.hook(HookEvent.BEFORE_SAVE, myHook);

// Unregister
User.unhook(HookEvent.BEFORE_SAVE, myHook);

// Clear all hooks for an event
User.clearHooks(HookEvent.BEFORE_SAVE);
```

## CLI Tool

GambitORM includes a CLI tool for managing migrations:

### Installation

After installing GambitORM, the `gambit` command is available:

```bash
npm install -g gambitorm
# or use npx
npx gambitorm
```

### Configuration

Create a `.gambitorm.json` file in your project root:

```json
{
  "host": "localhost",
  "port": 3306,
  "database": "mydb",
  "user": "root",
  "password": "password",
  "dialect": "mysql"
}
```

### Commands

#### Run Migrations

```bash
gambit migrate
```

Runs all pending migrations.

#### Rollback Migrations

```bash
# Rollback last batch
gambit migrate:rollback

# Rollback all migrations
gambit migrate:rollback --all
```

#### Check Migration Status

```bash
gambit migrate:status
```

Shows which migrations have been executed and which are pending.

#### Create Migration

```bash
gambit migrate:create create_users_table
```

Creates a new migration file in the `migrations` directory:

```typescript
import { Migration } from 'gambitorm';

export class CreateUsersTable extends Migration {
  async up(): Promise<void> {
    await this.schema('users')
      .id()
      .string('name')
      .string('email')
      .timestamp('created_at')
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

### Custom Config Path

```bash
gambit migrate --config ./config/database.json
```

## Advanced QueryBuilder Features

### Additional WHERE Methods

```typescript
import { QueryBuilder } from 'gambitorm';

const query = new QueryBuilder('users', connection);

// WHERE IN / NOT IN
query.whereIn('id', [1, 2, 3]);
query.whereNotIn('status', ['deleted', 'banned']);

// WHERE NULL / NOT NULL
query.whereNull('deleted_at');
query.whereNotNull('email');

// WHERE BETWEEN / NOT BETWEEN
query.whereBetween('age', 18, 65);
query.whereNotBetween('salary', 0, 50000);

// WHERE LIKE / NOT LIKE
query.whereLike('email', '%@gmail.com');
query.whereNotLike('name', '%test%');

// OR WHERE
query.where('status', '=', 'active');
query.orWhere('status', '=', 'pending');

// Raw WHERE
query.whereRaw('(age > ? OR salary > ?) AND status = ?', [18, 50000, 'active']);
```

### Subqueries

```typescript
// Create a subquery
const subquery = QueryBuilder.subquery('orders', connection);
subquery.select(['user_id']).where('total', '>', 1000);

// Use in WHERE clause
const query = new QueryBuilder('users', connection);
query.whereSubquery('id', 'IN', subquery);

// Results in: SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE total > ?)
```

### Aggregate Functions

```typescript
// Count
query.count('*', 'total_users');
query.count('id', 'user_count');

// Sum, Average, Max, Min
query.sum('total', 'total_revenue');
query.avg('price', 'avg_price');
query.max('amount', 'max_amount');
query.min('amount', 'min_amount');
```

### Raw SQL Execution

```typescript
// Using ORM
const result = await orm.raw('SELECT * FROM users WHERE id = ?', [1]);

// Using QueryBuilder static method
const result = await QueryBuilder.raw(connection, 'SELECT * FROM users WHERE id = ?', [1]);
```

## Documentation

- [API Documentation](./docs/API.md) - Complete API reference
- [Usage Examples](./docs/USAGE.md) - Comprehensive usage examples
- [Migration Guide](./docs/MIGRATION_GUIDE.md) - Migrating from other ORMs
- [Best Practices](./docs/BEST_PRACTICES.md) - Best practices and guidelines
- [Contributing](./CONTRIBUTING.md) - How to contribute
- [Code of Conduct](./CODE_OF_CONDUCT.md) - Community guidelines
- [Changelog](./CHANGELOG.md) - Version history

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) before submitting pull requests.

## License

MIT

## Examples

### Model with Relationships

```typescript
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  
  profile() {
    return this.hasOne(Profile, { foreignKey: 'user_id' });
  }
  
  posts() {
    return this.hasMany(Post, { foreignKey: 'user_id' });
  }
}

class Post extends Model {
  static tableName = 'posts';
  id!: number;
  user_id!: number;
  title!: string;
  
  user() {
    return this.belongsTo(User, { foreignKey: 'user_id' });
  }
}

// Usage
const user = await User.findById(1, { include: ['profile', 'posts'] });
```

### Advanced Query

```typescript
const query = new QueryBuilder('users', connection);
query
  .select(['users.*', 'COUNT(orders.id) as order_count'])
  .leftJoin('orders', { left: 'users.id', right: 'orders.user_id' })
  .where('users.status', '=', 'active')
  .whereIn('users.role', ['customer', 'premium'])
  .whereNotNull('users.email')
  .groupBy('users.id')
  .having('COUNT(orders.id)', '>', 0)
  .orderBy('order_count', 'DESC')
  .limit(10);

const results = await query.execute();
```

### Migration Example

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

### Validation Example

```typescript
class User extends Model {
  static tableName = 'users';
  static validationRules = {
    name: [
      new RequiredValidator('Name is required'),
      new MinLengthValidator(3),
    ],
    email: [
      new RequiredValidator(),
      new EmailValidator('Invalid email'),
    ],
    age: [
      new TypeValidator('number'),
      new MinValidator(18),
      new MaxValidator(120),
    ],
  };
}
```

### Soft Deletes Example

```typescript
class User extends Model {
  static tableName = 'users';
  static softDeletes = true; // Enable soft deletes
  static deletedAt = 'deleted_at'; // Optional: customize field name
  
  id!: number;
  name!: string;
  email!: string;
  deleted_at?: Date | null;
}

// Soft delete (sets deleted_at instead of removing)
const user = await User.findById(1);
await user.delete(); // Sets deleted_at to current timestamp

// Find all (excludes soft-deleted by default)
const users = await User.findAll(); // Only non-deleted users

// Include soft-deleted records
const allUsers = await User.withTrashed().findAll();

// Only soft-deleted records
const deletedUsers = await User.onlyTrashed().findAll();

// Restore a soft-deleted record
await user.restore(); // Sets deleted_at to null

// Permanently delete (force delete)
await user.forceDelete(); // Actually removes from database
```

### Transaction Example

```typescript
// Automatic transaction
await orm.transaction(async (tx) => {
  const user = await User.create({ name: 'John', email: 'john@example.com' });
  await Profile.create({ user_id: user.id, bio: 'Developer' });
  // Automatically commits or rolls back on error
});

// Manual transaction
const tx = await orm.beginTransaction();
try {
  await User.create({ name: 'John' });
  await Profile.create({ user_id: 1 });
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/your-username/GambitORM/issues)
- 💬 [Discussions](https://github.com/your-username/GambitORM/discussions)

