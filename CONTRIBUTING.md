# Contributing to GambitORM

Thank you for considering contributing to GambitORM! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Documentation](#documentation)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

---

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/GambitORM.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Submit a pull request

---

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- TypeScript knowledge

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/GambitORM.git
cd GambitORM

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
GambitORM/
├── src/                 # Source code
│   ├── connection/      # Database connections
│   ├── orm/            # ORM core
│   ├── query/          # Query builder
│   ├── migration/       # Migrations
│   ├── validation/     # Validation
│   ├── hooks/          # Lifecycle hooks
│   ├── relationships/  # Relationships
│   └── cli/            # CLI tool
├── tests/              # Tests
├── docs/               # Documentation
├── examples/           # Usage examples
└── dist/               # Compiled output
```

---

## Making Changes

### Before You Start

1. Check existing issues and pull requests
2. Discuss major changes in an issue first
3. Keep changes focused and atomic

### Types of Contributions

- **Bug fixes**: Fix existing issues
- **Features**: Add new functionality
- **Documentation**: Improve docs
- **Tests**: Add or improve tests
- **Examples**: Add usage examples

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- QueryBuilder.test.ts
```

### Writing Tests

- Write tests for all new features
- Maintain or improve test coverage
- Test edge cases and error conditions
- Use descriptive test names

**Example:**

```typescript
describe('QueryBuilder', () => {
  it('should build WHERE IN clause correctly', () => {
    const query = new QueryBuilder('users', connection);
    query.whereIn('id', [1, 2, 3]);
    
    const { sql, params } = query.toSQL();
    expect(sql).toContain('WHERE id IN');
    expect(params).toEqual([1, 2, 3]);
  });
});
```

---

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types for public APIs
- Use explicit return types for public methods
- Avoid `any` type

### Naming Conventions

- **Classes**: PascalCase (`QueryBuilder`)
- **Methods**: camelCase (`findAll`)
- **Constants**: UPPER_SNAKE_CASE (`TABLE_NAME`)
- **Files**: Match class name (`QueryBuilder.ts`)

### Formatting

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Structure

```typescript
// ✅ Good
class User extends Model {
  static tableName = 'users';
  
  id!: number;
  name!: string;
  
  async save(): Promise<this> {
    // Implementation
  }
}

// ❌ Bad
class User extends Model {
  static tableName='users'
  id:number
  name:string
  async save(){/*...*/}
}
```

---

## Documentation

### Code Comments

- Document public APIs
- Use JSDoc for complex methods
- Explain "why" not "what"

```typescript
/**
 * Finds all records matching the given conditions
 * @param options - Query options including where, orderBy, limit, etc.
 * @returns Promise resolving to array of model instances
 */
static async findAll<T>(options?: QueryOptions): Promise<T[]> {
  // ...
}
```

### README Updates

- Update README for new features
- Add usage examples
- Update installation instructions if needed

---

## Submitting Changes

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** (if applicable)
5. **Create pull request** with clear description

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)
```

### Commit Messages

Use clear, descriptive commit messages:

```
✅ Good:
- "Add whereIn and whereNotIn methods to QueryBuilder"
- "Fix transaction rollback on connection error"
- "Update README with subquery examples"

❌ Bad:
- "fix stuff"
- "updates"
- "WIP"
```

---

## Review Process

1. Maintainers will review your PR
2. Address any feedback
3. Once approved, your PR will be merged

---

## Questions?

- Open an issue for questions
- Check existing documentation
- Review existing code examples

---

Thank you for contributing to GambitORM! 🎉

