import { DateValidator } from '../../../src/validation/validators/DateValidator';

describe('DateValidator', () => {
  it('should pass when value is null', () => {
    const validator = new DateValidator();
    const result = validator.validate(null, 'date', {});
    expect(result.valid).toBe(true);
  });

  it('should pass for valid Date object', () => {
    const validator = new DateValidator();
    const result = validator.validate(new Date(), 'date', {});
    expect(result.valid).toBe(true);
  });

  it('should pass for valid date string', () => {
    const validator = new DateValidator();
    const result = validator.validate('2024-01-01', 'date', {});
    expect(result.valid).toBe(true);
  });

  it('should pass for valid date number (timestamp)', () => {
    const validator = new DateValidator();
    const result = validator.validate(Date.now(), 'date', {});
    expect(result.valid).toBe(true);
  });

  it('should fail for invalid date string', () => {
    const validator = new DateValidator();
    const result = validator.validate('invalid-date', 'date', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('date');
  });

  it('should fail when date is before minimum', () => {
    const minDate = new Date('2024-01-01');
    const validator = new DateValidator({ min: minDate });
    const result = validator.validate(new Date('2023-12-31'), 'date', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('after');
  });

  it('should fail when date is after maximum', () => {
    const maxDate = new Date('2024-12-31');
    const validator = new DateValidator({ max: maxDate });
    const result = validator.validate(new Date('2025-01-01'), 'date', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('before');
  });

  it('should pass when date is within range', () => {
    const minDate = new Date('2024-01-01');
    const maxDate = new Date('2024-12-31');
    const validator = new DateValidator({ min: minDate, max: maxDate });
    const result = validator.validate(new Date('2024-06-15'), 'date', {});
    expect(result.valid).toBe(true);
  });

  it('should work with string dates for min/max', () => {
    const validator = new DateValidator({
      min: '2024-01-01',
      max: '2024-12-31',
    });
    const result = validator.validate(new Date('2024-06-15'), 'date', {});
    expect(result.valid).toBe(true);
  });
});

