/**
 * LLM Output Validator
 * Validates and sanitizes LLM outputs for safety
 */

export interface ValidationResult {
  valid: boolean;
  sanitized: string;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'length' | 'html' | 'harmful' | 'injection' | 'format' | 'encoding';
  severity: 'error' | 'warning' | 'info';
  message: string;
  fixed: boolean;
}

export interface ValidationOptions {
  maxLength?: number;
  allowHTML?: boolean;
  checkHarmful?: boolean;
  checkInjection?: boolean;
  stripControlChars?: boolean;
  requireFormat?: 'json' | 'xml' | 'markdown' | 'text';
}

/**
 * Validate LLM output with comprehensive safety checks
 */
export function validateLLMOutput(
  output: string,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    maxLength = 100000,
    allowHTML = false,
    checkHarmful = true,
    checkInjection = true,
    stripControlChars = true,
    requireFormat,
  } = options;

  const issues: ValidationIssue[] = [];
  let sanitized = output;

  // Check basic validity
  if (!output || typeof output !== 'string') {
    return {
      valid: false,
      sanitized: '',
      issues: [
        {
          type: 'format',
          severity: 'error',
          message: 'Output is not a valid string',
          fixed: false,
        },
      ],
    };
  }

  // Length check
  if (output.length > maxLength) {
    issues.push({
      type: 'length',
      severity: 'warning',
      message: `Output exceeds max length (${output.length} > ${maxLength})`,
      fixed: true,
    });
    sanitized = output.substring(0, maxLength) + '...';
  }

  // Strip control characters
  if (stripControlChars) {
    const before = sanitized;
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    if (before !== sanitized) {
      issues.push({
        type: 'encoding',
        severity: 'info',
        message: 'Removed control characters',
        fixed: true,
      });
    }
  }

  // HTML sanitization
  if (!allowHTML) {
    const htmlPattern = /<[^>]+>/g;
    if (htmlPattern.test(sanitized)) {
      issues.push({
        type: 'html',
        severity: 'warning',
        message: 'HTML tags detected and escaped',
        fixed: true,
      });
      sanitized = escapeHTML(sanitized);
    }
  }

  // Harmful content check
  if (checkHarmful) {
    const harmfulPatterns = [
      { pattern: /\b(eval|exec|system|shell)\s*\(/gi, name: 'Code execution' },
      { pattern: /<script[\s\S]*?<\/script>/gi, name: 'Script tag' },
      { pattern: /javascript:/gi, name: 'JavaScript protocol' },
      { pattern: /on\w+\s*=\s*["'][^"']*["']/gi, name: 'Event handler' },
      { pattern: /data:text\/html/gi, name: 'Data URL' },
    ];

    for (const { pattern, name } of harmfulPatterns) {
      if (pattern.test(sanitized)) {
        issues.push({
          type: 'harmful',
          severity: 'error',
          message: `Potentially harmful content detected: ${name}`,
          fixed: false,
        });
      }
    }
  }

  // Injection check
  if (checkInjection) {
    const injectionPatterns = [
      { pattern: /ignore\s+(previous|all|above)\s+(instructions|prompts)/gi, name: 'Instruction injection' },
      { pattern: /system\s*:\s*you\s+are/gi, name: 'System prompt injection' },
      { pattern: /forget\s+(everything|all|previous)/gi, name: 'Memory manipulation' },
      { pattern: /new\s+instructions:/gi, name: 'Instruction override' },
    ];

    for (const { pattern, name } of injectionPatterns) {
      if (pattern.test(sanitized)) {
        issues.push({
          type: 'injection',
          severity: 'warning',
          message: `Possible injection attempt detected: ${name}`,
          fixed: false,
        });
      }
    }
  }

  // Format validation
  if (requireFormat) {
    const formatValid = validateFormat(sanitized, requireFormat);
    if (!formatValid.valid) {
      issues.push({
        type: 'format',
        severity: 'error',
        message: `Invalid ${requireFormat} format: ${formatValid.error}`,
        fixed: false,
      });
    }
  }

  // Determine overall validity
  const hasErrors = issues.some(i => i.severity === 'error');
  const valid = !hasErrors;

  return {
    valid,
    sanitized,
    issues,
  };
}

/**
 * Escape HTML characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate specific format
 */
function validateFormat(
  text: string,
  format: 'json' | 'xml' | 'markdown' | 'text'
): { valid: boolean; error?: string } {
  switch (format) {
    case 'json':
      try {
        JSON.parse(text);
        return { valid: true };
      } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : 'Invalid JSON' };
      }

    case 'xml':
      // Basic XML validation (opening/closing tags match)
      const xmlPattern = /<(\w+)[^>]*>[\s\S]*?<\/\1>/g;
      if (!xmlPattern.test(text) && text.includes('<')) {
        return { valid: false, error: 'Malformed XML' };
      }
      return { valid: true };

    case 'markdown':
      // Basic markdown check (has some markdown syntax)
      const mdPattern = /[#*`\[\]]/;
      if (!mdPattern.test(text)) {
        return { valid: false, error: 'No markdown formatting detected' };
      }
      return { valid: true };

    case 'text':
      // Plain text - always valid
      return { valid: true };

    default:
      return { valid: false, error: `Unknown format: ${format}` };
  }
}

/**
 * Quick validation for streaming chunks
 * Less strict than full validation
 */
export function validateStreamChunk(
  chunk: string,
  options: { allowHTML?: boolean; checkHarmful?: boolean } = {}
): ValidationResult {
  return validateLLMOutput(chunk, {
    ...options,
    maxLength: 10000, // Smaller limit for chunks
    stripControlChars: true,
    checkInjection: false, // Skip for performance
  });
}

/**
 * Validate structured output against a schema
 */
export function validateStructuredOutput<T>(
  output: string,
  schema: {
    type: 'object' | 'array';
    required?: string[];
    properties?: Record<string, { type: string; required?: boolean }>;
  }
): { valid: boolean; data?: T; errors: string[] } {
  const errors: string[] = [];

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(output);
  } catch (err) {
    return {
      valid: false,
      errors: ['Invalid JSON: ' + (err instanceof Error ? err.message : 'Parse error')],
    };
  }

  // Type check
  if (schema.type === 'object' && typeof data !== 'object') {
    errors.push(`Expected object, got ${typeof data}`);
  } else if (schema.type === 'array' && !Array.isArray(data)) {
    errors.push(`Expected array, got ${typeof data}`);
  }

  // Required fields check
  if (schema.required && typeof data === 'object' && data !== null) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Property type checks
  if (schema.properties && typeof data === 'object' && data !== null) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        const value = (data as Record<string, unknown>)[key];
        const expectedType = propSchema.type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== expectedType) {
          errors.push(`Field '${key}' should be ${expectedType}, got ${actualType}`);
        }
      } else if (propSchema.required) {
        errors.push(`Missing required property: ${key}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? (data as T) : undefined,
    errors,
  };
}
