import { QueryBuilder } from '../../src/query/QueryBuilder';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('QueryBuilder - Joins', () => {
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

  describe('join', () => {
    it('should generate INNER JOIN SQL', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.join('profiles', { left: 'users.id', right: 'profiles.user_id' });

      const { sql } = builder.toSQL();
      expect(sql).toContain('INNER JOIN');
      expect(sql).toContain('profiles');
      expect(sql).toContain('users.id = profiles.user_id');
    });

    it('should generate LEFT JOIN SQL', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.leftJoin('profiles', { left: 'users.id', right: 'profiles.user_id' });

      const { sql } = builder.toSQL();
      expect(sql).toContain('LEFT JOIN');
      expect(sql).toContain('profiles');
    });

    it('should generate RIGHT JOIN SQL', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.rightJoin('profiles', { left: 'users.id', right: 'profiles.user_id' });

      const { sql } = builder.toSQL();
      expect(sql).toContain('RIGHT JOIN');
    });

    it('should generate FULL JOIN SQL', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.fullJoin('profiles', { left: 'users.id', right: 'profiles.user_id' });

      const { sql } = builder.toSQL();
      expect(sql).toContain('FULL OUTER JOIN');
    });

    it('should support table aliases', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.join('profiles', { left: 'users.id', right: 'p.user_id' }, 'INNER', 'p');

      const { sql } = builder.toSQL();
      expect(sql).toContain('profiles AS p');
    });

    it('should support multiple joins', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder
        .join('profiles', { left: 'users.id', right: 'profiles.user_id' })
        .join('posts', { left: 'users.id', right: 'posts.user_id' });

      const { sql } = builder.toSQL();
      expect(sql).toContain('INNER JOIN profiles');
      expect(sql).toContain('INNER JOIN posts');
    });
  });

  describe('groupBy', () => {
    it('should generate GROUP BY SQL', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.groupBy('status');

      const { sql } = builder.toSQL();
      expect(sql).toContain('GROUP BY status');
    });

    it('should support multiple GROUP BY fields', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.groupBy(['status', 'role']);

      const { sql } = builder.toSQL();
      expect(sql).toContain('GROUP BY status, role');
    });
  });

  describe('having', () => {
    it('should generate HAVING SQL', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.groupBy('status');
      builder.having('COUNT(*)', '>', 5);

      const { sql, params } = builder.toSQL();
      expect(sql).toContain('HAVING');
      expect(sql).toContain('COUNT(*) > ?');
      expect(params).toContain(5);
    });

    it('should support multiple HAVING conditions', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder.groupBy('status');
      builder.having('COUNT(*)', '>', 5);
      builder.having('SUM(age)', '>', 100);

      const { sql, params } = builder.toSQL();
      expect(sql).toContain('HAVING COUNT(*) > ? AND SUM(age) > ?');
      expect(params).toEqual([5, 100]);
    });
  });

  describe('complex queries with joins', () => {
    it('should build complex query with join, where, groupBy, and having', () => {
      const builder = new QueryBuilder('users', mockConnection);
      builder
        .select(['users.id', 'users.name', 'COUNT(posts.id) as post_count'])
        .leftJoin('posts', { left: 'users.id', right: 'posts.user_id' })
        .where('users.active', '=', true)
        .groupBy(['users.id', 'users.name'])
        .having('COUNT(posts.id)', '>', 0)
        .orderBy('post_count', 'DESC')
        .limit(10);

      const { sql, params } = builder.toSQL();
      expect(sql).toContain('SELECT users.id, users.name, COUNT(posts.id) as post_count');
      expect(sql).toContain('LEFT JOIN');
      expect(sql).toContain('WHERE users.active = ?');
      expect(sql).toContain('GROUP BY users.id, users.name');
      expect(sql).toContain('HAVING COUNT(posts.id) > ?');
      expect(sql).toContain('ORDER BY post_count DESC');
      expect(sql).toContain('LIMIT 10');
      expect(params).toContain(true);
      expect(params).toContain(0);
    });
  });
});

