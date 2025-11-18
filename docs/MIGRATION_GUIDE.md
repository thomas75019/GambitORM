# Migration Guide

Guide for migrating from other ORMs to GambitORM.

## Table of Contents

- [From Sequelize](#from-sequelize)
- [From TypeORM](#from-typeorm)
- [From Prisma](#from-prisma)
- [From Knex.js](#from-knexjs)
- [General Migration Tips](#general-migration-tips)

---

## From Sequelize

### Model Definition

**Sequelize:**
```typescript
const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: DataTypes.STRING,
});
```

**GambitORM:**
```typescript
class User extends Model {
  static tableName = 'users';
  name!: string;
  email!: string;
}
```

### Queries

**Sequelize:**
```typescript
await User.findAll({ where: { status: 'active' } });
await User.findOne({ where: { email: 'john@example.com' } });
await User.create({ name: 'John', email: 'john@example.com' });
```

**GambitORM:**
```typescript
await User.findAll({ where: { status: 'active' } });
await User.findOne({ email: 'john@example.com' });
await User.create({ name: 'John', email: 'john@example.com' });
```

### Relationships

**Sequelize:**
```typescript
User.hasOne(Profile);
User.hasMany(Post);
Profile.belongsTo(User);
```

**GambitORM:**
```typescript
// In User model
profile() {
  return this.hasOne(Profile, { foreignKey: 'user_id' });
}
posts() {
  return this.hasMany(Post, { foreignKey: 'user_id' });
}

// In Profile model
user() {
  return this.belongsTo(User, { foreignKey: 'user_id' });
}
```

### Migrations

**Sequelize:**
```typescript
await queryInterface.createTable('users', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING },
});
```

**GambitORM:**
```typescript
await this.schema('users')
  .id()
  .string('name')
  .create();
```

---

## From TypeORM

### Entity Definition

**TypeORM:**
```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}
```

**GambitORM:**
```typescript
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
}
```

### Repository Pattern

**TypeORM:**
```typescript
const userRepository = connection.getRepository(User);
await userRepository.find();
await userRepository.findOne({ where: { id: 1 } });
```

**GambitORM:**
```typescript
await User.findAll();
await User.findById(1);
```

### Query Builder

**TypeORM:**
```typescript
await connection
  .createQueryBuilder()
  .select('user')
  .from(User, 'user')
  .where('user.status = :status', { status: 'active' })
  .getMany();
```

**GambitORM:**
```typescript
const query = new QueryBuilder('users', connection);
query
  .select(['*'])
  .where('status', '=', 'active');
await query.execute();
```

---

## From Prisma

### Schema Definition

**Prisma:**
```prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
}
```

**GambitORM:**
```typescript
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
}
```

### Queries

**Prisma:**
```typescript
await prisma.user.findMany();
await prisma.user.findUnique({ where: { id: 1 } });
await prisma.user.create({ data: { name: 'John', email: 'john@example.com' } });
```

**GambitORM:**
```typescript
await User.findAll();
await User.findById(1);
await User.create({ name: 'John', email: 'john@example.com' });
```

### Relationships

**Prisma:**
```prisma
model User {
  posts Post[]
}

model Post {
  user   User   @relation(fields: [userId], references: [id])
  userId Int
}
```

**GambitORM:**
```typescript
// In User model
posts() {
  return this.hasMany(Post, { foreignKey: 'user_id' });
}

// In Post model
user() {
  return this.belongsTo(User, { foreignKey: 'user_id' });
}
```

---

## From Knex.js

### Query Building

**Knex.js:**
```typescript
await knex('users')
  .where('status', 'active')
  .select('*');
```

**GambitORM:**
```typescript
const query = new QueryBuilder('users', connection);
query
  .where('status', '=', 'active')
  .select(['*']);
await query.execute();
```

### Migrations

**Knex.js:**
```typescript
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id');
    table.string('name');
  });
};
```

**GambitORM:**
```typescript
async up(): Promise<void> {
  await this.schema('users')
    .id()
    .string('name')
    .create();
}
```

---

## General Migration Tips

### 1. Start with Models

- Define your models first
- Map existing table structures
- Test basic CRUD operations

### 2. Migrate Queries Gradually

- Start with simple queries
- Test each query type
- Use QueryBuilder for complex queries

### 3. Handle Relationships

- Define relationships explicitly
- Test eager loading
- Verify foreign key constraints

### 4. Migrate Migrations

- Convert existing migrations
- Test up and down methods
- Verify schema changes

### 5. Update Validation

- Add validation rules
- Test validation errors
- Handle ValidationError exceptions

### 6. Add Hooks

- Identify lifecycle needs
- Add hooks for timestamps, etc.
- Test hook execution order

### 7. Test Transactions

- Identify transaction boundaries
- Convert to GambitORM transactions
- Test rollback scenarios

### 8. Performance Testing

- Compare query performance
- Optimize with indexes
- Use eager loading appropriately

### Common Pitfalls

1. **Forgetting to set connection**: Always call `Model.setConnection()`
2. **Not handling validation errors**: Wrap in try-catch
3. **N+1 queries**: Use eager loading
4. **Transaction management**: Use automatic transactions when possible
5. **Type safety**: Use TypeScript properly for type checking

### Migration Checklist

- [ ] Install GambitORM
- [ ] Set up database connection
- [ ] Define all models
- [ ] Convert basic queries
- [ ] Migrate relationships
- [ ] Convert migrations
- [ ] Add validation rules
- [ ] Add lifecycle hooks
- [ ] Test transactions
- [ ] Performance testing
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production

