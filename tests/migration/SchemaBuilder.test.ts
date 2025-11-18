import { SchemaBuilder } from '../../src/migration/SchemaBuilder';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('SchemaBuilder', () => {
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

  describe('create', () => {
    it('should create table with columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.id();
      builder.string('name', 255);
      builder.string('email', 255);

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0].sql).toContain('CREATE TABLE');
      expect(queries[0].sql).toContain('users');
    });

    it('should create table with primary key', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.id();

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('PRIMARY KEY');
    });

    it('should create table with timestamps', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.id();
      builder.timestamps();

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('created_at');
      expect(queries[0].sql).toContain('updated_at');
    });
  });

  describe('drop', () => {
    it('should drop table', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      await builder.drop();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toBe('DROP TABLE IF EXISTS users');
    });
  });

  describe('column types', () => {
    it('should support string columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.string('name', 100);

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('name');
      expect(queries[0].sql).toContain('VARCHAR');
    });

    it('should support integer columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.integer('age');

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('age');
      expect(queries[0].sql).toContain('INT');
    });

    it('should support boolean columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.boolean('active');

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('active');
    });

    it('should support text columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.text('description');

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('description');
      expect(queries[0].sql).toContain('TEXT');
    });
  });

  describe('column modifiers', () => {
    it('should support nullable columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.string('name').nullable();

      await builder.create();

      const queries = mockAdapter.getQueries();
      // Should not have NOT NULL
      expect(queries[0].sql).not.toContain('NOT NULL');
    });

    it('should support not null columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.string('name').notNull();

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('NOT NULL');
    });

    it('should support default values', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.string('status').default('active');

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('DEFAULT');
    });

    it('should support unique columns', async () => {
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.string('email').unique();

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('UNIQUE');
    });
  });

  describe('dialect support', () => {
    it('should generate PostgreSQL-compatible SQL', async () => {
      mockConnection.getDialect.mockReturnValue('postgres');
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.id();
      builder.boolean('active');

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('INTEGER');
      expect(queries[0].sql).toContain('BOOLEAN');
      expect(queries[0].sql).toContain('PRIMARY KEY');
    });

    it('should generate SQLite-compatible SQL', async () => {
      mockConnection.getDialect.mockReturnValue('sqlite');
      mockAdapter.setQueryResult({ rows: [], rowCount: 0 });

      const builder = new SchemaBuilder(mockConnection, 'users');
      builder.id();

      await builder.create();

      const queries = mockAdapter.getQueries();
      expect(queries[0].sql).toContain('AUTOINCREMENT');
    });
  });
});

