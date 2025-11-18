import { QueryLogger, LoggedQuery } from '../../src/logging/QueryLogger';
import { QueryResult } from '../../src/types';

describe('QueryLogger', () => {
  let logger: QueryLogger;

  beforeEach(() => {
    logger = new QueryLogger();
    logger.clear();
  });

  describe('enable/disable', () => {
    it('should be disabled by default', () => {
      expect(logger.isEnabled()).toBe(false);
    });

    it('should enable logging', () => {
      logger.enable();
      expect(logger.isEnabled()).toBe(true);
    });

    it('should disable logging', () => {
      logger.enable();
      logger.disable();
      expect(logger.isEnabled()).toBe(false);
    });

    it('should enable with options', () => {
      logger.enable({ logToConsole: true, maxQueries: 100 });
      expect(logger.isEnabled()).toBe(true);
    });
  });

  describe('log()', () => {
    it('should not log when disabled', () => {
      logger.log('SELECT * FROM users', [], 10);
      expect(logger.getQueries().length).toBe(0);
    });

    it('should log queries when enabled', () => {
      logger.enable();
      logger.log('SELECT * FROM users', [], 10);
      expect(logger.getQueries().length).toBe(1);
    });

    it('should log query with parameters', () => {
      logger.enable();
      logger.log('SELECT * FROM users WHERE id = ?', [1], 15);
      const queries = logger.getQueries();
      expect(queries.length).toBe(1);
      expect(queries[0].params).toEqual([1]);
    });

    it('should log query execution time', () => {
      logger.enable();
      logger.log('SELECT * FROM users', [], 25);
      const queries = logger.getQueries();
      expect(queries[0].executionTime).toBe(25);
    });

    it('should log query result', () => {
      logger.enable();
      const result: QueryResult = {
        rows: [{ id: 1, name: 'John' }],
        rowCount: 1,
      };
      logger.log('SELECT * FROM users', [], 10, result);
      const queries = logger.getQueries();
      expect(queries[0].result?.rowCount).toBe(1);
    });

    it('should log query errors', () => {
      logger.enable();
      const error = new Error('Query failed');
      logger.log('SELECT * FROM users', [], 10, undefined, error);
      const queries = logger.getQueries();
      expect(queries[0].error).toBe(error);
    });

    it('should track slow queries', () => {
      logger.enable({ slowQueryThreshold: 100 });
      logger.log('SELECT * FROM users', [], 150);
      expect(logger.getSlowQueries().length).toBe(1);
    });

    it('should not track fast queries as slow', () => {
      logger.enable({ slowQueryThreshold: 100 });
      logger.log('SELECT * FROM users', [], 50);
      expect(logger.getSlowQueries().length).toBe(0);
    });

    it('should limit max queries', () => {
      logger.enable({ maxQueries: 5 });
      for (let i = 0; i < 10; i++) {
        logger.log(`SELECT * FROM users WHERE id = ${i}`, [], 10);
      }
      expect(logger.getQueries().length).toBe(5);
    });
  });

  describe('getQueries()', () => {
    it('should return all logged queries', () => {
      logger.enable();
      logger.log('SELECT * FROM users', [], 10);
      logger.log('SELECT * FROM posts', [], 20);
      const queries = logger.getQueries();
      expect(queries.length).toBe(2);
    });

    it('should return a copy of queries array', () => {
      logger.enable();
      logger.log('SELECT * FROM users', [], 10);
      const queries1 = logger.getQueries();
      const queries2 = logger.getQueries();
      expect(queries1).not.toBe(queries2);
    });
  });

  describe('getLastQuery()', () => {
    it('should return null when no queries logged', () => {
      expect(logger.getLastQuery()).toBeNull();
    });

    it('should return the last logged query', () => {
      logger.enable();
      logger.log('SELECT * FROM users', [], 10);
      logger.log('SELECT * FROM posts', [], 20);
      const lastQuery = logger.getLastQuery();
      expect(lastQuery?.sql).toContain('posts');
      expect(lastQuery?.executionTime).toBe(20);
    });
  });

  describe('clear()', () => {
    it('should clear all queries', () => {
      logger.enable();
      logger.log('SELECT * FROM users', [], 10);
      logger.log('SELECT * FROM posts', [], 20);
      logger.clear();
      expect(logger.getQueries().length).toBe(0);
      expect(logger.getSlowQueries().length).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      logger.enable({ slowQueryThreshold: 100 });
      logger.log('SELECT * FROM users', [], 10);
      logger.log('SELECT * FROM posts', [], 20);
      logger.log('SELECT * FROM comments', [], 150); // Slow query
      logger.log('SELECT * FROM tags', [], 30, undefined, new Error('Failed')); // Error

      const stats = logger.getStats();
      expect(stats.totalQueries).toBe(4);
      expect(stats.totalExecutionTime).toBe(210);
      expect(stats.averageExecutionTime).toBe(52.5);
      expect(stats.slowQueries).toBe(1);
      expect(stats.errors).toBe(1);
    });

    it('should return zero stats when no queries', () => {
      const stats = logger.getStats();
      expect(stats.totalQueries).toBe(0);
      expect(stats.totalExecutionTime).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.slowQueries).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe('formatSQL()', () => {
    it('should format SQL with parameters', () => {
      logger.enable();
      logger.log('SELECT * FROM users WHERE id = ? AND name = ?', [1, 'John'], 10);
      const queries = logger.getQueries();
      expect(queries[0].sql).toContain('1');
      expect(queries[0].sql).toContain("'John'");
    });

    it('should handle null values', () => {
      logger.enable();
      logger.log('SELECT * FROM users WHERE deleted_at = ?', [null], 10);
      const queries = logger.getQueries();
      expect(queries[0].sql).toContain('NULL');
    });

    it('should handle date values', () => {
      logger.enable();
      const date = new Date('2024-01-01');
      logger.log('SELECT * FROM users WHERE created_at = ?', [date], 10);
      const queries = logger.getQueries();
      expect(queries[0].sql).toContain(date.toISOString());
    });

    it('should handle array values', () => {
      logger.enable();
      logger.log('SELECT * FROM users WHERE id IN (?)', [[1, 2, 3]], 10);
      const queries = logger.getQueries();
      expect(queries[0].sql).toContain('[1, 2, 3]');
    });
  });

  describe('static formatSQL()', () => {
    it('should format SQL for readability', () => {
      const sql = 'SELECT * FROM users WHERE id = 1';
      const formatted = QueryLogger.formatSQL(sql);
      // Check that it contains line breaks (newlines)
      expect(formatted).toMatch(/\n/);
      // Check that major keywords are present
      expect(formatted.toLowerCase()).toContain('select');
      expect(formatted.toLowerCase()).toContain('from');
      expect(formatted.toLowerCase()).toContain('where');
    });
  });
});

