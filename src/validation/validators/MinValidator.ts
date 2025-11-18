import { BaseValidator, ValidationResult } from '../Validator';

/**
 * Validator that checks if a numeric value meets minimum value requirement
 */
export class MinValidator extends BaseValidator {
  constructor(private min: number, message?: string) {
    super(message);
  }

  validate(value: any, field: string, model: any): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return this.createResult(true); // Empty values are handled by RequiredValidator
    }

    const numValue = Number(value);
    if (isNaN(numValue)) {
      return this.createResult(false, `${field} must be a number`);
    }

    return this.createResult(
      numValue >= this.min,
      this.message || `${field} must be at least ${this.min}`
    );
  }
}

