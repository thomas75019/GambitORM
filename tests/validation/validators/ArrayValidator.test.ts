import { ArrayValidator } from '../../../src/validation/validators/ArrayValidator';

describe('ArrayValidator', () => {
  it('should pass when value is null', () => {
    const validator = new ArrayValidator();
    const result = validator.validate(null, 'tags', {});
    expect(result.valid).toBe(true);
  });

  it('should pass for valid array', () => {
    const validator = new ArrayValidator();
    const result = validator.validate([1, 2, 3], 'tags', {});
    expect(result.valid).toBe(true);
  });

  it('should fail for non-array value', () => {
    const validator = new ArrayValidator();
    const result = validator.validate('not-an-array', 'tags', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('array');
  });

  it('should fail when array is shorter than minimum', () => {
    const validator = new ArrayValidator({ min: 3 });
    const result = validator.validate([1, 2], 'tags', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at least');
  });

  it('should fail when array is longer than maximum', () => {
    const validator = new ArrayValidator({ max: 2 });
    const result = validator.validate([1, 2, 3], 'tags', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('at most');
  });

  it('should pass when array length is within range', () => {
    const validator = new ArrayValidator({ min: 1, max: 5 });
    const result = validator.validate([1, 2, 3], 'tags', {});
    expect(result.valid).toBe(true);
  });

  it('should validate array item types - string', () => {
    const validator = new ArrayValidator({ itemType: 'string' });
    const result1 = validator.validate(['a', 'b'], 'tags', {});
    expect(result1.valid).toBe(true);
    
    const result2 = validator.validate(['a', 1], 'tags', {});
    expect(result2.valid).toBe(false);
  });

  it('should validate array item types - number', () => {
    const validator = new ArrayValidator({ itemType: 'number' });
    const result1 = validator.validate([1, 2, 3], 'numbers', {});
    expect(result1.valid).toBe(true);
    
    const result2 = validator.validate([1, '2'], 'numbers', {});
    expect(result2.valid).toBe(false);
  });

  it('should validate array item types - boolean', () => {
    const validator = new ArrayValidator({ itemType: 'boolean' });
    const result1 = validator.validate([true, false], 'flags', {});
    expect(result1.valid).toBe(true);
    
    const result2 = validator.validate([true, 'false'], 'flags', {});
    expect(result2.valid).toBe(false);
  });

  it('should validate array item types - date', () => {
    const validator = new ArrayValidator({ itemType: 'date' });
    const result1 = validator.validate([new Date(), new Date()], 'dates', {});
    expect(result1.valid).toBe(true);
    
    const result2 = validator.validate([new Date(), '2024-01-01'], 'dates', {});
    expect(result2.valid).toBe(false);
  });

  it('should validate array item types - object', () => {
    const validator = new ArrayValidator({ itemType: 'object' });
    const result1 = validator.validate([{ a: 1 }, { b: 2 }], 'items', {});
    expect(result1.valid).toBe(true);
    
    const result2 = validator.validate([{ a: 1 }, [1, 2]], 'items', {});
    expect(result2.valid).toBe(false);
  });

  it('should work with number constructor (min length)', () => {
    const validator = new ArrayValidator(2);
    const result1 = validator.validate([1, 2, 3], 'tags', {});
    expect(result1.valid).toBe(true);
    
    const result2 = validator.validate([1], 'tags', {});
    expect(result2.valid).toBe(false);
  });
});

