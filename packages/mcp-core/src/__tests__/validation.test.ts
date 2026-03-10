import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validateInput,
  safeParse,
  createToolSchema,
  formatValidationErrors,
  CommonSchemas,
} from '../utils/validation.js';

describe('validateInput', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().positive(),
  });

  it('should return success for valid input', () => {
    const result = validateInput(schema, { name: 'John', age: 30 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'John', age: 30 });
    expect(result.errors).toBeUndefined();
  });

  it('should return errors for invalid input', () => {
    const result = validateInput(schema, { name: 'John', age: -5 });
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should return errors for missing required fields', () => {
    const result = validateInput(schema, { name: 'John' });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('safeParse', () => {
  const schema = z.string().min(1);

  it('should return parsed value for valid input', () => {
    const result = safeParse(schema, 'hello');
    expect(result).toBe('hello');
  });

  it('should return undefined for invalid input', () => {
    const result = safeParse(schema, '');
    expect(result).toBeUndefined();
  });

  it('should return undefined for wrong type', () => {
    const result = safeParse(schema, 123);
    expect(result).toBeUndefined();
  });
});

describe('createToolSchema', () => {
  it('should create a valid zod object schema', () => {
    const schema = createToolSchema({
      query: z.string(),
      limit: z.number().optional(),
    });

    const result = schema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
  });
});

describe('formatValidationErrors', () => {
  it('should format errors as string', () => {
    const errors = [
      { path: 'name', message: 'Required', code: 'invalid_type' },
      { path: 'age', message: 'Must be positive', code: 'too_small' },
    ];
    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('name: Required');
    expect(formatted).toContain('age: Must be positive');
  });

  it('should handle errors without path', () => {
    const errors = [{ path: '', message: 'Invalid input', code: 'custom' }];
    const formatted = formatValidationErrors(errors);
    expect(formatted).toBe('Invalid input');
  });
});

describe('CommonSchemas', () => {
  describe('nonEmptyString', () => {
    it('should accept non-empty strings', () => {
      expect(CommonSchemas.nonEmptyString.safeParse('hello').success).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(CommonSchemas.nonEmptyString.safeParse('').success).toBe(false);
    });
  });

  describe('positiveInt', () => {
    it('should accept positive integers', () => {
      expect(CommonSchemas.positiveInt.safeParse(5).success).toBe(true);
    });

    it('should reject zero', () => {
      expect(CommonSchemas.positiveInt.safeParse(0).success).toBe(false);
    });

    it('should reject negative numbers', () => {
      expect(CommonSchemas.positiveInt.safeParse(-1).success).toBe(false);
    });

    it('should reject floats', () => {
      expect(CommonSchemas.positiveInt.safeParse(1.5).success).toBe(false);
    });
  });

  describe('pagination', () => {
    it('should accept valid pagination', () => {
      const result = CommonSchemas.pagination.safeParse({ limit: 10, offset: 0 });
      expect(result.success).toBe(true);
    });

    it('should use defaults', () => {
      const result = CommonSchemas.pagination.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ limit: 10, offset: 0 });
    });

    it('should reject invalid limit', () => {
      expect(CommonSchemas.pagination.safeParse({ limit: 200 }).success).toBe(false);
    });
  });
});
