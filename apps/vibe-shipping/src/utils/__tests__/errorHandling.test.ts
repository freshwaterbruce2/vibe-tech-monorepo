import { describe, expect, it, vi } from 'vitest';

// Mock external dependencies that errorHandling.ts imports
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/sentry', () => ({
  captureError: vi.fn(() => 'mock-event-id'),
  addBreadcrumb: vi.fn(),
  setContext: vi.fn(),
  setTags: vi.fn(),
}));

import {
  createAppError,
  isAppError,
  ErrorType,
  handleAsyncError,
} from '../errorHandling';

describe('errorHandling', () => {
  describe('createAppError', () => {
    it('creates an error with type and message', () => {
      const err = createAppError(ErrorType.VALIDATION, 'Bad input');
      expect(err).toBeInstanceOf(Error);
      expect(err.type).toBe(ErrorType.VALIDATION);
      expect(err.message).toBe('Bad input');
    });

    it('sets default recoverable to true', () => {
      const err = createAppError(ErrorType.NETWORK, 'Timeout');
      expect(err.recoverable).toBe(true);
    });

    it('respects explicit recoverable: false', () => {
      const err = createAppError(ErrorType.UNKNOWN, 'Fatal', {
        recoverable: false,
      });
      expect(err.recoverable).toBe(false);
    });

    it('sets userMessage to message if not provided', () => {
      const err = createAppError(ErrorType.STORAGE, 'Disk full');
      expect(err.userMessage).toBe('Disk full');
    });

    it('uses custom userMessage when provided', () => {
      const err = createAppError(ErrorType.STORAGE, 'ENOSPC', {
        userMessage: 'Storage is full. Please free some space.',
      });
      expect(err.userMessage).toBe('Storage is full. Please free some space.');
    });

    it('attaches optional code and details', () => {
      const err = createAppError(ErrorType.VALIDATION, 'Invalid', {
        code: 'VAL_001',
        details: { field: 'email' },
      });
      expect(err.code).toBe('VAL_001');
      expect(err.details).toEqual({ field: 'email' });
    });
  });

  describe('isAppError', () => {
    it('returns true for AppError instances', () => {
      const err = createAppError(ErrorType.NETWORK, 'Down');
      expect(isAppError(err)).toBe(true);
    });

    it('returns false for plain Error', () => {
      const err = new Error('plain');
      expect(isAppError(err)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isAppError(null)).toBeFalsy();
      expect(isAppError(undefined)).toBeFalsy();
    });

    it('returns false for non-Error objects', () => {
      expect(isAppError({ type: 'NOT_REAL' })).toBe(false);
    });

    it('returns true for objects matching ErrorType values', () => {
      const fake = { type: ErrorType.PERMISSION, message: 'denied' };
      expect(isAppError(fake)).toBe(true);
    });
  });

  describe('handleAsyncError', () => {
    it('returns result on success', async () => {
      const result = await handleAsyncError(Promise.resolve(42), 'test');
      expect(result).toBe(42);
    });

    it('returns null on failure', async () => {
      const result = await handleAsyncError(
        Promise.reject(new Error('boom')),
        'test',
        { showToast: false, logToConsole: false },
      );
      expect(result).toBeNull();
    });
  });
});
