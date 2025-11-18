import { ValidationEngine, ValidationError } from '../../src/validation';
import { RequiredValidator, EmailValidator, MinLengthValidator } from '../../src/validation/validators';
import { Model } from '../../src/orm/Model';
import { Connection } from '../../src/connection/Connection';
import { MockAdapter } from '../__mocks__/BaseAdapter';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('ValidationEngine', () => {
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

  class TestModel extends Model {
    static tableName = 'test';
    name!: string;
    email!: string;
  }

  describe('validate', () => {
    it('should pass validation for valid data', async () => {
      const model = new TestModel();
      model.name = 'John Doe';
      model.email = 'john@example.com';

      const rules = {
        name: [new RequiredValidator(), new MinLengthValidator(3)],
        email: [new RequiredValidator(), new EmailValidator()],
      };

      await expect(ValidationEngine.validate(model, rules)).resolves.not.toThrow();
    });

    it('should throw ValidationError for invalid data', async () => {
      const model = new TestModel();
      model.name = 'Jo'; // Too short
      model.email = 'invalid-email'; // Invalid email

      const rules = {
        name: [new RequiredValidator(), new MinLengthValidator(3)],
        email: [new RequiredValidator(), new EmailValidator()],
      };

      await expect(ValidationEngine.validate(model, rules)).rejects.toThrow(ValidationError);
    });

    it('should collect all validation errors', async () => {
      const model = new TestModel();
      model.name = '';
      model.email = 'invalid';

      const rules = {
        name: [new RequiredValidator()],
        email: [new EmailValidator()],
      };

      try {
        await ValidationEngine.validate(model, rules);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.errors).toHaveProperty('name');
        expect(validationError.errors).toHaveProperty('email');
      }
    });

    it('should handle multiple validators per field', async () => {
      const model = new TestModel();
      model.name = 'Jo'; // Too short and required

      const rules = {
        name: [
          new RequiredValidator(),
          new MinLengthValidator(5, 'Name must be at least 5 characters'),
        ],
      };

      try {
        await ValidationEngine.validate(model, rules);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.errors.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateField', () => {
    it('should validate a single field', async () => {
      const model = new TestModel();
      const validators = [new RequiredValidator(), new EmailValidator()];

      await expect(
        ValidationEngine.validateField('test@example.com', 'email', model, validators)
      ).resolves.not.toThrow();
    });

    it('should throw ValidationError for invalid field', async () => {
      const model = new TestModel();
      const validators = [new RequiredValidator(), new EmailValidator()];

      await expect(
        ValidationEngine.validateField('invalid-email', 'email', model, validators)
      ).rejects.toThrow(ValidationError);
    });
  });
});

