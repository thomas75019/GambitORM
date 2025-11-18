import { Connection } from '../../src/connection/Connection';
import { DatabaseConfig } from '../../src/types';
import { MockAdapter } from '../__mocks__/BaseAdapter';
import { MySQLAdapter } from '../../src/connection/adapters/MySQLAdapter';
import { PostgreSQLAdapter } from '../../src/connection/adapters/PostgreSQLAdapter';
import { SQLiteAdapter } from '../../src/connection/adapters/SQLiteAdapter';

// Mock the adapters
jest.mock('../../src/connection/adapters/MySQLAdapter');
jest.mock('../../src/connection/adapters/PostgreSQLAdapter');
jest.mock('../../src/connection/adapters/SQLiteAdapter');

describe('Connection', () => {
  const mysqlConfig: DatabaseConfig = {
    host: 'localhost',
    port: 3306,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
    dialect: 'mysql',
  };

  const postgresConfig: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
    dialect: 'postgres',
  };

  const sqliteConfig: DatabaseConfig = {
    database: './test.db',
    dialect: 'sqlite',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create MySQL adapter when dialect is mysql', () => {
      new Connection(mysqlConfig);
      expect(MySQLAdapter).toHaveBeenCalledWith(mysqlConfig);
    });

    it('should create PostgreSQL adapter when dialect is postgres', () => {
      new Connection(postgresConfig);
      expect(PostgreSQLAdapter).toHaveBeenCalledWith(postgresConfig);
    });

    it('should create SQLite adapter when dialect is sqlite', () => {
      new Connection(sqliteConfig);
      expect(SQLiteAdapter).toHaveBeenCalledWith(sqliteConfig);
    });

    it('should default to MySQL when dialect is not specified', () => {
      const config = { ...mysqlConfig };
      delete config.dialect;
      new Connection(config);
      expect(MySQLAdapter).toHaveBeenCalled();
    });

    it('should throw error for unsupported dialect', () => {
      const config = { ...mysqlConfig, dialect: 'oracle' as any };
      expect(() => new Connection(config)).toThrow('Unsupported database dialect: oracle');
    });
  });

  describe('connect', () => {
    it('should connect to database', async () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      await connection.connect();

      expect(mockAdapter.isConnected()).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      await connection.connect();
      await connection.connect(); // Second call

      expect(mockAdapter.isConnected()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      await connection.connect();
      await connection.disconnect();

      expect(mockAdapter.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      await connection.disconnect(); // Disconnect without connecting

      expect(mockAdapter.isConnected()).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      expect(connection.isConnected()).toBe(false);

      await connection.connect();
      expect(connection.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      expect(connection.isConnected()).toBe(false);
    });
  });

  describe('query', () => {
    it('should execute query when connected', async () => {
      const mockAdapter = new MockAdapter();
      mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'Test' }], rowCount: 1 });
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      await connection.connect();

      const result = await connection.query('SELECT * FROM users WHERE id = ?', [1]);

      expect(result.rows).toEqual([{ id: 1, name: 'Test' }]);
      expect(mockAdapter.getQueries()).toHaveLength(1);
      expect(mockAdapter.getQueries()[0]).toEqual({
        sql: 'SELECT * FROM users WHERE id = ?',
        params: [1],
      });
    });

    it('should throw error when not connected', async () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);

      await expect(connection.query('SELECT * FROM users')).rejects.toThrow(
        'Database connection is not established'
      );
    });
  });

  describe('getDialect', () => {
    it('should return the configured dialect', () => {
      const connection = new Connection(mysqlConfig);
      expect(connection.getDialect()).toBe('mysql');
    });

    it('should return default dialect when not specified', () => {
      const config = { ...mysqlConfig };
      delete config.dialect;
      const connection = new Connection(config);
      expect(connection.getDialect()).toBe('mysql');
    });
  });

  describe('getAdapter', () => {
    it('should return the adapter instance', () => {
      const mockAdapter = new MockAdapter();
      (MySQLAdapter as jest.Mock).mockImplementation(() => mockAdapter);

      const connection = new Connection(mysqlConfig);
      const adapter = connection.getAdapter();

      expect(adapter).toBe(mockAdapter);
    });
  });
});

