import { MigrationRunner } from '../../src/migration/MigrationRunner';
import { Migration } from '../../src/migration/Migration';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';
import { DatabaseConfig } from '../../src/types';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('MigrationRunner', () => {
  let mockConnection: jest.Mocked<Connection>;
  let mockAdapter: MockAdapter;
  let runner: MigrationRunner;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = new MockAdapter();
    mockConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      query: jest.fn().mockImplementation((sql, params) => mockAdapter.query(sql, params)),
      getAdapter: jest.fn(),
      getDialect: jest.fn().mockReturnValue('mysql'),
    } as any;

    (Connection as jest.Mock).mockImplementation(() => mockConnection);
    runner = new MigrationRunner(mockConnection);
  });

  describe('ensureMigrationsTable', () => {
    it('should create migrations table for MySQL', async () => {
      mockConnection.getDialect.mockReturnValue('mysql');
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      await runner.ensureMigrationsTable();

      const queries = mockAdapter.getQueries();
      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0].sql).toContain('CREATE TABLE');
      expect(queries[0].sql).toContain('gambit_migrations');
    });

    it('should create migrations table for PostgreSQL', async () => {
      mockConnection.getDialect.mockReturnValue('postgres');
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      await runner.ensureMigrationsTable();

      const queries = mockAdapter.getQueries();
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should create migrations table for SQLite', async () => {
      mockConnection.getDialect.mockReturnValue('sqlite');
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      await runner.ensureMigrationsTable();

      const queries = mockAdapter.getQueries();
      expect(queries.length).toBeGreaterThan(0);
    });
  });

  describe('getExecutedMigrations', () => {
    it('should return empty array when no migrations executed', async () => {
      // ensureMigrationsTable (MySQL uses single query with multiple statements)
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations
      mockAdapter.setQueryResult({ rows: [] });

      const migrations = await runner.getExecutedMigrations();

      expect(migrations).toEqual([]);
    });

    it('should return executed migrations', async () => {
      // ensureMigrationsTable
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations
      mockAdapter.setQueryResult({
        rows: [
          { id: 1, name: '20240101000000_create_users', batch: 1, executed_at: new Date() },
        ],
      });

      const migrations = await runner.getExecutedMigrations();

      expect(migrations).toHaveLength(1);
      expect(migrations[0].name).toBe('20240101000000_create_users');
    });
  });

  describe('up', () => {
    class TestMigration extends Migration {
      getName(): string {
        return '20240101000000_test_migration';
      }

      async up(): Promise<void> {
        await this.query('CREATE TABLE test (id INT)');
      }

      async down(): Promise<void> {
        await this.query('DROP TABLE test');
      }
    }

    it('should run pending migrations', async () => {
      // ensureMigrationsTable
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations - no migrations executed yet
      mockAdapter.setQueryResult({ rows: [] });
      // getNextBatch
      mockAdapter.setQueryResult({ rows: [{ max_batch: null }] });
      // migration.up() - CREATE TABLE test
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // recordMigration - INSERT INTO gambit_migrations
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      await runner.up([TestMigration]);

      const queries = mockAdapter.getQueries();
      expect(queries.some(q => q.sql && q.sql.includes('CREATE TABLE test'))).toBe(true);
      expect(queries.some(q => q.sql && q.sql.includes('INSERT INTO gambit_migrations'))).toBe(true);
    });

    it('should skip already executed migrations', async () => {
      // Clear any previous queries
      mockAdapter.clearQueries();
      
      // up() calls ensureMigrationsTable() - 1st call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations() calls ensureMigrationsTable() internally - 2nd call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations() SELECT query - returns already executed migration
      mockAdapter.setQueryResult({
        rows: [{ id: 1, name: '20240101000000_test_migration', batch: 1, executed_at: new Date() }],
      });
      // getNextBatch won't be called since migration is skipped

      await runner.up([TestMigration]);

      const queries = mockAdapter.getQueries();
      // Filter out the migrations table creation queries
      const userQueries = queries.filter(q => 
        q.sql && 
        !q.sql.includes('gambit_migrations') && 
        !q.sql.includes('CREATE TABLE IF NOT EXISTS gambit_migrations')
      );
      
      // Should not have CREATE TABLE test (migration skipped)
      const hasTestTable = userQueries.some(q => q.sql.includes('CREATE TABLE test'));
      expect(hasTestTable).toBe(false);
      // Should not have INSERT INTO gambit_migrations for this migration (migration skipped)
      const hasInsertForThisMigration = queries.some(q => 
        q.sql && 
        q.sql.includes('INSERT INTO gambit_migrations') && 
        q.params && 
        q.params[0] === '20240101000000_test_migration'
      );
      expect(hasInsertForThisMigration).toBe(false);
    });

    it('should throw error if connection not established', async () => {
      mockConnection.isConnected.mockReturnValue(false);

      await expect(runner.up([TestMigration])).rejects.toThrow('Database connection is not established');
    });
  });

  describe('down', () => {
    class TestMigration extends Migration {
      getName(): string {
        return '20240101000000_test_migration';
      }

      async up(): Promise<void> {
        await this.query('CREATE TABLE test (id INT)');
      }

      async down(): Promise<void> {
        await this.query('DROP TABLE test');
      }
    }

    it('should rollback last batch of migrations', async () => {
      // Clear any previous queries
      mockAdapter.clearQueries();
      
      // down() calls ensureMigrationsTable() - 1st call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getLastBatchMigrations() calls ensureMigrationsTable() internally - 2nd call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getLastBatchMigrations() SELECT query - returns migration to rollback
      mockAdapter.setQueryResult({
        rows: [{ id: 1, name: '20240101000000_test_migration', batch: 1, executed_at: new Date() }],
      });
      // migration.down() - DROP TABLE test
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // removeMigration - DELETE FROM gambit_migrations WHERE name = '20240101000000_test_migration'
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      await runner.down([TestMigration]);

      const queries = mockAdapter.getQueries();
      // Check that DROP TABLE test was called (from migration.down())
      const hasDropTable = queries.some(q => q.sql && q.sql.includes('DROP TABLE test'));
      // Check that DELETE FROM gambit_migrations was called (from removeMigration)
      const hasDelete = queries.some(q => 
        q.sql && 
        q.sql.includes('DELETE FROM gambit_migrations') &&
        q.params &&
        q.params[0] === '20240101000000_test_migration'
      );
      expect(hasDropTable).toBe(true);
      expect(hasDelete).toBe(true);
    });

    it('should do nothing if no migrations to rollback', async () => {
      mockAdapter.setQueryResult({ rows: [] }); // No migrations

      await runner.down([TestMigration]);

      const queries = mockAdapter.getQueries();
      expect(queries.some(q => q.sql.includes('DROP TABLE'))).toBe(false);
    });
  });

  describe('status', () => {
    class TestMigration extends Migration {
      getName(): string {
        return '20240101000000_test_migration';
      }

      async up(): Promise<void> {}
      async down(): Promise<void> {}
    }

    it('should return migration status', async () => {
      // Clear any previous queries
      mockAdapter.clearQueries();
      
      // status() calls ensureMigrationsTable() - 1st call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations() calls ensureMigrationsTable() internally - 2nd call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations() SELECT query - returns executed migration
      mockAdapter.setQueryResult({
        rows: [{ id: 1, name: '20240101000000_test_migration', batch: 1, executed_at: new Date() }],
      });

      const status = await runner.status([TestMigration]);

      expect(status).toHaveLength(1);
      expect(status[0].name).toBe('20240101000000_test_migration');
      expect(status[0].executed).toBe(true);
      expect(status[0].batch).toBe(1);
    });

    it('should mark pending migrations as not executed', async () => {
      // Clear any previous queries
      mockAdapter.clearQueries();
      
      // status() calls ensureMigrationsTable() - 1st call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations() calls ensureMigrationsTable() internally - 2nd call
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
      // getExecutedMigrations() SELECT query - no migrations executed
      mockAdapter.setQueryResult({ rows: [] });

      const status = await runner.status([TestMigration]);

      expect(status).toHaveLength(1);
      expect(status[0].executed).toBe(false);
    });
  });
});

