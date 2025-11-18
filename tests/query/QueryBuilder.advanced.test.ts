import { QueryBuilder } from '../../src/query/QueryBuilder';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('QueryBuilder - Advanced Features', () => {
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

  describe('whereIn / whereNotIn', () => {
    it('should build WHERE IN clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereIn('id', [1, 2, 3]);

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE id IN');
      expect(sql).toContain('(?, ?, ?)');
      expect(params).toEqual([1, 2, 3]);
    });

    it('should build WHERE NOT IN clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereNotIn('id', [1, 2, 3]);

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE id NOT IN');
      expect(params).toEqual([1, 2, 3]);
    });

    it('should handle empty IN array', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereIn('id', []);

      const { sql } = query.toSQL();
      expect(sql).toContain('1 = 0'); // Always false
    });
  });

  describe('whereNull / whereNotNull', () => {
    it('should build WHERE NULL clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereNull('deleted_at');

      const { sql } = query.toSQL();
      expect(sql).toContain('WHERE deleted_at IS NULL');
    });

    it('should build WHERE NOT NULL clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereNotNull('email');

      const { sql } = query.toSQL();
      expect(sql).toContain('WHERE email IS NOT NULL');
    });
  });

  describe('whereBetween / whereNotBetween', () => {
    it('should build WHERE BETWEEN clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereBetween('age', 18, 65);

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE age BETWEEN ? AND ?');
      expect(params).toEqual([18, 65]);
    });

    it('should build WHERE NOT BETWEEN clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereNotBetween('age', 18, 65);

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE age NOT BETWEEN ? AND ?');
      expect(params).toEqual([18, 65]);
    });
  });

  describe('whereLike / whereNotLike', () => {
    it('should build WHERE LIKE clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereLike('name', '%john%');

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE name LIKE ?');
      expect(params).toEqual(['%john%']);
    });

    it('should build WHERE NOT LIKE clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereNotLike('email', '%test%');

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE email NOT LIKE ?');
      expect(params).toEqual(['%test%']);
    });
  });

  describe('orWhere', () => {
    it('should build OR WHERE clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.where('status', '=', 'active');
      query.orWhere('status', '=', 'pending');

      const { sql, params } = query.toSQL();
      expect(sql).toContain('OR');
      expect(params).toEqual(['active', 'pending']);
    });
  });

  describe('whereRaw', () => {
    it('should build raw WHERE clause', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.whereRaw('age > ? AND status = ?', [18, 'active']);

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE age > ? AND status = ?');
      expect(params).toEqual([18, 'active']);
    });
  });

  describe('whereSubquery', () => {
    it('should build WHERE with subquery', () => {
      const query = new QueryBuilder('users', mockConnection);
      const subquery = QueryBuilder.subquery('orders', mockConnection);
      subquery.select(['user_id']).where('total', '>', 1000);

      query.whereSubquery('id', 'IN', subquery);

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE id IN');
      expect(sql).toContain('SELECT user_id FROM orders');
      expect(params).toEqual([1000]);
    });
  });

  describe('aggregate functions', () => {
    it('should build COUNT query', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.count();

      const { sql } = query.toSQL();
      expect(sql).toContain('SELECT COUNT(*)');
    });

    it('should build COUNT with field and alias', () => {
      const query = new QueryBuilder('users', mockConnection);
      query.count('id', 'user_count');

      const { sql } = query.toSQL();
      expect(sql).toContain('SELECT COUNT(id) AS user_count');
    });

    it('should build SUM query', () => {
      const query = new QueryBuilder('orders', mockConnection);
      query.sum('total', 'total_amount');

      const { sql } = query.toSQL();
      expect(sql).toContain('SELECT SUM(total) AS total_amount');
    });

    it('should build AVG query', () => {
      const query = new QueryBuilder('orders', mockConnection);
      query.avg('total');

      const { sql } = query.toSQL();
      expect(sql).toContain('SELECT AVG(total)');
    });

    it('should build MAX query', () => {
      const query = new QueryBuilder('orders', mockConnection);
      query.max('total', 'max_total');

      const { sql } = query.toSQL();
      expect(sql).toContain('SELECT MAX(total) AS max_total');
    });

    it('should build MIN query', () => {
      const query = new QueryBuilder('orders', mockConnection);
      query.min('total');

      const { sql } = query.toSQL();
      expect(sql).toContain('SELECT MIN(total)');
    });
  });

  describe('raw SQL execution', () => {
    it('should execute raw SQL query', async () => {
      mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'John' }], rowCount: 1 });

      const result = await QueryBuilder.raw(mockConnection, 'SELECT * FROM users WHERE id = ?', [1]);

      expect(result.rows).toHaveLength(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
    });
  });

  describe('complex queries', () => {
    it('should build complex query with multiple conditions', () => {
      const query = new QueryBuilder('users', mockConnection);
      query
        .where('status', '=', 'active')
        .whereIn('role', ['admin', 'user'])
        .whereNotNull('email')
        .whereBetween('age', 18, 65)
        .orWhere('status', '=', 'pending')
        .groupBy('role')
        .having('COUNT(*)', '>', 5)
        .orderBy('name', 'ASC')
        .limit(10);

      const { sql, params } = query.toSQL();
      expect(sql).toContain('WHERE');
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('HAVING');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT 10');
      expect(params.length).toBeGreaterThan(0);
    });
  });
});

