/**
 * Base validator interface
 */
export interface Validator {
  validate(value: any, field: string, model: any): ValidationResult | Promise<ValidationResult>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validation error
 */
export class ValidationError extends Error {
  public errors: Record<string, string[]> = {};

  constructor(errors: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
    
    // Create a readable error message
    const messages = Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ');
    this.message = `Validation failed: ${messages}`;
  }

  /**
   * Get error messages for a specific field
   */
  getFieldErrors(field: string): string[] {
    return this.errors[field] || [];
  }

  /**
   * Check if a field has errors
   */
  hasFieldError(field: string): boolean {
    return field in this.errors && this.errors[field].length > 0;
  }
}

/**
 * Base validator class
 */
export abstract class BaseValidator implements Validator {
  protected message?: string;

  constructor(message?: string) {
    this.message = message;
  }

  abstract validate(value: any, field: string, model: any): ValidationResult | Promise<ValidationResult>;

  protected createResult(valid: boolean, message?: string): ValidationResult {
    return {
      valid,
      message: message || this.message,
    };
  }
}

