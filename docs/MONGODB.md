# MongoDB Guide

Complete guide for using GambitORM with MongoDB.

## Overview

GambitORM supports MongoDB using native MongoDB operations (not SQL). The ORM automatically detects MongoDB and uses the appropriate query builder.

## Key Differences from SQL Databases

1. **No SQL**: MongoDB uses its own query language
2. **Collections**: MongoDB uses collections (equivalent to tables)
3. **Documents**: MongoDB stores documents (JSON objects)
4. **ObjectId**: MongoDB uses `_id` (automatically converted to `id` in models)
5. **Schema-less**: No fixed schema (but validation still works)

## Connection

```typescript
import { GambitORM } from 'gambitorm';

const orm = new GambitORM({
  host: 'localhost',
  port: 27017,
  database: 'mydb',
  dialect: 'mongodb',
});

await orm.connect();
```

### Connection String

You can also provide a full MongoDB connection string:

```typescript
const orm = new GambitORM({
  host: 'mongodb://user:password@localhost:27017/mydb?authSource=admin',
  database: 'mydb',
  dialect: 'mongodb',
});
```

## Models

Models work the same way as SQL databases:

```typescript
import { Model } from 'gambitorm';

class User extends Model {
  static tableName = 'users'; // MongoDB collection name
  id!: string; // ObjectId converted to string
  name!: string;
  email!: string;
  age?: number;
}

Model.setConnection(orm.getConnection());
```

## CRUD Operations

### Create

```typescript
// Using Model API
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

// MongoDB automatically generates _id
console.log(user.id); // ObjectId as string
```

### Read

```typescript
// Find all
const users = await User.findAll();

// Find by ID
const user = await User.findById('507f1f77bcf86cd799439011');

// Find one with conditions
const user = await User.findOne({ email: 'john@example.com' });

// With options
const users = await User.findAll({
  where: { status: 'active' },
  orderBy: 'name',
  limit: 10,
});
```

### Update

```typescript
const user = await User.findById(id);
await user.update({ name: 'Jane Doe' });
```

### Delete

```typescript
const user = await User.findById(id);
await user.delete();
```

## Native MongoDB Operations

For complex queries, use the MongoDBHelper:

```typescript
import { MongoDBHelper } from 'gambitorm';

const connection = orm.getConnection();
const mongoHelper = connection.getMongoDBHelper();
```

### Find Operations

```typescript
// Simple find
const users = await mongoHelper.find('users', { status: 'active' });

// Complex queries with MongoDB operators
const users = await mongoHelper.find('users', {
  age: { $gte: 18, $lte: 65 },
  status: { $in: ['active', 'pending'] },
  email: { $regex: /@example\.com$/ }
});

// With options
const users = await mongoHelper.find('users', 
  { status: 'active' },
  {
    sort: { name: 1 },
    limit: 10,
    skip: 0,
    projection: { name: 1, email: 1 }
  }
);
```

### Insert Operations

```typescript
// Insert one
const result = await mongoHelper.insertOne('users', {
  name: 'John',
  email: 'john@example.com',
  age: 30
});
console.log(result.insertedId);

// Insert many
const result = await mongoHelper.insertMany('users', [
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
]);
console.log(result.insertedCount);
```

### Update Operations

```typescript
// Update one
await mongoHelper.updateOne(
  'users',
  { email: 'john@example.com' },
  { $set: { age: 31 } }
);

// Update many
await mongoHelper.updateMany(
  'users',
  { status: 'inactive' },
  { 
    $set: { lastLogin: new Date() },
    $inc: { loginCount: 1 }
  }
);
```

### Delete Operations

```typescript
// Delete one
await mongoHelper.deleteOne('users', { email: 'john@example.com' });

// Delete many
await mongoHelper.deleteMany('users', { status: 'inactive' });
```

### Count

```typescript
const count = await mongoHelper.count('users', { status: 'active' });
```

## Direct Collection Access

For advanced operations like aggregation:

```typescript
const collection = mongoHelper.collection('users');

// Aggregation pipeline
const pipeline = [
  { $match: { status: 'active' } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
];

const result = await collection?.aggregate(pipeline).toArray();

// Index operations
await collection?.createIndex({ email: 1 }, { unique: true });
```

## MongoDB Query Operators

Common MongoDB operators you can use:

- `$eq` - Equal
- `$ne` - Not equal
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - In array
- `$nin` - Not in array
- `$and` - Logical AND
- `$or` - Logical OR
- `$not` - Logical NOT
- `$exists` - Field exists
- `$regex` - Regular expression
- `$text` - Text search

## Transactions

MongoDB transactions require a replica set or sharded cluster:

```typescript
// Automatic transaction
await orm.transaction(async (tx) => {
  await User.create({ name: 'John', email: 'john@example.com' });
  await User.create({ name: 'Jane', email: 'jane@example.com' });
  // Automatically commits or rolls back
});

// Manual transaction
const tx = await orm.beginTransaction();
try {
  await User.create({ name: 'John' });
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

## Validation

Validation works the same as SQL databases:

```typescript
import { RequiredValidator, EmailValidator } from 'gambitorm';

class User extends Model {
  static tableName = 'users';
  static validationRules = {
    name: [new RequiredValidator()],
    email: [new RequiredValidator(), new EmailValidator()],
    age: [new MinValidator(18), new MaxValidator(120)],
  };
}
```

## Hooks

Hooks work the same way:

```typescript
import { HookEvent } from 'gambitorm';

User.hook(HookEvent.BEFORE_SAVE, async (user) => {
  user.updatedAt = new Date();
});

User.hook(HookEvent.AFTER_CREATE, async (user) => {
  console.log('User created:', user.name);
});
```

## Relationships

Relationships work with MongoDB, but use references:

```typescript
class User extends Model {
  static tableName = 'users';
  id!: string;
  name!: string;
  
  posts() {
    return this.hasMany(Post, { foreignKey: 'userId' });
  }
}

class Post extends Model {
  static tableName = 'posts';
  id!: string;
  userId!: string;
  title!: string;
  
  user() {
    return this.belongsTo(User, { foreignKey: 'userId' });
  }
}
```

## Best Practices

1. **Use indexes** for frequently queried fields
2. **Use projections** to limit returned fields
3. **Use aggregation** for complex queries
4. **Handle ObjectId conversion** (automatic in models)
5. **Use transactions** for multi-document operations
6. **Validate data** before saving
7. **Use MongoDBHelper** for complex queries
8. **Monitor query performance** with explain()

## Migration Notes

MongoDB doesn't use traditional migrations like SQL databases. Instead:

- Collections are created automatically on first insert
- Indexes can be created manually or in application code
- Schema changes don't require migrations (schema-less)

For index management:

```typescript
const collection = mongoHelper.collection('users');
await collection?.createIndex({ email: 1 }, { unique: true });
await collection?.createIndex({ status: 1, createdAt: -1 });
```

## Example: Complete MongoDB App

```typescript
import { GambitORM, Model, MongoDBHelper } from 'gambitorm';

class User extends Model {
  static tableName = 'users';
  id!: string;
  name!: string;
  email!: string;
  age?: number;
}

const orm = new GambitORM({
  host: 'localhost',
  port: 27017,
  database: 'mydb',
  dialect: 'mongodb',
});

await orm.connect();
Model.setConnection(orm.getConnection());

// Create user
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
});

// Find with MongoDB query
const mongoHelper = orm.getConnection().getMongoDBHelper();
const activeUsers = await mongoHelper.find('users', {
  age: { $gte: 18 },
  status: 'active'
});

// Aggregation
const collection = mongoHelper.collection('users');
const stats = await collection?.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
]).toArray();

await orm.disconnect();
```

