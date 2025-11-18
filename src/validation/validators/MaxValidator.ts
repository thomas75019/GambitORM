import { BaseValidator, ValidationResult } from '../Validator';

/**
 * Validator that checks if a numeric value meets maximum value requirement
 */
export class MaxValidator extends BaseValidator {
  constructor(private max: number, message?: string) {
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
      numValue <= this.max,
      this.message || `${field} must be at most ${this.max}`
    );
  }
}

