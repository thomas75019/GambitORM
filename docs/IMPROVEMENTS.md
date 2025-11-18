# GambitORM Improvement Roadmap

This document outlines potential improvements to enhance GambitORM's functionality, performance, and developer experience.

## 🚀 High Priority Features

### 1. **Soft Deletes**
Allow models to be "soft deleted" instead of permanently removed from the database.

**Implementation:**
- Add `deletedAt` timestamp field automatically
- Override `delete()` to set `deletedAt` instead of removing
- Add `withTrashed()`, `onlyTrashed()`, `restore()` methods
- Automatically filter soft-deleted records in queries

**Example:**
```typescript
class User extends Model {
  static tableName = 'users';
  static softDeletes = true; // Enable soft deletes
}

await user.delete(); // Sets deletedAt instead of removing
const users = await User.findAll(); // Automatically excludes soft-deleted
const allUsers = await User.withTrashed().findAll(); // Includes soft-deleted
await user.restore(); // Restores soft-deleted record
```

### 2. **Automatic Timestamps**
Automatically manage `created_at` and `updated_at` timestamps.

**Implementation:**
- Add `timestamps: true` option to models
- Automatically set `created_at` on create
- Automatically update `updated_at` on save/update
- Configurable field names (`createdAt` vs `created_at`)

**Example:**
```typescript
class User extends Model {
  static tableName = 'users';
  static timestamps = true; // Auto-manage created_at and updated_at
  // Or customize:
  // static createdAt = 'created_at';
  // static updatedAt = 'updated_at';
}
```

### 3. **Model Scopes**
Reusable query constraints that can be chained.

**Implementation:**
- Define static scope methods on models
- Chain scopes together
- Global scopes (always applied)
- Local scopes (applied when called)

**Example:**
```typescript
class User extends Model {
  static tableName = 'users';
  
  // Local scope
  static active() {
    return this.where('status', '=', 'active');
  }
  
  static verified() {
    return this.where('email_verified', '=', true);
  }
  
  // Global scope (always applied)
  static boot() {
    this.addGlobalScope('published', (query) => {
      query.where('published', '=', true);
    });
  }
}

// Usage
const activeUsers = await User.active().findAll();
const verifiedActive = await User.active().verified().findAll();
```

### 4. **Batch Operations**
Efficient bulk insert, update, and delete operations.

**Implementation:**
- `Model.bulkInsert(data[])` - Insert multiple records
- `Model.bulkUpdate(conditions, updates)` - Update multiple records
- `Model.bulkDelete(conditions)` - Delete multiple records
- Transaction support for batch operations

**Example:**
```typescript
// Bulk insert
await User.bulkInsert([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
]);

// Bulk update
await User.bulkUpdate(
  { status: 'inactive' },
  { lastLogin: new Date() }
);

// Bulk delete
await User.bulkDelete({ status: 'banned' });
```

### 5. **Query Result Caching**
Cache query results to improve performance.

**Implementation:**
- Configurable cache TTL
- Cache invalidation on model changes
- Support for Redis or in-memory cache
- Cache tags for selective invalidation

**Example:**
```typescript
// Cache query results
const users = await User.cache(3600).findAll(); // Cache for 1 hour
const user = await User.cache('user:1', 1800).findById(1);

// Invalidate cache
await User.clearCache();
await User.clearCache('user:1');
```

## 📊 Medium Priority Features

### 6. **Many-to-Many Relationships**
Support for pivot tables and many-to-many relationships.

**Implementation:**
- `belongsToMany()` relationship method
- Pivot table management
- Attach/detach/sync methods
- Pivot table data access

**Example:**
```typescript
class User extends Model {
  roles() {
    return this.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });
  }
}

const user = await User.findById(1);
await user.roles().attach([1, 2, 3]); // Attach roles
await user.roles().detach([1]); // Detach role
await user.roles().sync([2, 3]); // Sync roles (replace all)
const roles = await user.roles().get(); // Get related roles
```

### 7. **Polymorphic Relationships**
Support for relationships where a model can belong to multiple other models.

**Implementation:**
- `morphTo()` and `morphMany()` relationship types
- Polymorphic associations

**Example:**
```typescript
class Comment extends Model {
  commentable() {
    return this.morphTo('commentable', 'commentable_type', 'commentable_id');
  }
}

class Post extends Model {
  comments() {
    return this.morphMany(Comment, 'commentable');
  }
}
```

### 8. **Database Seeding**
CLI tool for seeding databases with test data.

**Implementation:**
- `gambit seed` command
- Seed files in `seeds/` directory
- Model factories for generating test data

**Example:**
```typescript
// seeds/UsersSeeder.ts
export class UsersSeeder {
  async run() {
    await User.create({ name: 'Admin', email: 'admin@example.com' });
    // Or use factories
    await User.factory().count(10).create();
  }
}
```

### 9. **Model Factories**
Generate fake data for testing and seeding.

**Implementation:**
- Factory definitions
- Faker.js integration
- Relationships in factories

**Example:**
```typescript
// factories/UserFactory.ts
User.factory = () => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  age: faker.number.int({ min: 18, max: 80 }),
});

// Usage
const user = await User.factory().create();
const users = await User.factory().count(10).create();
const admin = await User.factory().state('admin').create();
```

### 10. **Query Logging & Debugging**
Tools for debugging and monitoring database queries.

**Implementation:**
- Query logging (console/file)
- Query execution time tracking
- SQL query formatter
- Query explain/analyze support

**Example:**
```typescript
// Enable query logging
orm.enableQueryLog();

// Get logged queries
const queries = orm.getQueryLog();

// Explain query
const explanation = await User.findAll().explain();
```

### 11. **Additional Validators**
More built-in validators for common use cases.

**Implementation:**
- `UniqueValidator` - Check uniqueness in database
- `ExistsValidator` - Check if value exists in related table
- `RegexValidator` - Pattern matching
- `UrlValidator` - URL format validation
- `DateValidator` - Date format and range validation
- `ArrayValidator` - Array type and length validation
- `NestedValidator` - Validate nested objects

**Example:**
```typescript
class User extends Model {
  static validationRules = {
    email: [
      new RequiredValidator(),
      new EmailValidator(),
      new UniqueValidator('users', 'email'), // Check uniqueness
    ],
    website: [new UrlValidator()],
    tags: [new ArrayValidator({ min: 1, max: 10 })],
  };
}
```

### 12. **MongoDB Aggregation Pipeline Builder**
Native MongoDB aggregation support.

**Implementation:**
- Fluent aggregation pipeline builder
- Support for all MongoDB aggregation stages
- Type-safe aggregation operations

**Example:**
```typescript
const result = await User.aggregate()
  .match({ status: 'active' })
  .group({ _id: '$role', count: { $sum: 1 } })
  .sort({ count: -1 })
  .limit(10)
  .execute();
```

## 🔧 Developer Experience Improvements

### 13. **Better TypeScript Types**
Enhanced type safety and IntelliSense support.

**Implementation:**
- Generic types for relationships
- Better inference for query results
- Type-safe query builder
- Conditional types for better autocomplete

### 14. **Error Handling Improvements**
More descriptive error messages and error types.

**Implementation:**
- Custom error classes (QueryError, ValidationError, etc.)
- Better stack traces
- Error context information
- Error recovery suggestions

### 15. **Connection Pooling Enhancements**
Better connection pool management.

**Implementation:**
- Configurable pool settings per adapter
- Pool monitoring and statistics
- Automatic pool health checks
- Connection retry logic

### 16. **Migration Improvements**
Enhanced migration system.

**Implementation:**
- Migration rollback to specific version
- Migration status with more details
- Migration dependencies
- Data migrations (not just schema)

**Example:**
```typescript
// Rollback to specific migration
gambit migrate:rollback --to=20240101000000

// Data migration
export class SeedUsersMigration extends Migration {
  async up() {
    await User.bulkInsert([...]);
  }
}
```

### 17. **CLI Enhancements**
More CLI commands and options.

**Implementation:**
- `gambit model:create` - Generate model files
- `gambit db:seed` - Run seeders
- `gambit db:reset` - Reset database
- `gambit db:refresh` - Refresh migrations and seeds
- `gambit make:validator` - Generate custom validator

### 18. **Documentation Improvements**
Enhanced documentation and examples.

**Implementation:**
- Interactive API documentation
- More real-world examples
- Performance best practices guide
- Migration guide from other ORMs
- Video tutorials

## 🎯 Performance Optimizations

### 19. **Lazy Loading Optimizations**
Improve relationship loading performance.

**Implementation:**
- Batch eager loading (N+1 query prevention)
- Lazy loading with caching
- Relationship preloading strategies

### 20. **Query Optimization**
Optimize generated SQL queries.

**Implementation:**
- Query plan analysis
- Automatic index suggestions
- Query result pagination helpers
- Cursor-based pagination

### 21. **Connection Pool Optimization**
Optimize database connection usage.

**Implementation:**
- Connection pooling per adapter
- Connection reuse strategies
- Idle connection management

## 🧪 Testing & Quality

### 22. **Integration Tests**
Add integration tests with real databases.

**Implementation:**
- Docker-based test environments
- Test database setup/teardown
- Multi-database integration tests

### 23. **Performance Benchmarks**
Benchmark suite for performance monitoring.

**Implementation:**
- Benchmark suite
- Performance regression detection
- Comparison with other ORMs

### 24. **Test Coverage**
Increase test coverage to >90%.

**Implementation:**
- More edge case tests
- Error scenario tests
- Integration test coverage

## 🔐 Security Enhancements

### 25. **SQL Injection Prevention Audit**
Ensure all queries are properly parameterized.

**Implementation:**
- Security audit of query builders
- Automated security testing
- Security best practices documentation

### 26. **Input Sanitization**
Built-in input sanitization helpers.

**Implementation:**
- XSS prevention
- SQL injection prevention (already done, but document better)
- Input validation helpers

## 📦 Additional Database Support

### 27. **More Database Adapters**
Support for additional databases.

**Implementation:**
- MariaDB adapter (similar to MySQL)
- Oracle adapter
- Microsoft SQL Server adapter
- CockroachDB adapter

## 🎨 Code Quality

### 28. **Code Refactoring**
Improve code organization and maintainability.

**Implementation:**
- Extract common patterns
- Reduce code duplication
- Improve error handling consistency
- Better separation of concerns

### 29. **Performance Monitoring**
Add performance monitoring hooks.

**Implementation:**
- Query execution time tracking
- Slow query logging
- Performance metrics collection

## 🚀 Quick Wins (Easy to Implement)

1. **Add `count()` method to Model**
   ```typescript
   const userCount = await User.count();
   const activeCount = await User.where('status', '=', 'active').count();
   ```

2. **Add `exists()` method**
   ```typescript
   const exists = await User.where('email', '=', 'test@example.com').exists();
   ```

3. **Add `pluck()` method**
   ```typescript
   const names = await User.pluck('name');
   ```

4. **Add `first()` and `last()` methods**
   ```typescript
   const firstUser = await User.first();
   const lastUser = await User.last();
   ```

5. **Add `increment()` and `decrement()` methods**
   ```typescript
   await user.increment('views', 1);
   await user.decrement('credits', 5);
   ```

6. **Add `touch()` method for timestamps**
   ```typescript
   await user.touch(); // Update updated_at
   ```

7. **Add `fresh()` method to reload model**
   ```typescript
   await user.fresh(); // Reload from database
   ```

8. **Add `isDirty()` and `isClean()` methods**
   ```typescript
   user.name = 'New Name';
   user.isDirty(); // true
   user.isDirty('name'); // true
   ```

## 📝 Implementation Priority

**Phase 1 (Next Release):**
- Soft Deletes
- Automatic Timestamps
- Model Scopes
- Quick Wins (count, exists, pluck, etc.)

**Phase 2:**
- Batch Operations
- Many-to-Many Relationships
- Query Logging
- Additional Validators

**Phase 3:**
- Query Result Caching
- Model Factories
- Database Seeding
- MongoDB Aggregation Builder

**Phase 4:**
- Performance Optimizations
- Integration Tests
- Additional Database Support
- Advanced Features

## 🤝 Contributing

If you'd like to contribute any of these improvements, please:
1. Check existing issues and PRs
2. Create an issue to discuss the feature
3. Submit a PR with tests and documentation

