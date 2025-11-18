import { Migration } from '../../src/migration/Migration';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Migration', () => {
  let mockConnection: jest.Mocked<Connection>;
  let mockAdapter: MockAdapter;

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
  });

  class TestMigration extends Migration {
    getName(): string {
      return '20240101000000_test_migration';
    }

    async up(): Promise<void> {
      await this.schema('users').id().string('name').create();
    }

    async down(): Promise<void> {
      await this.schema('users').drop();
    }
  }

  describe('setConnection', () => {
    it('should set the connection', () => {
      const migration = new TestMigration();
      migration.setConnection(mockConnection);

      expect(migration).toBeDefined();
    });
  });

  describe('getConnection', () => {
    it('should throw error if connection not set', () => {
      const migration = new TestMigration();

      expect(() => migration['getConnection']()).toThrow('Connection not set');
    });

    it('should return connection when set', () => {
      const migration = new TestMigration();
      migration.setConnection(mockConnection);

      const connection = migration['getConnection']();
      expect(connection).toBe(mockConnection);
    });
  });

  describe('schema', () => {
    it('should return SchemaBuilder instance', () => {
      const migration = new TestMigration();
      migration.setConnection(mockConnection);

      const builder = migration['schema']('users');
      expect(builder).toBeDefined();
    });
  });

  describe('query', () => {
    it('should execute raw SQL query', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const migration = new TestMigration();
      migration.setConnection(mockConnection);

      await migration['query']('SELECT 1');

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toBe('SELECT 1');
    });
  });

  describe('up and down', () => {
    it('should execute up migration', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const migration = new TestMigration();
      migration.setConnection(mockConnection);

      await migration.up();

      const queries = mockAdapter.getQueries();
      expect(queries.some(q => q.sql.includes('CREATE TABLE'))).toBe(true);
    });

    it('should execute down migration', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const migration = new TestMigration();
      migration.setConnection(mockConnection);

      await migration.down();

      const queries = mockAdapter.getQueries();
      expect(queries.some(q => q.sql.includes('DROP TABLE'))).toBe(true);
    });
  });
});

