import { RegexValidator } from '../../../src/validation/validators/RegexValidator';

describe('RegexValidator', () => {
  it('should pass when value is null', () => {
    const validator = new RegexValidator(/^[A-Z]+$/);
    const result = validator.validate(null, 'code', {});
    expect(result.valid).toBe(true);
  });

  it('should pass when value matches pattern', () => {
    const validator = new RegexValidator(/^[A-Z]+$/);
    const result = validator.validate('ABC', 'code', {});
    expect(result.valid).toBe(true);
  });

  it('should fail when value does not match pattern', () => {
    const validator = new RegexValidator(/^[A-Z]+$/);
    const result = validator.validate('abc', 'code', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('pattern');
  });

  it('should work with string pattern', () => {
    const validator = new RegexValidator('^[0-9]+$');
    const result = validator.validate('123', 'number', {});
    expect(result.valid).toBe(true);
  });

  it('should work with flags', () => {
    const validator = new RegexValidator(/^[a-z]+$/i);
    const result = validator.validate('ABC', 'code', {});
    expect(result.valid).toBe(true);
  });

  it('should work with options object', () => {
    const validator = new RegexValidator({
      pattern: /^[0-9]{4}$/,
      message: 'Must be 4 digits',
    });
    const result = validator.validate('1234', 'code', {});
    expect(result.valid).toBe(true);
  });

  it('should convert non-string values to string', () => {
    const validator = new RegexValidator(/^[0-9]+$/);
    const result = validator.validate(123, 'number', {});
    expect(result.valid).toBe(true);
  });
});

