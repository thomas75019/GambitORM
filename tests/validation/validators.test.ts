import {
  RequiredValidator,
  EmailValidator,
  MinLengthValidator,
  MaxLengthValidator,
  MinValidator,
  MaxValidator,
  TypeValidator,
  CustomValidator,
} from '../../src/validation/validators';
import { ValidationError } from '../../src/validation/Validator';

describe('Validators', () => {
  describe('RequiredValidator', () => {
    it('should pass for non-empty values', () => {
      const validator = new RequiredValidator();
      expect(validator.validate('test', 'field', {}).valid).toBe(true);
      expect(validator.validate(0, 'field', {}).valid).toBe(true);
      expect(validator.validate(false, 'field', {}).valid).toBe(true);
    });

    it('should fail for empty values', () => {
      const validator = new RequiredValidator();
      expect(validator.validate('', 'field', {}).valid).toBe(false);
      expect(validator.validate(null, 'field', {}).valid).toBe(false);
      expect(validator.validate(undefined, 'field', {}).valid).toBe(false);
    });

    it('should use custom message', () => {
      const validator = new RequiredValidator('Custom message');
      const result = validator.validate('', 'field', {});
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Custom message');
    });
  });

  describe('EmailValidator', () => {
    it('should pass for valid emails', () => {
      const validator = new EmailValidator();
      expect(validator.validate('test@example.com', 'email', {}).valid).toBe(true);
      expect(validator.validate('user.name@domain.co.uk', 'email', {}).valid).toBe(true);
    });

    it('should fail for invalid emails', () => {
      const validator = new EmailValidator();
      expect(validator.validate('invalid', 'email', {}).valid).toBe(false);
      expect(validator.validate('invalid@', 'email', {}).valid).toBe(false);
      expect(validator.validate('@domain.com', 'email', {}).valid).toBe(false);
    });

    it('should pass for empty values (handled by RequiredValidator)', () => {
      const validator = new EmailValidator();
      expect(validator.validate('', 'email', {}).valid).toBe(true);
      expect(validator.validate(null, 'email', {}).valid).toBe(true);
    });
  });

  describe('MinLengthValidator', () => {
    it('should pass for strings meeting minimum length', () => {
      const validator = new MinLengthValidator(5);
      expect(validator.validate('hello', 'field', {}).valid).toBe(true);
      expect(validator.validate('hello world', 'field', {}).valid).toBe(true);
    });

    it('should fail for strings below minimum length', () => {
      const validator = new MinLengthValidator(5);
      expect(validator.validate('hi', 'field', {}).valid).toBe(false);
      expect(validator.validate('test', 'field', {}).valid).toBe(false);
    });
  });

  describe('MaxLengthValidator', () => {
    it('should pass for strings within maximum length', () => {
      const validator = new MaxLengthValidator(10);
      expect(validator.validate('hello', 'field', {}).valid).toBe(true);
      expect(validator.validate('hello worl', 'field', {}).valid).toBe(true); // Exactly 10 characters
    });

    it('should fail for strings exceeding maximum length', () => {
      const validator = new MaxLengthValidator(5);
      expect(validator.validate('hello world', 'field', {}).valid).toBe(false);
    });
  });

  describe('MinValidator', () => {
    it('should pass for numbers meeting minimum value', () => {
      const validator = new MinValidator(5);
      expect(validator.validate(5, 'field', {}).valid).toBe(true);
      expect(validator.validate(10, 'field', {}).valid).toBe(true);
      expect(validator.validate('5', 'field', {}).valid).toBe(true);
    });

    it('should fail for numbers below minimum value', () => {
      const validator = new MinValidator(5);
      expect(validator.validate(3, 'field', {}).valid).toBe(false);
      expect(validator.validate('2', 'field', {}).valid).toBe(false);
    });
  });

  describe('MaxValidator', () => {
    it('should pass for numbers within maximum value', () => {
      const validator = new MaxValidator(10);
      expect(validator.validate(5, 'field', {}).valid).toBe(true);
      expect(validator.validate(10, 'field', {}).valid).toBe(true);
    });

    it('should fail for numbers exceeding maximum value', () => {
      const validator = new MaxValidator(10);
      expect(validator.validate(15, 'field', {}).valid).toBe(false);
    });
  });

  describe('TypeValidator', () => {
    it('should validate string type', () => {
      const validator = new TypeValidator('string');
      expect(validator.validate('test', 'field', {}).valid).toBe(true);
      expect(validator.validate(123, 'field', {}).valid).toBe(false);
    });

    it('should validate number type', () => {
      const validator = new TypeValidator('number');
      expect(validator.validate(123, 'field', {}).valid).toBe(true);
      expect(validator.validate('123', 'field', {}).valid).toBe(false);
    });

    it('should validate boolean type', () => {
      const validator = new TypeValidator('boolean');
      expect(validator.validate(true, 'field', {}).valid).toBe(true);
      expect(validator.validate(false, 'field', {}).valid).toBe(true);
      expect(validator.validate(1, 'field', {}).valid).toBe(false);
    });

    it('should validate date type', () => {
      const validator = new TypeValidator('date');
      expect(validator.validate(new Date(), 'field', {}).valid).toBe(true);
      expect(validator.validate('2023-01-01', 'field', {}).valid).toBe(false);
    });

    it('should validate array type', () => {
      const validator = new TypeValidator('array');
      expect(validator.validate([1, 2, 3], 'field', {}).valid).toBe(true);
      expect(validator.validate({}, 'field', {}).valid).toBe(false);
    });

    it('should validate object type', () => {
      const validator = new TypeValidator('object');
      expect(validator.validate({}, 'field', {}).valid).toBe(true);
      expect(validator.validate([], 'field', {}).valid).toBe(false);
    });
  });

  describe('CustomValidator', () => {
    it('should use custom validation function', async () => {
      const validator = new CustomValidator((value) => value === 'valid');
      expect((await validator.validate('valid', 'field', {})).valid).toBe(true);
      expect((await validator.validate('invalid', 'field', {})).valid).toBe(false);
    });

    it('should support async validation', async () => {
      const validator = new CustomValidator(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return value.length > 5;
      });
      expect((await validator.validate('hello world', 'field', {})).valid).toBe(true);
      expect((await validator.validate('hi', 'field', {})).valid).toBe(false);
    });

    it('should handle errors in custom validator', async () => {
      const validator = new CustomValidator(() => {
        throw new Error('Validation error');
      });
      const result = await validator.validate('test', 'field', {});
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Validation error');
    });
  });
});

