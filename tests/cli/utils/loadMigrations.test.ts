import * as fs from 'fs';
import * as path from 'path';
import { loadMigrations } from '../../../src/cli/utils/loadMigrations';
import { Migration } from '../../../src/migration/Migration';

describe('loadMigrations', () => {
  const testMigrationsDir = path.join(__dirname, '../../temp-migrations');

  beforeEach(() => {
    if (fs.existsSync(testMigrationsDir)) {
      fs.rmSync(testMigrationsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testMigrationsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testMigrationsDir)) {
      fs.rmSync(testMigrationsDir, { recursive: true, force: true });
    }
  });

  it('should return empty array if migrations directory does not exist', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(__dirname);
      const migrations = await loadMigrations('../../non-existent-dir');
      expect(migrations).toEqual([]);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should return empty array if migrations directory is empty', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(__dirname);
      const migrations = await loadMigrations('../../temp-migrations');
      expect(migrations).toEqual([]);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should filter out non-migration files', async () => {
    const originalCwd = process.cwd();
    try {
      process.chdir(__dirname);
      
      // Create a non-migration file
      fs.writeFileSync(
        path.join(testMigrationsDir, 'test.txt'),
        'not a migration',
        'utf-8'
      );

      const migrations = await loadMigrations('../../temp-migrations');
      expect(migrations).toEqual([]);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

