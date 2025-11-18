import { BaseValidator, ValidationResult } from '../Validator';

/**
 * Validator that checks if a value matches a specific type
 */
export class TypeValidator extends BaseValidator {
  constructor(private expectedType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object', message?: string) {
    super(message);
  }

  validate(value: any, field: string, model: any): ValidationResult {
    if (value === null || value === undefined) {
      return this.createResult(true); // Null/undefined are handled by RequiredValidator
    }

    let isValid = false;

    switch (this.expectedType) {
      case 'string':
        isValid = typeof value === 'string';
        break;
      case 'number':
        isValid = typeof value === 'number' && !isNaN(value);
        break;
      case 'boolean':
        isValid = typeof value === 'boolean';
        break;
      case 'date':
        isValid = value instanceof Date && !isNaN(value.getTime());
        break;
      case 'array':
        isValid = Array.isArray(value);
        break;
      case 'object':
        isValid = typeof value === 'object' && !Array.isArray(value) && value !== null;
        break;
    }

    return this.createResult(
      isValid,
      this.message || `${field} must be of type ${this.expectedType}`
    );
  }
}

