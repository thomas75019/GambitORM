import { Validator, ValidationError } from './Validator';
import { Model } from '../orm/Model';

/**
 * Validation engine that runs validators on model data
 */
export class ValidationEngine {
  /**
   * Validate a model instance
   */
  static async validate(
    model: Model,
    rules: Record<string, Validator[]>
  ): Promise<void> {
    const errors: Record<string, string[]> = {};

    for (const [field, validators] of Object.entries(rules)) {
      const value = (model as any)[field];
      const fieldErrors: string[] = [];

      for (const validator of validators) {
        const resultPromise = validator.validate(value, field, model);
        const result = resultPromise instanceof Promise ? await resultPromise : resultPromise;
        if (!result.valid && result.message) {
          fieldErrors.push(result.message);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }
  }

  /**
   * Validate a single field
   */
  static async validateField(
    value: any,
    field: string,
    model: Model,
    validators: Validator[]
  ): Promise<void> {
    const errors: string[] = [];

    for (const validator of validators) {
      const resultPromise = validator.validate(value, field, model);
      const result = resultPromise instanceof Promise ? await resultPromise : resultPromise;
      if (!result.valid && result.message) {
        errors.push(result.message);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError({ [field]: errors });
    }
  }
}

