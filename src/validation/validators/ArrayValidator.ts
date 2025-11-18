import { BaseValidator, ValidationResult } from '../Validator';

export interface ArrayValidatorOptions {
  min?: number; // Minimum array length
  max?: number; // Maximum array length
  itemType?: 'string' | 'number' | 'boolean' | 'date' | 'object'; // Type of array items
  message?: string;
}

/**
 * Validator that checks if a value is an array and optionally validates its length and item types
 */
export class ArrayValidator extends BaseValidator {
  private min?: number;
  private max?: number;
  private itemType?: 'string' | 'number' | 'boolean' | 'date' | 'object';

  constructor(options?: ArrayValidatorOptions | number | string) {
    super(typeof options === 'string' ? options : undefined);
    
    if (typeof options === 'number') {
      // Just min length
      this.min = options;
    } else if (typeof options === 'string') {
      // Just message
    } else if (options) {
      this.min = options.min;
      this.max = options.max;
      this.itemType = options.itemType;
      if (options.message) {
        this.message = options.message;
      }
    }
  }

  validate(value: any, field: string, model: any): ValidationResult {
    // Skip validation if value is empty (let RequiredValidator handle it)
    if (value === null || value === undefined) {
      return this.createResult(true);
    }

    // Check if it's an array
    if (!Array.isArray(value)) {
      return this.createResult(
        false,
        this.message || `${field} must be an array`
      );
    }

    // Check minimum length
    if (this.min !== undefined && value.length < this.min) {
      return this.createResult(
        false,
        this.message || `${field} must have at least ${this.min} item(s)`
      );
    }

    // Check maximum length
    if (this.max !== undefined && value.length > this.max) {
      return this.createResult(
        false,
        this.message || `${field} must have at most ${this.max} item(s)`
      );
    }

    // Check item types if specified
    if (this.itemType) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        let isValid = false;

        switch (this.itemType) {
          case 'string':
            isValid = typeof item === 'string';
            break;
          case 'number':
            isValid = typeof item === 'number' && !isNaN(item);
            break;
          case 'boolean':
            isValid = typeof item === 'boolean';
            break;
          case 'date':
            isValid = item instanceof Date && !isNaN(item.getTime());
            break;
          case 'object':
            isValid = typeof item === 'object' && item !== null && !Array.isArray(item);
            break;
        }

        if (!isValid) {
          return this.createResult(
            false,
            this.message || `${field}[${i}] must be of type ${this.itemType}`
          );
        }
      }
    }

    return this.createResult(true);
  }
}

