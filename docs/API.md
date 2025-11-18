# GambitORM API Documentation

Complete API reference for GambitORM.

## Table of Contents

- [GambitORM](#gambitorm)
- [Connection](#connection)
- [Model](#model)
- [QueryBuilder](#querybuilder)
- [Migration](#migration)
- [SchemaBuilder](#schemabuilder)
- [Transaction](#transaction)
- [Validation](#validation)
- [Hooks](#hooks)
- [Relationships](#relationships)

---

## GambitORM

Main ORM class that manages database connections and models.

### Constructor

```typescript
new GambitORM(config: DatabaseConfig)
```

**Parameters:**
- `config` (DatabaseConfig): Database configuration object

**Example:**
```typescript
const orm = new GambitORM({
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  user: 'root',
  password: 'password',
  dialect: 'mysql',
});
```

### Methods

#### `connect(): Promise<void>`

Establishes database connection.

**Returns:** `Promise<void>`

**Example:**
```typescript
await orm.connect();
```

#### `disconnect(): Promise<void>`

Closes database connection.

**Returns:** `Promise<void>`

#### `getConnection(): Connection`

Gets the database connection instance.

**Returns:** `Connection`

#### `migrate(migrations: Array<new () => Migration>): Promise<void>`

Runs pending migrations.

**Parameters:**
- `migrations`: Array of migration classes

**Returns:** `Promise<void>`

#### `rollback(migrations: Array<new () => Migration>): Promise<void>`

Rolls back the last migration batch.

**Parameters:**
- `migrations`: Array of migration classes

**Returns:** `Promise<void>`

#### `rollbackAll(migrations: Array<new () => Migration>): Promise<void>`

Rolls back all migrations.

**Parameters:**
- `migrations`: Array of migration classes

**Returns:** `Promise<void>`

#### `migrationStatus(migrations: Array<new () => Migration>): Promise<MigrationStatus[]>`

Gets migration status.

**Parameters:**
- `migrations`: Array of migration classes

**Returns:** `Promise<MigrationStatus[]>`

#### `beginTransaction(): Promise<Transaction>`

Begins a new transaction.

**Returns:** `Promise<Transaction>`

#### `transaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>`

Executes a callback within a transaction.

**Parameters:**
- `callback`: Function that receives the transaction instance

**Returns:** `Promise<T>`

#### `raw(sql: string, params?: any[]): Promise<QueryResult>`

Executes raw SQL query.

**Parameters:**
- `sql`: SQL query string
- `params`: Optional parameters array

**Returns:** `Promise<QueryResult>`

---

## Connection

Database connection manager.

### Constructor

```typescript
new Connection(config: DatabaseConfig)
```

### Methods

#### `connect(): Promise<void>`

Establishes connection.

#### `disconnect(): Promise<void>`

Closes connection.

#### `isConnected(): boolean`

Checks if connected.

**Returns:** `boolean`

#### `query(sql: string, params?: any[]): Promise<QueryResult>`

Executes a query.

**Parameters:**
- `sql`: SQL query string
- `params`: Optional parameters array

**Returns:** `Promise<QueryResult>`

#### `beginTransaction(): Promise<void>`

Begins transaction.

#### `commit(): Promise<void>`

Commits transaction.

#### `rollback(): Promise<void>`

Rolls back transaction.

---

## Model

Base class for all models.

### Static Properties

#### `tableName: string`

Table name for the model.

#### `validationRules?: Record<string, Validator[]>`

Validation rules for the model.

### Static Methods

#### `setConnection(connection: Connection): void`

Sets the database connection for all models.

#### `findAll<T>(options?: QueryOptions): Promise<T[]>`

Finds all records.

**Parameters:**
- `options`: Optional query options (where, orderBy, limit, offset, include)

**Returns:** `Promise<T[]>`

#### `findById<T>(id: number | string, options?: { include?: string[] }): Promise<T | null>`

Finds a record by ID.

**Parameters:**
- `id`: Record ID
- `options`: Optional options with include for eager loading

**Returns:** `Promise<T | null>`

#### `findOne<T>(conditions: Record<string, any>, options?: { include?: string[] }): Promise<T | null>`

Finds a single record.

**Parameters:**
- `conditions`: Where conditions
- `options`: Optional options with include for eager loading

**Returns:** `Promise<T | null>`

#### `create<T>(attributes: ModelAttributes, options?: { skipValidation?: boolean }): Promise<T>`

Creates a new record.

**Parameters:**
- `attributes`: Model attributes
- `options`: Optional options to skip validation

**Returns:** `Promise<T>`

#### `hook<T>(event: HookEvent, callback: HookCallback<T>, priority?: number): void`

Registers a lifecycle hook.

**Parameters:**
- `event`: Hook event type
- `callback`: Hook callback function
- `priority`: Optional priority (default: 100)

#### `unhook<T>(event: HookEvent, callback: HookCallback<T>): void`

Unregisters a hook.

#### `clearHooks<T>(event: HookEvent): void`

Clears all hooks for an event.

### Instance Methods

#### `save(options?: { skipValidation?: boolean }): Promise<this>`

Saves the instance (insert or update).

**Parameters:**
- `options`: Optional options to skip validation

**Returns:** `Promise<this>`

#### `update(attributes: Partial<ModelAttributes>, options?: { skipValidation?: boolean }): Promise<this>`

Updates the instance.

**Parameters:**
- `attributes`: Attributes to update
- `options`: Optional options to skip validation

**Returns:** `Promise<this>`

#### `delete(): Promise<boolean>`

Deletes the instance.

**Returns:** `Promise<boolean>`

#### `validate(): Promise<void>`

Validates the instance.

**Returns:** `Promise<void>`

#### `hasOne<T>(relatedModel: new () => T, options?: RelationshipOptions): HasOne<T>`

Defines a hasOne relationship.

**Parameters:**
- `relatedModel`: Related model class
- `options`: Optional relationship options

**Returns:** `HasOne<T>`

#### `hasMany<T>(relatedModel: new () => T, options?: RelationshipOptions): HasMany<T>`

Defines a hasMany relationship.

**Parameters:**
- `relatedModel`: Related model class
- `options`: Optional relationship options

**Returns:** `HasMany<T>`

#### `belongsTo<T>(relatedModel: new () => T, options?: RelationshipOptions): BelongsTo<T>`

Defines a belongsTo relationship.

**Parameters:**
- `relatedModel`: Related model class
- `options`: Optional relationship options

**Returns:** `BelongsTo<T>`

---

## QueryBuilder

Query builder for constructing SQL queries (MySQL, PostgreSQL, SQLite).

## MongoDBQueryBuilder

Query builder for constructing MongoDB queries. Automatically used when `dialect: 'mongodb'`.

### Constructor

```typescript
new MongoDBQueryBuilder(collectionName: string, connection: Connection)
```

### Methods

Similar to QueryBuilder but uses MongoDB operations:
- `where(field: string, operator: string, value: any): this` - MongoDB filter
- `whereIn(field: string, values: any[]): this` - Uses `$in`
- `whereNotIn(field: string, values: any[]): this` - Uses `$nin`
- `whereNull(field: string): this` - Null check
- `whereNotNull(field: string): this` - Not null check
- `orderBy(field: string, direction?: 'ASC' | 'DESC'): this` - MongoDB sort
- `limit(count: number): this` - MongoDB limit
- `offset(count: number): this` - MongoDB skip
- `insert(data: Record<string, any>): this` - Insert document
- `update(data: Record<string, any>): this` - Update with `$set`
- `delete(): this` - Delete documents
- `execute(): Promise<QueryResult>` - Execute MongoDB operation

## MongoDBAdapter

MongoDB database adapter using native MongoDB operations.

### Methods

#### `getDatabase(): Db | undefined`

Gets the MongoDB database instance.

#### `getCollection(name: string): Collection | undefined`

Gets a MongoDB collection.

#### `getSession(): ClientSession | undefined`

Gets the current transaction session.

## MongoDBHelper

Helper class for native MongoDB operations.

### Methods

#### `collection(name: string): Collection | undefined`

Gets a collection for direct MongoDB operations.

#### `find<T>(collection: string, filter?: Filter<T>, options?: FindOptions): Promise<T[]>`

Finds documents.

#### `findOne<T>(collection: string, filter?: Filter<T>, options?: FindOptions): Promise<T | null>`

Finds one document.

#### `insertOne<T>(collection: string, document: T): Promise<{ insertedId: string }>`

Inserts one document.

#### `insertMany<T>(collection: string, documents: T[]): Promise<{ insertedIds: string[]; insertedCount: number }>`

Inserts many documents.

#### `updateOne<T>(collection: string, filter: Filter<T>, update: UpdateFilter<T>): Promise<{ modifiedCount: number }>`

Updates one document.

#### `updateMany<T>(collection: string, filter: Filter<T>, update: UpdateFilter<T>): Promise<{ modifiedCount: number }>`

Updates many documents.

#### `deleteOne<T>(collection: string, filter: Filter<T>): Promise<{ deletedCount: number }>`

Deletes one document.

#### `deleteMany<T>(collection: string, filter: Filter<T>): Promise<{ deletedCount: number }>`

Deletes many documents.

#### `count<T>(collection: string, filter?: Filter<T>): Promise<number>`

Counts documents.

### Constructor

```typescript
new QueryBuilder(tableName: string, connection?: Connection)
```

### Methods

#### `select(fields: string[]): this`

Selects specific fields.

#### `count(field?: string, alias?: string): this`

Adds COUNT aggregate.

#### `sum(field: string, alias?: string): this`

Adds SUM aggregate.

#### `avg(field: string, alias?: string): this`

Adds AVG aggregate.

#### `max(field: string, alias?: string): this`

Adds MAX aggregate.

#### `min(field: string, alias?: string): this`

Adds MIN aggregate.

#### `where(field: string, operator: string, value: any): this`

Adds WHERE condition.

#### `orWhere(field: string, operator: string, value: any): this`

Adds OR WHERE condition.

#### `whereIn(field: string, values: any[]): this`

Adds WHERE IN condition.

#### `whereNotIn(field: string, values: any[]): this`

Adds WHERE NOT IN condition.

#### `whereNull(field: string): this`

Adds WHERE NULL condition.

#### `whereNotNull(field: string): this`

Adds WHERE NOT NULL condition.

#### `whereBetween(field: string, value1: any, value2: any): this`

Adds WHERE BETWEEN condition.

#### `whereNotBetween(field: string, value1: any, value2: any): this`

Adds WHERE NOT BETWEEN condition.

#### `whereLike(field: string, value: string): this`

Adds WHERE LIKE condition.

#### `whereNotLike(field: string, value: string): this`

Adds WHERE NOT LIKE condition.

#### `whereRaw(sql: string, params?: any[]): this`

Adds raw WHERE condition.

#### `whereSubquery(field: string, operator: string, subquery: QueryBuilder): this`

Adds WHERE with subquery.

#### `join(table: string, on: { left: string; right: string }, type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL', alias?: string): this`

Adds JOIN clause.

#### `leftJoin(table: string, on: { left: string; right: string }, alias?: string): this`

Adds LEFT JOIN.

#### `rightJoin(table: string, on: { left: string; right: string }, alias?: string): this`

Adds RIGHT JOIN.

#### `fullJoin(table: string, on: { left: string; right: string }, alias?: string): this`

Adds FULL JOIN.

#### `groupBy(fields: string | string[]): this`

Adds GROUP BY clause.

#### `having(field: string, operator: string, value: any): this`

Adds HAVING clause.

#### `orderBy(column: string, direction?: 'ASC' | 'DESC'): this`

Adds ORDER BY clause.

#### `limit(count: number): this`

Adds LIMIT clause.

#### `offset(count: number): this`

Adds OFFSET clause.

#### `insert(data: Record<string, any>): this`

Sets INSERT query type.

#### `update(data: Record<string, any>): this`

Sets UPDATE query type.

#### `delete(): this`

Sets DELETE query type.

#### `toSQL(): { sql: string; params: any[] }`

Builds the SQL query.

**Returns:** Object with SQL string and parameters array

#### `execute(): Promise<QueryResult>`

Executes the query.

**Returns:** `Promise<QueryResult>`

#### `setConnection(connection: Connection): this`

Sets the connection.

### Static Methods

#### `raw(connection: Connection, sql: string, params?: any[]): Promise<QueryResult>`

Executes raw SQL.

#### `subquery(tableName: string, connection?: Connection): QueryBuilder`

Creates a subquery builder.

---

## Migration

Base class for migrations.

### Methods

#### `up(): Promise<void>`

Runs the migration. Must be implemented.

#### `down(): Promise<void>`

Rolls back the migration. Must be implemented.

#### `getName(): string`

Returns the migration name. Must be implemented.

#### `schema(tableName: string): SchemaBuilder`

Gets schema builder for the table.

**Returns:** `SchemaBuilder`

#### `query(sql: string, params?: any[]): Promise<QueryResult>`

Executes a raw query.

---

## SchemaBuilder

Fluent API for building database schema.

### Methods

#### `id(name?: string): this`

Adds an ID column.

#### `string(name: string, length?: number): this`

Adds a string column.

#### `integer(name: string): this`

Adds an integer column.

#### `boolean(name: string): this`

Adds a boolean column.

#### `text(name: string): this`

Adds a text column.

#### `timestamp(name: string): this`

Adds a timestamp column.

#### `nullable(): this`

Makes the column nullable.

#### `notNull(): this`

Makes the column not null.

#### `default(value: any): this`

Sets column default value.

#### `unique(): this`

Adds unique constraint.

#### `primaryKey(): this`

Sets as primary key.

#### `foreignKey(column: string, table: string, referencedColumn: string): this`

Adds foreign key constraint.

#### `create(): Promise<void>`

Creates the table.

#### `drop(): Promise<void>`

Drops the table.

---

## Transaction

Transaction manager.

### Constructor

```typescript
new Transaction(connection: Connection)
```

### Methods

#### `begin(): Promise<void>`

Begins the transaction.

#### `commit(): Promise<void>`

Commits the transaction.

#### `rollback(): Promise<void>`

Rolls back the transaction.

#### `isActive(): boolean`

Checks if transaction is active.

**Returns:** `boolean`

### Static Methods

#### `run<T>(connection: Connection, callback: (transaction: Transaction) => Promise<T>): Promise<T>`

Runs a callback within a transaction.

---

## Validation

### Validators

#### `RequiredValidator(message?: string)`

Validates that a field is required.

#### `EmailValidator(message?: string)`

Validates email format.

#### `MinLengthValidator(minLength: number, message?: string)`

Validates minimum string length.

#### `MaxLengthValidator(maxLength: number, message?: string)`

Validates maximum string length.

#### `MinValidator(min: number, message?: string)`

Validates minimum numeric value.

#### `MaxValidator(max: number, message?: string)`

Validates maximum numeric value.

#### `TypeValidator(expectedType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object', message?: string)`

Validates field type.

#### `CustomValidator(validatorFn: (value: any, field: string, model: any) => boolean | Promise<boolean>, message?: string)`

Custom validator function.

### ValidationError

Error class for validation failures.

**Properties:**
- `errors: Record<string, string[]>` - Field errors

**Methods:**
- `getFieldErrors(field: string): string[]` - Gets errors for a field
- `hasFieldError(field: string): boolean` - Checks if field has errors

---

## Hooks

### HookEvent Enum

- `BEFORE_SAVE`
- `AFTER_SAVE`
- `BEFORE_CREATE`
- `AFTER_CREATE`
- `BEFORE_UPDATE`
- `AFTER_UPDATE`
- `BEFORE_DELETE`
- `AFTER_DELETE`
- `BEFORE_VALIDATE`
- `AFTER_VALIDATE`

### HookCallback

```typescript
type HookCallback<T extends Model = Model> = (instance: T) => Promise<void> | void;
```

---

## Relationships

### HasOne

One-to-one relationship.

**Methods:**
- `load(): Promise<T | null>` - Loads the related model

### HasMany

One-to-many relationship.

**Methods:**
- `load(): Promise<T[]>` - Loads related models

### BelongsTo

Many-to-one relationship.

**Methods:**
- `load(): Promise<T | null>` - Loads the parent model

---

## Types

### DatabaseConfig

```typescript
interface DatabaseConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  dialect?: 'mysql' | 'postgres' | 'sqlite' | 'mongodb';
  pool?: {
    min?: number;
    max?: number;
    idle?: number;
  };
}
```

### QueryResult

```typescript
interface QueryResult {
  rows: any[];
  rowCount?: number;
  insertId?: number | string;
}
```

### QueryOptions

```typescript
interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string | Array<{ column: string; direction: 'ASC' | 'DESC' }>;
  where?: Record<string, any>;
  include?: string[];
}
```

### ModelAttributes

```typescript
interface ModelAttributes {
  [key: string]: any;
}
```

