import { BaseValidator, ValidationResult } from '../Validator';

/**
 * Validator that uses a custom validation function
 */
export class CustomValidator extends BaseValidator {
  constructor(
    private validatorFn: (value: any, field: string, model: any) => boolean | Promise<boolean>,
    message?: string
  ) {
    super(message);
  }

  async validate(value: any, field: string, model: any): Promise<ValidationResult> {
    try {
      const result = await this.validatorFn(value, field, model);
      return this.createResult(
        result,
        this.message || `${field} validation failed`
      );
    } catch (error) {
      return this.createResult(
        false,
        error instanceof Error ? error.message : `${field} validation error`
      );
    }
  }
}

