import { BaseValidator, ValidationResult } from '../Validator';

/**
 * Validator that checks if a string value meets minimum length requirement
 */
export class MinLengthValidator extends BaseValidator {
  constructor(private minLength: number, message?: string) {
    super(message);
  }

  validate(value: any, field: string, model: any): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return this.createResult(true); // Empty values are handled by RequiredValidator
    }

    const length = typeof value === 'string' ? value.length : String(value).length;
    return this.createResult(
      length >= this.minLength,
      this.message || `${field} must be at least ${this.minLength} characters long`
    );
  }
}

