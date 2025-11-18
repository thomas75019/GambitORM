import { BaseValidator, ValidationResult } from '../Validator';

export interface DateValidatorOptions {
  format?: string; // Date format string (e.g., 'YYYY-MM-DD')
  min?: Date | string; // Minimum date
  max?: Date | string; // Maximum date
  message?: string;
}

/**
 * Validator that checks if a value is a valid date and optionally within a range
 */
export class DateValidator extends BaseValidator {
  private format?: string;
  private min?: Date;
  private max?: Date;

  constructor(options?: DateValidatorOptions | string) {
    super(typeof options === 'string' ? options : undefined);
    
    if (typeof options === 'string') {
      // Just a message
    } else if (options) {
      this.format = options.format;
      this.min = options.min instanceof Date ? options.min : (options.min ? new Date(options.min) : undefined);
      this.max = options.max instanceof Date ? options.max : (options.max ? new Date(options.max) : undefined);
      if (options.message) {
        this.message = options.message;
      }
    }
  }

  validate(value: any, field: string, model: any): ValidationResult {
    // Skip validation if value is empty (let RequiredValidator handle it)
    if (value === null || value === undefined || value === '') {
      return this.createResult(true);
    }

    let date: Date;

    // Try to parse the date
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else {
      return this.createResult(
        false,
        this.message || `${field} must be a valid date`
      );
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return this.createResult(
        false,
        this.message || `${field} must be a valid date`
      );
    }

    // Check minimum date
    if (this.min && date < this.min) {
      return this.createResult(
        false,
        this.message || `${field} must be after ${this.min.toISOString()}`
      );
    }

    // Check maximum date
    if (this.max && date > this.max) {
      return this.createResult(
        false,
        this.message || `${field} must be before ${this.max.toISOString()}`
      );
    }

    return this.createResult(true);
  }
}

