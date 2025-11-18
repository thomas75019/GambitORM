import { DatabaseConfig, QueryOptions, ModelAttributes, ModelInstance, QueryResult } from '../../src/types';

describe('Types', () => {
  describe('DatabaseConfig', () => {
    it('should accept MySQL configuration', () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        dialect: 'mysql',
      };

      expect(config.dialect).toBe('mysql');
    });

    it('should accept PostgreSQL configuration', () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        dialect: 'postgres',
      };

      expect(config.dialect).toBe('postgres');
    });

    it('should accept SQLite configuration', () => {
      const config: DatabaseConfig = {
        database: './test.db',
        dialect: 'sqlite',
      };

      expect(config.dialect).toBe('sqlite');
    });

    it('should accept pool configuration', () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        dialect: 'mysql',
        pool: {
          min: 2,
          max: 10,
          idle: 30000,
        },
      };

      expect(config.pool?.min).toBe(2);
      expect(config.pool?.max).toBe(10);
      expect(config.pool?.idle).toBe(30000);
    });
  });

  describe('QueryOptions', () => {
    it('should accept limit and offset', () => {
      const options: QueryOptions = {
        limit: 10,
        offset: 5,
      };

      expect(options.limit).toBe(10);
      expect(options.offset).toBe(5);
    });

    it('should accept orderBy as string', () => {
      const options: QueryOptions = {
        orderBy: 'id ASC',
      };

      expect(options.orderBy).toBe('id ASC');
    });

    it('should accept orderBy as array', () => {
      const options: QueryOptions = {
        orderBy: [
          { column: 'name', direction: 'ASC' },
          { column: 'id', direction: 'DESC' },
        ],
      };

      expect(Array.isArray(options.orderBy)).toBe(true);
    });

    it('should accept where conditions', () => {
      const options: QueryOptions = {
        where: {
          active: true,
          age: 25,
        },
      };

      expect(options.where?.active).toBe(true);
      expect(options.where?.age).toBe(25);
    });
  });

  describe('ModelAttributes', () => {
    it('should accept any key-value pairs', () => {
      const attributes: ModelAttributes = {
        name: 'John',
        age: 30,
        active: true,
      };

      expect(attributes.name).toBe('John');
      expect(attributes.age).toBe(30);
      expect(attributes.active).toBe(true);
    });
  });

  describe('ModelInstance', () => {
    it('should accept id and other properties', () => {
      const instance: ModelInstance = {
        id: 1,
        name: 'John',
        email: 'john@example.com',
      };

      expect(instance.id).toBe(1);
      expect(instance.name).toBe('John');
    });
  });

  describe('QueryResult', () => {
    it('should have rows array', () => {
      const result: QueryResult = {
        rows: [{ id: 1, name: 'John' }],
      };

      expect(result.rows).toHaveLength(1);
    });

    it('should have optional rowCount', () => {
      const result: QueryResult = {
        rows: [],
        rowCount: 5,
      };

      expect(result.rowCount).toBe(5);
    });

    it('should have optional insertId', () => {
      const result: QueryResult = {
        rows: [],
        insertId: 123,
      };

      expect(result.insertId).toBe(123);
    });
  });
});

