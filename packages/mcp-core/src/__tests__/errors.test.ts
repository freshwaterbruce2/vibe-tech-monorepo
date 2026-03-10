import { describe, it, expect } from 'vitest';
import {
  McpError,
  NotFoundError,
  ValidationError,
  TimeoutError,
  PermissionError,
  ConfigurationError,
  RateLimitError,
  isMcpError,
  wrapError,
  createErrorResult,
} from '../utils/errors.js';

describe('McpError', () => {
  it('should create error with all properties', () => {
    const error = new McpError('Test error', 'TEST_ERROR', 400, { foo: 'bar' });
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('McpError');
  });

  it('should default statusCode to 500', () => {
    const error = new McpError('Test', 'TEST');
    expect(error.statusCode).toBe(500);
  });

  it('should serialize to JSON', () => {
    const error = new McpError('Test', 'TEST', 400);
    const json = error.toJSON();
    
    expect(json.name).toBe('McpError');
    expect(json.message).toBe('Test');
    expect(json.code).toBe('TEST');
    expect(json.statusCode).toBe(400);
  });
});

describe('NotFoundError', () => {
  it('should create with resource name', () => {
    const error = new NotFoundError('User');
    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should include id when provided', () => {
    const error = new NotFoundError('User', '123');
    expect(error.message).toBe('User not found: 123');
    expect(error.details).toEqual({ resource: 'User', id: '123' });
  });
});

describe('ValidationError', () => {
  it('should create with 400 status', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('TimeoutError', () => {
  it('should include operation and timeout', () => {
    const error = new TimeoutError('fetch', 5000);
    expect(error.message).toContain('fetch');
    expect(error.message).toContain('5000');
    expect(error.statusCode).toBe(408);
  });
});

describe('PermissionError', () => {
  it('should create with 403 status', () => {
    const error = new PermissionError('Access denied');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('PERMISSION_DENIED');
  });
});

describe('ConfigurationError', () => {
  it('should create with config key', () => {
    const error = new ConfigurationError('Missing API key', 'API_KEY');
    expect(error.details?.configKey).toBe('API_KEY');
  });
});

describe('RateLimitError', () => {
  it('should include retry after', () => {
    const error = new RateLimitError(60);
    expect(error.statusCode).toBe(429);
    expect(error.details?.retryAfterSeconds).toBe(60);
  });
});

describe('isMcpError', () => {
  it('should return true for McpError instances', () => {
    expect(isMcpError(new McpError('Test', 'TEST'))).toBe(true);
    expect(isMcpError(new NotFoundError('User'))).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isMcpError(new Error('Test'))).toBe(false);
    expect(isMcpError('string')).toBe(false);
    expect(isMcpError(null)).toBe(false);
  });
});

describe('wrapError', () => {
  it('should return McpError unchanged', () => {
    const original = new NotFoundError('User');
    const wrapped = wrapError(original);
    expect(wrapped).toBe(original);
  });

  it('should wrap regular Error', () => {
    const original = new Error('Something went wrong');
    const wrapped = wrapError(original, 'test-op');
    
    expect(wrapped).toBeInstanceOf(McpError);
    expect(wrapped.message).toBe('Something went wrong');
    expect(wrapped.code).toBe('INTERNAL_ERROR');
    expect(wrapped.details?.operation).toBe('test-op');
  });

  it('should wrap string errors', () => {
    const wrapped = wrapError('Unknown error');
    expect(wrapped.message).toBe('Unknown error');
  });
});

describe('createErrorResult', () => {
  it('should create error result for McpError', () => {
    const error = new NotFoundError('User', '123');
    const result = createErrorResult(error);
    
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('NOT_FOUND');
  });

  it('should wrap and create result for regular errors', () => {
    const result = createErrorResult(new Error('Oops'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('INTERNAL_ERROR');
  });
});
