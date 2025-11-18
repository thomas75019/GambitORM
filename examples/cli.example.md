# GambitORM CLI Examples

## Setup

1. Create a `.gambitorm.json` configuration file:

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

2. Create a `migrations` directory (or use the default):

```bash
mkdir migrations
```

## Commands

### Create a Migration

```bash
gambit migrate:create create_users_table
```

This creates a file like: `migrations/20240118_143022_create_users_table.ts`

### Run Migrations

```bash
gambit migrate
```

Output:
```
Running migrations...

✓ Migrations completed:
  - Executed: 2
  - Pending: 0

Executed migrations:
  ✓ create_users_table (batch 1)
  ✓ add_email_to_users (batch 1)
```

### Check Migration Status

```bash
gambit migrate:status
```

Output:
```
Migration Status

Total migrations: 3
  - Executed: 2
  - Pending: 1

Migration Status:
────────────────────────────────────────────────────────────
✓ create_users_table (batch 1)
✓ add_email_to_users (batch 1)
○ add_phone_to_users
```

### Rollback Migrations

```bash
# Rollback last batch
gambit migrate:rollback

# Rollback all migrations
gambit migrate:rollback --all
```

### Custom Config File

```bash
gambit migrate --config ./config/production.json
```

## Migration File Example

After running `gambit migrate:create create_posts_table`, edit the generated file:

```typescript
import { Migration } from 'gambitorm';

export class CreatePostsTable extends Migration {
  async up(): Promise<void> {
    await this.schema('posts')
      .id()
      .string('title')
      .text('content')
      .integer('user_id')
      .foreignKey('user_id', 'users', 'id')
      .timestamp('created_at')
      .timestamp('updated_at')
      .create();
  }

  async down(): Promise<void> {
    await this.schema('posts').drop();
  }

  getName(): string {
    return 'create_posts_table';
  }
}
```

## Workflow

1. Create a migration:
   ```bash
   gambit migrate:create add_index_to_users
   ```

2. Edit the migration file with your schema changes

3. Check status:
   ```bash
   gambit migrate:status
   ```

4. Run migrations:
   ```bash
   gambit migrate
   ```

5. If needed, rollback:
   ```bash
   gambit migrate:rollback
   ```

