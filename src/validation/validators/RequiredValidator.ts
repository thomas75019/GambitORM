import { BaseValidator, ValidationResult } from '../Validator';

/**
 * Validator that checks if a value is required (not null, undefined, or empty string)
 */
export class RequiredValidator extends BaseValidator {
  validate(value: any, field: string, model: any): ValidationResult {
    const isEmpty = value === null || value === undefined || value === '';
    return this.createResult(
      !isEmpty,
      this.message || `${field} is required`
    );
  }
}

