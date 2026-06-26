/**
 * Structured error thrown by OpenRouter client operations.
 */
export class OpenRouterError extends Error {
  status?: number;
  details?: Record<string, unknown>;

  constructor(message: string, status?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.details = details;
  }
}
