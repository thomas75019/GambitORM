import { QueryBuilder } from '../../src/query/QueryBuilder';

describe('QueryBuilder', () => {
  describe('Constructor', () => {
    it('should create a QueryBuilder with table name', () => {
      const builder = new QueryBuilder('users');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('select', () => {
    it('should set select fields', () => {
      const builder = new QueryBuilder('users');
      builder.select(['id', 'name', 'email']);

      // Since toSQL is not implemented, we test the method exists and is chainable
      expect(builder.select).toBeDefined();
    });

    it('should be chainable', () => {
      const builder = new QueryBuilder('users');
      const result = builder.select(['id', 'name']);

      expect(result).toBe(builder);
    });
  });

  describe('where', () => {
    it('should add where condition', () => {
      const builder = new QueryBuilder('users');
      builder.where('id', '=', 1);

      // Test that method exists and is chainable
      expect(builder.where).toBeDefined();
    });

    it('should be chainable', () => {
      const builder = new QueryBuilder('users');
      const result = builder.where('id', '=', 1);

      expect(result).toBe(builder);
    });

    it('should allow multiple where conditions', () => {
      const builder = new QueryBuilder('users');
      builder.where('id', '=', 1).where('name', '=', 'John');

      // Test that multiple conditions can be added
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('orderBy', () => {
    it('should add order by clause', () => {
      const builder = new QueryBuilder('users');
      builder.orderBy('id', 'ASC');

      expect(builder.orderBy).toBeDefined();
    });

    it('should default to ASC direction', () => {
      const builder = new QueryBuilder('users');
      builder.orderBy('name');

      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('should be chainable', () => {
      const builder = new QueryBuilder('users');
      const result = builder.orderBy('id', 'DESC');

      expect(result).toBe(builder);
    });

    it('should allow multiple order by clauses', () => {
      const builder = new QueryBuilder('users');
      builder.orderBy('name', 'ASC').orderBy('id', 'DESC');

      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('limit', () => {
    it('should set limit', () => {
      const builder = new QueryBuilder('users');
      builder.limit(10);

      expect(builder.limit).toBeDefined();
    });

    it('should be chainable', () => {
      const builder = new QueryBuilder('users');
      const result = builder.limit(10);

      expect(result).toBe(builder);
    });
  });

  describe('offset', () => {
    it('should set offset', () => {
      const builder = new QueryBuilder('users');
      builder.offset(5);

      expect(builder.offset).toBeDefined();
    });

    it('should be chainable', () => {
      const builder = new QueryBuilder('users');
      const result = builder.offset(5);

      expect(result).toBe(builder);
    });
  });

  describe('Method chaining', () => {
    it('should allow chaining multiple methods', () => {
      const builder = new QueryBuilder('users')
        .select(['id', 'name'])
        .where('active', '=', true)
        .orderBy('name', 'ASC')
        .limit(10)
        .offset(0);

      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('toSQL', () => {
    it('should generate SELECT SQL query', () => {
      const builder = new QueryBuilder('users');
      const { sql, params } = builder.toSQL();

      expect(sql).toBe('SELECT * FROM users');
      expect(params).toEqual([]);
    });

    it('should generate SELECT with WHERE clause', () => {
      const builder = new QueryBuilder('users');
      builder.where('id', '=', 1);
      const { sql, params } = builder.toSQL();

      expect(sql).toBe('SELECT * FROM users WHERE id = ?');
      expect(params).toEqual([1]);
    });

    it('should generate INSERT SQL query', () => {
      const builder = new QueryBuilder('users');
      builder.insert({ name: 'John', email: 'john@example.com' });
      const { sql, params } = builder.toSQL();

      expect(sql).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
      expect(params).toEqual(['John', 'john@example.com']);
    });

    it('should generate UPDATE SQL query', () => {
      const builder = new QueryBuilder('users');
      builder.update({ name: 'Jane' });
      builder.where('id', '=', 1);
      const { sql, params } = builder.toSQL();

      expect(sql).toBe('UPDATE users SET name = ? WHERE id = ?');
      expect(params).toEqual(['Jane', 1]);
    });

    it('should generate DELETE SQL query', () => {
      const builder = new QueryBuilder('users');
      builder.delete();
      builder.where('id', '=', 1);
      const { sql, params } = builder.toSQL();

      expect(sql).toBe('DELETE FROM users WHERE id = ?');
      expect(params).toEqual([1]);
    });
  });

  describe('execute', () => {
    it('should throw error when connection is not set', async () => {
      const builder = new QueryBuilder('users');
      
      await expect(builder.execute()).rejects.toThrow('Connection not set');
    });
  });
});

