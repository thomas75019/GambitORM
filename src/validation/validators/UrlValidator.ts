import { BaseValidator, ValidationResult } from '../Validator';

export interface UrlValidatorOptions {
  protocols?: string[]; // Allowed protocols (default: ['http', 'https'])
  requireProtocol?: boolean; // Require protocol in URL (default: true)
  message?: string;
}

/**
 * Validator that checks if a value is a valid URL
 */
export class UrlValidator extends BaseValidator {
  private protocols: string[];
  private requireProtocol: boolean;

  constructor(options?: UrlValidatorOptions | string) {
    super(typeof options === 'string' ? options : undefined);
    
    if (typeof options === 'string') {
      this.protocols = ['http', 'https'];
      this.requireProtocol = true;
    } else {
      this.protocols = options?.protocols || ['http', 'https'];
      this.requireProtocol = options?.requireProtocol !== false;
      if (options?.message) {
        this.message = options.message;
      }
    }
  }

  validate(value: any, field: string, model: any): ValidationResult {
    // Skip validation if value is empty (let RequiredValidator handle it)
    if (value === null || value === undefined || value === '') {
      return this.createResult(true);
    }

    // Convert to string
    const stringValue = String(value);

    try {
      const url = new URL(stringValue);
      
      // Check protocol if required
      if (this.requireProtocol) {
        const protocol = url.protocol.replace(':', '');
        if (!this.protocols.includes(protocol)) {
          return this.createResult(
            false,
            this.message || `${field} must use one of the following protocols: ${this.protocols.join(', ')}`
          );
        }
      }

      return this.createResult(true);
    } catch (error) {
      return this.createResult(
        false,
        this.message || `${field} must be a valid URL`
      );
    }
  }
}

