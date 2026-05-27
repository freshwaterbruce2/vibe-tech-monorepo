/**
 * Security Utilities
 * Helper functions for security operations
 */

/**
 * Masks API key for safe display in responses
 * Shows only first 8 characters
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '***';
  }
  return `${apiKey.substring(0, 8)}...`;
}

/**
 * Sanitizes username input to prevent XSS
 */
export function sanitizeUsername(username: string): string {
  return username
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 100); // Limit length
}

/**
 * Validates credential format
 */
export function validateCredentials(username: string, password: string): {
  valid: boolean;
  error?: string;
} {
  if (!username || !password) {
    return { valid: false, error: 'Missing credentials' };
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return { valid: false, error: 'Invalid credential format' };
  }

  if (username.length > 100 || password.length > 256) {
    return { valid: false, error: 'Credentials too long' };
  }

  return { valid: true };
}
