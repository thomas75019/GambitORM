import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';
import {
  RequiredValidator,
  EmailValidator,
  MinLengthValidator,
  ValidationError,
} from '../../src/validation';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('Model - Validation', () => {
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
    Model.setConnection(mockConnection);
  });

  class User extends Model {
    static tableName = 'users';
    static validationRules = {
      name: [new RequiredValidator(), new MinLengthValidator(3)],
      email: [new RequiredValidator(), new EmailValidator()],
    };

    id!: number;
    name!: string;
    email!: string;
  }

  describe('validate', () => {
    it('should validate model instance', async () => {
      const user = new User();
      user.name = 'John Doe';
      user.email = 'john@example.com';

      await expect(user.validate()).resolves.not.toThrow();
    });

    it('should throw ValidationError for invalid data', async () => {
      const user = new User();
      user.name = 'Jo'; // Too short
      user.email = 'invalid-email';

      await expect(user.validate()).rejects.toThrow(ValidationError);
    });
  });

  describe('save with validation', () => {
    it('should validate before saving', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const user = new User();
      user.name = 'John Doe';
      user.email = 'john@example.com';

      await expect(user.save()).resolves.not.toThrow();
    });

    it('should throw ValidationError before saving invalid data', async () => {
      const user = new User();
      user.name = 'Jo'; // Too short
      user.email = 'invalid-email';

      await expect(user.save()).rejects.toThrow(ValidationError);
    });

    it('should skip validation when skipValidation is true', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const user = new User();
      user.name = 'Jo'; // Invalid but should be skipped
      user.email = 'invalid-email';

      await expect(user.save({ skipValidation: true })).resolves.not.toThrow();
    });
  });

  describe('create with validation', () => {
    it('should validate before creating', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      await expect(
        User.create({
          name: 'John Doe',
          email: 'john@example.com',
        })
      ).resolves.not.toThrow();
    });

    it('should throw ValidationError before creating invalid data', async () => {
      await expect(
        User.create({
          name: 'Jo', // Too short
          email: 'invalid-email',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should skip validation when skipValidation is true', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      await expect(
        User.create(
          {
            name: 'Jo', // Invalid but should be skipped
            email: 'invalid-email',
          },
          { skipValidation: true }
        )
      ).resolves.not.toThrow();
    });
  });

  describe('update with validation', () => {
    it('should validate before updating', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      await expect(
        user.update({
          name: 'Jane Doe',
          email: 'jane@example.com',
        })
      ).resolves.not.toThrow();
    });

    it('should throw ValidationError before updating with invalid data', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });

      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      await expect(
        user.update({
          name: 'Jo', // Too short
          email: 'invalid-email',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should skip validation when skipValidation is true', async () => {
      mockAdapter.setQueryResult({ rows: [], insertId: 1 });
      mockAdapter.setQueryResult({ rows: [], rowCount: 1 });

      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
      });

      await expect(
        user.update(
          {
            name: 'Jo', // Invalid but should be skipped
            email: 'invalid-email',
          },
          { skipValidation: true }
        )
      ).resolves.not.toThrow();
    });
  });
});

