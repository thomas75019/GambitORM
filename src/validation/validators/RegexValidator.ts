import { BaseValidator, ValidationResult } from '../Validator';

export interface RegexValidatorOptions {
  pattern: string | RegExp;
  flags?: string; // For RegExp flags (e.g., 'i' for case-insensitive)
  message?: string;
}

/**
 * Validator that checks if a value matches a regular expression pattern
 */
export class RegexValidator extends BaseValidator {
  private pattern: RegExp;

  constructor(pattern: string | RegExp | RegexValidatorOptions, flags?: string, message?: string) {
    super(message);
    
    // Handle different constructor signatures
    if (typeof pattern === 'string' || pattern instanceof RegExp) {
      this.pattern = pattern instanceof RegExp ? pattern : new RegExp(pattern, flags);
    } else {
      // Options object
      this.pattern = pattern.pattern instanceof RegExp 
        ? pattern.pattern 
        : new RegExp(pattern.pattern, pattern.flags);
      if (pattern.message) {
        this.message = pattern.message;
      }
    }
  }

  validate(value: any, field: string, model: any): ValidationResult {
    // Skip validation if value is empty (let RequiredValidator handle it)
    if (value === null || value === undefined || value === '') {
      return this.createResult(true);
    }

    // Convert to string if not already
    const stringValue = String(value);
    const isValid = this.pattern.test(stringValue);

    return this.createResult(
      isValid,
      this.message || `${field} does not match the required pattern`
    );
  }
}

