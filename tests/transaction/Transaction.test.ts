import { Transaction } from '../../src/transaction/Transaction';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Transaction', () => {
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
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
      getDialect: jest.fn().mockReturnValue('mysql'),
      beginTransaction: jest.fn().mockImplementation(() => mockAdapter.beginTransaction()),
      commit: jest.fn().mockImplementation(() => mockAdapter.commit()),
      rollback: jest.fn().mockImplementation(() => mockAdapter.rollback()),
    } as any;

    (Connection as jest.Mock).mockImplementation(() => mockConnection);
  });

  describe('begin', () => {
    it('should begin a transaction', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();

      expect(mockAdapter.isTransactionActive()).toBe(true);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'BEGIN TRANSACTION' });
    });

    it('should throw error if connection not established', async () => {
      mockConnection.isConnected = jest.fn().mockReturnValue(false);
      const transaction = new Transaction(mockConnection);

      await expect(transaction.begin()).rejects.toThrow('Database connection is not established');
    });
  });

  describe('commit', () => {
    it('should commit a transaction', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.commit();

      expect(mockAdapter.isTransactionActive()).toBe(false);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'COMMIT' });
    });

    it('should throw error if transaction already committed', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.commit();

      await expect(transaction.commit()).rejects.toThrow('Transaction already committed');
    });

    it('should throw error if transaction already rolled back', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.rollback();

      await expect(transaction.commit()).rejects.toThrow('Transaction already rolled back');
    });
  });

  describe('rollback', () => {
    it('should rollback a transaction', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.rollback();

      expect(mockAdapter.isTransactionActive()).toBe(false);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'ROLLBACK' });
    });

    it('should not throw if already rolled back', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.rollback();
      await transaction.rollback(); // Should be no-op

      expect(mockAdapter.getQueries().filter(q => q.sql === 'ROLLBACK').length).toBe(1);
    });

    it('should throw error if trying to rollback committed transaction', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.commit();

      await expect(transaction.rollback()).rejects.toThrow('Cannot rollback a committed transaction');
    });
  });

  describe('isActive', () => {
    it('should return true for active transaction', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();

      expect(transaction.isActive()).toBe(true);
    });

    it('should return false after commit', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.commit();

      expect(transaction.isActive()).toBe(false);
    });

    it('should return false after rollback', async () => {
      const transaction = new Transaction(mockConnection);
      await transaction.begin();
      await transaction.rollback();

      expect(transaction.isActive()).toBe(false);
    });
  });

  describe('run', () => {
    it('should execute callback and commit on success', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      
      const result = await Transaction.run(mockConnection, callback);

      expect(result).toBe('result');
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockAdapter.isTransactionActive()).toBe(false);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'BEGIN TRANSACTION' });
      expect(queries).toContainEqual({ sql: 'COMMIT' });
      expect(queries).not.toContainEqual({ sql: 'ROLLBACK' });
    });

    it('should rollback on error', async () => {
      const error = new Error('Test error');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(Transaction.run(mockConnection, callback)).rejects.toThrow('Test error');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockAdapter.isTransactionActive()).toBe(false);
      const queries = mockAdapter.getQueries();
      expect(queries).toContainEqual({ sql: 'BEGIN TRANSACTION' });
      expect(queries).toContainEqual({ sql: 'ROLLBACK' });
      expect(queries).not.toContainEqual({ sql: 'COMMIT' });
    });

    it('should pass transaction to callback', async () => {
      const callback = jest.fn().mockImplementation(async (transaction) => {
        expect(transaction).toBeInstanceOf(Transaction);
        expect(transaction.isActive()).toBe(true);
        return 'result';
      });

      await Transaction.run(mockConnection, callback);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

