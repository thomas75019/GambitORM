# GambitORM

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

## Installation

```bash
npm install gambitorm
```

### Optional: SQLite Support

For SQLite support, you need to install `better-sqlite3` separately:

```bash
npm install better-sqlite3
```

**Note for Windows users:** `better-sqlite3` requires native compilation. You'll need:
- Visual Studio Build Tools with "Desktop development with C++" workload
- Windows SDK

If you don't need SQLite support, you can skip this step. MySQL and PostgreSQL will work without it.

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

## Documentation

Coming soon...

## License

MIT

