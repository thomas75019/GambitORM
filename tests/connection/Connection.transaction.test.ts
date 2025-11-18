import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

describe('Connection - Transactions', () => {
  let connection: Connection;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    connection = new Connection({
      database: 'test',
      dialect: 'mysql',
    });
    
    // Replace the adapter with mock
    (connection as any).adapter = mockAdapter;
    (connection as any).adapter.connected = true;
  });

  describe('beginTransaction', () => {
    it('should begin a transaction', async () => {
      await connection.beginTransaction();

      expect(mockAdapter.isTransactionActive()).toBe(true);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'BEGIN TRANSACTION' });
    });

    it('should throw error if adapter not initialized', async () => {
      (connection as any).adapter = null;

      await expect(connection.beginTransaction()).rejects.toThrow('Database adapter not initialized');
    });

    it('should throw error if not connected', async () => {
      (connection as any).adapter.connected = false;

      await expect(connection.beginTransaction()).rejects.toThrow('Database connection is not established');
    });
  });

  describe('commit', () => {
    it('should commit a transaction', async () => {
      await connection.beginTransaction();
      await connection.commit();

      expect(mockAdapter.isTransactionActive()).toBe(false);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'COMMIT' });
    });

    it('should throw error if adapter not initialized', async () => {
      (connection as any).adapter = null;

      await expect(connection.commit()).rejects.toThrow('Database adapter not initialized');
    });
  });

  describe('rollback', () => {
    it('should rollback a transaction', async () => {
      await connection.beginTransaction();
      await connection.rollback();

      expect(mockAdapter.isTransactionActive()).toBe(false);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'ROLLBACK' });
    });

    it('should throw error if adapter not initialized', async () => {
      (connection as any).adapter = null;

      await expect(connection.rollback()).rejects.toThrow('Database adapter not initialized');
    });
  });
});

