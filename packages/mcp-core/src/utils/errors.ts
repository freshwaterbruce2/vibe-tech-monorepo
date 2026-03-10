/**
 * Base MCP error class
 */
export class McpError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends McpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends McpError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * Permission error (403)
 */
export class PermissionError extends McpError {
  constructor(message: string, operation?: string) {
    super(message, 'PERMISSION_DENIED', 403, { operation });
    this.name = 'PermissionError';
  }
}

/**
 * Timeout error (408)
 */
export class TimeoutError extends McpError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation timed out: ${operation} (${timeoutMs}ms)`, 'TIMEOUT', 408, {
      operation,
      timeoutMs,
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Configuration error (500)
 */
export class ConfigurationError extends McpError {
  constructor(message: string, configKey?: string) {
    super(message, 'CONFIGURATION_ERROR', 500, { configKey });
    this.name = 'ConfigurationError';
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends McpError {
  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, 'EXTERNAL_SERVICE_ERROR', 502, {
      service,
      originalMessage: originalError?.message,
    });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends McpError {
  constructor(retryAfterSeconds?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
      retryAfterSeconds,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Check if an error is an MCP error
 */
export function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError;
}

/**
 * Wrap unknown errors as MCP errors
 */
export function wrapError(error: unknown, operation?: string): McpError {
  if (isMcpError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new McpError(
      error.message,
      'INTERNAL_ERROR',
      500,
      {
        operation,
        originalName: error.name,
        stack: error.stack,
      }
    );
  }

  return new McpError(
    String(error),
    'UNKNOWN_ERROR',
    500,
    { operation }
  );
}

/**
 * Create an error result for tool responses
 */
export function createErrorResult(error: unknown): {
  isError: true;
  content: [{ type: 'text'; text: string }];
} {
  const mcpError = wrapError(error);
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `Error (${mcpError.code}): ${mcpError.message}`,
      },
    ],
  };
}
