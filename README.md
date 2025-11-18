# GambitORM

A modern, type-safe ORM for Node.js built with TypeScript.

## Features

- 🚀 Type-safe database queries
- 📦 Lightweight and performant
- 🔧 Flexible query builder
- 🎯 Model-based approach
- 🔄 Migration support
- 💪 Full TypeScript support

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
  // database configuration
});

// Use your model
const users = await User.findAll();
```

## Documentation

Coming soon...

## License

MIT

