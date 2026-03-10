import { z, ZodError, ZodType } from 'zod';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validate input against a Zod schema
 */
export function validateInput<T>(
  schema: ZodType<T>,
  input: unknown
): ValidationResult<T> {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        })),
      };
    }
    throw error;
  }
}

/**
 * Safe parse that returns undefined on failure
 */
export function safeParse<T>(
  schema: ZodType<T>,
  input: unknown
): T | undefined {
  const result = schema.safeParse(input);
  return result.success ? result.data : undefined;
}

/**
 * Create a tool input schema from a record of field definitions
 */
export function createToolSchema<T extends Record<string, ZodType>>(
  fields: T
): z.ZodObject<T> {
  return z.object(fields);
}

/**
 * Format validation errors as a string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map(e => `${e.path ? `${e.path}: ` : ''}${e.message}`)
    .join('\n');
}

/**
 * Common schema types for MCP tools
 */
export const CommonSchemas = {
  /** Non-empty string */
  nonEmptyString: z.string().min(1),
  
  /** File path */
  filePath: z.string().min(1).regex(/^[^<>:"|?*]+$/, 'Invalid file path characters'),
  
  /** URI */
  uri: z.string().url().or(z.string().regex(/^[a-z][a-z0-9+.-]*:/i, 'Invalid URI scheme')),
  
  /** Positive integer */
  positiveInt: z.number().int().positive(),
  
  /** Non-negative integer */
  nonNegativeInt: z.number().int().nonnegative(),
  
  /** Pagination options */
  pagination: z.object({
    limit: z.number().int().min(1).max(100).default(10),
    offset: z.number().int().nonnegative().default(0),
  }),
  
  /** Search query */
  searchQuery: z.object({
    query: z.string().min(1),
    maxResults: z.number().int().min(1).max(100).default(20),
    caseSensitive: z.boolean().default(false),
  }),
  
  /** Date range */
  dateRange: z.object({
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
  }),
} as const;

/**
 * Type helper to infer schema type
 */
export type InferSchema<T extends ZodType> = z.infer<T>;
