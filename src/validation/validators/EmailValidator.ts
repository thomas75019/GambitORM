import { BaseValidator, ValidationResult } from '../Validator';

/**
 * Validator that checks if a value is a valid email address
 */
export class EmailValidator extends BaseValidator {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validate(value: any, field: string, model: any): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return this.createResult(true); // Empty values are handled by RequiredValidator
    }

    const isValid = typeof value === 'string' && this.emailRegex.test(value);
    return this.createResult(
      isValid,
      this.message || `${field} must be a valid email address`
    );
  }
}

