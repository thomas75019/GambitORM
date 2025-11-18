import * as fs from 'fs';
import * as path from 'path';
import { createCommand } from '../../../src/cli/commands/create';

describe('CLI - create command', () => {
  const testMigrationsDir = path.join(__dirname, '../../temp-migrations');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMigrationsDir)) {
      fs.rmSync(testMigrationsDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testMigrationsDir)) {
      fs.rmSync(testMigrationsDir, { recursive: true, force: true });
    }
  });

  it('should create a migration file', async () => {
    const originalCwd = process.cwd();
    try {
      // Change to test directory
      process.chdir(__dirname);

      await createCommand('create_users_table', { directory: '../../temp-migrations' });

      const files = fs.readdirSync(testMigrationsDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^\d{8}_\d{6}_create_users_table\.ts$/);

      const filePath = path.join(testMigrationsDir, files[0]);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      expect(content).toContain('CreateUsersTable');
      expect(content).toContain('create_users_table');
      expect(content).toContain('extends Migration');
      expect(content).toContain('async up()');
      expect(content).toContain('async down()');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should create migrations directory if it does not exist', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(__dirname);

      await createCommand('test_migration', { directory: '../../temp-migrations/new-dir' });

      expect(fs.existsSync(path.join(__dirname, '../../temp-migrations/new-dir'))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

