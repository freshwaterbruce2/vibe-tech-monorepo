/**
 * Sentry Integration Tests
 * Tests error monitoring, performance tracking, and user context management
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import * as Sentry from '@sentry/react';
import {
  initializeSentry,
  captureError,
  captureMessage,
  addBreadcrumb,
  setUser,
  setContext,
  setTags,
  startSpan,
  withSentryErrorBoundary
} from '../../src/lib/sentry';

// Mock Sentry SDK for testing
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn().mockReturnValue('error-id-123'),
  captureMessage: vi.fn().mockReturnValue('message-id-123'),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  setTags: vi.fn(),
  startSpan: vi.fn().mockImplementation((context, callback) => callback(undefined)),
  withErrorBoundary: vi.fn().mockImplementation((component) => component),
  Profiler: vi.fn().mockImplementation(({ children }) => children),
  browserTracingIntegration: vi.fn().mockReturnValue({}),
}));

// Mock environment variables
const mockEnvVars = {
  VITE_SENTRY_DSN: 'https://mock-dsn@sentry.io/12345',
  VITE_SENTRY_ENVIRONMENT: 'test',
  VITE_SENTRY_TRACES_SAMPLE_RATE: '0.1',
  VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: '0.1',
  VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: '1.0',
  VITE_SENTRY_RELEASE: 'shipping-pwa@1.0.0-test'
};

// Mock localStorage for user settings
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Sentry Integration Tests', () => {
  const originalEnv = process.env;
  const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

  beforeAll(() => {
    // Set up environment variables
    process.env = { ...originalEnv, ...mockEnvVars };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
  });

  describe('Sentry Initialization', () => {
    test('should initialize Sentry with correct configuration', () => {
      initializeSentry();

      expect(mockSentry.init).toHaveBeenCalledWith({
        dsn: mockEnvVars.VITE_SENTRY_DSN,
        environment: mockEnvVars.VITE_SENTRY_ENVIRONMENT,
        integrations: [expect.any(Object)],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        release: mockEnvVars.VITE_SENTRY_RELEASE,
        beforeSend: expect.any(Function),
        initialScope: {
          tags: {
            component: 'shipping-pwa',
            platform: 'web'
          },
          contexts: {
            app: {
              name: 'DC8980 Shipping PWA',
              version: '1.0.0'
            }
          }
        }
      });
    });

    test('should not initialize when DSN is missing', () => {
      const originalDsn = process.env.VITE_SENTRY_DSN;
      delete process.env.VITE_SENTRY_DSN;

      const mockWarn = vi.spyOn(console, 'warn').mockImplementation();

      initializeSentry();

      expect(mockWarn).toHaveBeenCalledWith(
        'Sentry DSN not provided. Error reporting is disabled.'
      );
      expect(mockSentry.init).not.toHaveBeenCalled();

      // Restore DSN
      process.env.VITE_SENTRY_DSN = originalDsn;
      mockWarn.mockRestore();
    });

    test('should set user context from localStorage', () => {
      const userSettings = {
        userId: 'user-123',
        username: 'test.user@warehouse.com'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(userSettings));

      initializeSentry();

      expect(mockSentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        username: 'test.user@warehouse.com'
      });
    });

    test('should handle invalid localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      const mockWarn = vi.spyOn(console, 'warn').mockImplementation();

      initializeSentry();

      expect(mockWarn).toHaveBeenCalledWith(
        'Failed to parse user settings for Sentry:',
        expect.any(Error)
      );

      mockWarn.mockRestore();
    });
  });

  describe('Error Filtering and beforeSend', () => {
    let beforeSendFunction: Function;

    beforeEach(() => {
      initializeSentry();
      const initCall = mockSentry.init.mock.calls[0][0];
      beforeSendFunction = initCall.beforeSend;
    });

    test('should filter out development mode errors', () => {
      const originalMode = process.env.MODE;
      process.env.MODE = 'development';

      const mockEvent = { exception: { values: [{ type: 'Error' }] } };
      const mockHint = { originalException: new Error('Test error') };

      const mockLog = vi.spyOn(console, 'log').mockImplementation();

      const result = beforeSendFunction(mockEvent, mockHint);

      expect(result).toBeNull();
      expect(mockLog).toHaveBeenCalledWith('Sentry event (dev mode):', mockEvent);

      process.env.MODE = originalMode;
      mockLog.mockRestore();
    });

    test('should filter out ResizeObserver errors', () => {
      const mockEvent = { exception: { values: [{ type: 'Error' }] } };
      const mockHint = {
        originalException: new Error('ResizeObserver loop limit exceeded')
      };

      const result = beforeSendFunction(mockEvent, mockHint);

      expect(result).toBeNull();
    });

    test('should filter out network errors', () => {
      const mockEvent = { exception: { values: [{ type: 'NetworkError' }] } };
      const mockHint = {
        originalException: new Error('NetworkError: Failed to fetch')
      };

      const result = beforeSendFunction(mockEvent, mockHint);

      expect(result).toBeNull();
    });

    test('should allow valid errors through', () => {
      const mockEvent = { exception: { values: [{ type: 'TypeError' }] } };
      const mockHint = {
        originalException: new Error('Cannot read property of undefined')
      };

      const result = beforeSendFunction(mockEvent, mockHint);

      expect(result).toBe(mockEvent);
    });
  });

  describe('Error Capture Functions', () => {
    test('should capture errors with context', () => {
      const testError = new Error('Test error');
      const context = {
        tags: { feature: 'door-entry' },
        extra: { doorNumber: 332 },
        level: 'error' as const,
        fingerprint: ['door-entry-error']
      };

      const errorId = captureError(testError, context);

      expect(errorId).toBe('error-id-123');
      expect(mockSentry.captureException).toHaveBeenCalledWith(testError, {
        tags: context.tags,
        extra: context.extra,
        level: context.level,
        fingerprint: context.fingerprint
      });
    });

    test('should capture errors without context', () => {
      const testError = new Error('Simple error');

      const errorId = captureError(testError);

      expect(errorId).toBe('error-id-123');
      expect(mockSentry.captureException).toHaveBeenCalledWith(testError, {
        tags: undefined,
        extra: undefined,
        level: 'error',
        fingerprint: undefined
      });
    });

    test('should capture messages with different levels', () => {
      const message = 'Important information';
      const context = {
        tags: { component: 'pallet-counter' },
        extra: { count: 25 }
      };

      const messageId = captureMessage(message, 'warning', context);

      expect(messageId).toBe('message-id-123');
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(message, {
        level: 'warning',
        tags: context.tags,
        extra: context.extra,
        fingerprint: undefined
      });
    });

    test('should capture messages with default level', () => {
      const message = 'Default message';

      const messageId = captureMessage(message);

      expect(messageId).toBe('message-id-123');
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(message, {
        level: 'info',
        tags: undefined,
        extra: undefined,
        fingerprint: undefined
      });
    });
  });

  describe('Breadcrumb and Context Management', () => {
    test('should add breadcrumbs with custom data', () => {
      const message = 'User action performed';
      const category = 'user-interaction';
      const level = 'info' as const;
      const data = { action: 'door-entry-added', doorNumber: 332 };

      addBreadcrumb(message, category, level, data);

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message,
        category,
        level,
        data,
        timestamp: expect.any(Number)
      });
    });

    test('should add breadcrumbs with defaults', () => {
      const message = 'Simple breadcrumb';

      addBreadcrumb(message);

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message,
        category: 'custom',
        level: 'info',
        data: undefined,
        timestamp: expect.any(Number)
      });
    });

    test('should set user context', () => {
      const user = {
        id: 'user-456',
        username: 'test.supervisor@warehouse.com',
        email: 'supervisor@dc8980.com',
        role: 'supervisor'
      };

      setUser(user);

      expect(mockSentry.setUser).toHaveBeenCalledWith(user);
    });

    test('should set additional context', () => {
      const context = {
        warehouse: 'DC8980',
        shift: 'morning',
        activeFeatures: ['voice-commands', 'pallet-tracking']
      };

      setContext('warehouse-info', context);

      expect(mockSentry.setContext).toHaveBeenCalledWith('warehouse-info', context);
    });

    test('should set tags', () => {
      const tags = {
        feature: 'door-scheduling',
        version: '1.0.0',
        tenant: 'walmart-dc8980'
      };

      setTags(tags);

      expect(mockSentry.setTags).toHaveBeenCalledWith(tags);
    });
  });

  describe('Performance Monitoring', () => {
    test('should start performance spans', () => {
      const context = { name: 'door-entry-processing', op: 'function' };
      const callback = vi.fn().mockReturnValue('callback-result');

      const result = startSpan(context, callback);

      expect(mockSentry.startSpan).toHaveBeenCalledWith(context, callback);
      expect(callback).toHaveBeenCalledWith(undefined);
      expect(result).toBe('callback-result');
    });

    test('should handle performance span errors', () => {
      const context = { name: 'failing-operation' };
      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Operation failed');
      });

      expect(() => startSpan(context, callback)).toThrow('Operation failed');
      expect(mockSentry.startSpan).toHaveBeenCalledWith(context, callback);
    });
  });

  describe('React Integration', () => {
    test('should provide error boundary HOC', () => {
      const TestComponent = () => 'Test Component';
      const WrappedComponent = withSentryErrorBoundary(TestComponent, {
        fallback: () => 'Error occurred'
      });

      expect(mockSentry.withErrorBoundary).toHaveBeenCalledWith(
        TestComponent,
        { fallback: expect.any(Function) }
      );
    });

    test('should export Sentry Profiler', () => {
      // Import should work without errors
      const { SentryProfiler } = require('../../src/lib/sentry');
      expect(SentryProfiler).toBe(mockSentry.Profiler);
    });
  });

  describe('Real-world Error Scenarios', () => {
    test('should handle voice command errors', () => {
      const voiceError = new Error('Speech recognition failed');
      const context = {
        tags: { feature: 'voice-commands' },
        extra: {
          command: 'door 332',
          confidence: 0.65,
          language: 'en-US'
        },
        level: 'warning' as const
      };

      captureError(voiceError, context);

      expect(mockSentry.captureException).toHaveBeenCalledWith(voiceError, context);
    });

    test('should handle payment processing errors', () => {
      const paymentError = new Error('Square payment failed');
      const context = {
        tags: { feature: 'payments', provider: 'square' },
        extra: {
          planId: 'professional',
          tenantId: 'tenant-001',
          amount: 7900
        },
        level: 'error' as const,
        fingerprint: ['payment-processing-error']
      };

      captureError(paymentError, context);

      expect(mockSentry.captureException).toHaveBeenCalledWith(paymentError, context);
    });

    test('should handle Firebase connection errors', () => {
      const firebaseError = new Error('Firestore offline');
      const context = {
        tags: { feature: 'database', provider: 'firebase' },
        extra: {
          operation: 'sync-door-entries',
          lastSyncTime: new Date().toISOString(),
          offlineMode: true
        },
        level: 'warning' as const
      };

      captureError(firebaseError, context);

      expect(mockSentry.captureException).toHaveBeenCalledWith(firebaseError, context);
    });

    test('should handle PWA installation errors', () => {
      const pwaError = new Error('PWA installation prompt failed');
      const context = {
        tags: { feature: 'pwa-installation' },
        extra: {
          platform: 'iOS Safari',
          installPromptAvailable: false,
          userAgent: 'test-user-agent'
        },
        level: 'info' as const
      };

      captureError(pwaError, context);

      expect(mockSentry.captureException).toHaveBeenCalledWith(pwaError, context);
    });
  });

  describe('Performance Tracking Scenarios', () => {
    test('should track door entry processing performance', () => {
      const callback = vi.fn().mockImplementation((span) => {
        // Simulate processing time
        setTimeout(() => {}, 100);
        return { success: true, doorNumber: 332 };
      });

      const result = startSpan(
        { name: 'process-door-entry', op: 'door-processing' },
        callback
      );

      expect(mockSentry.startSpan).toHaveBeenCalledWith(
        { name: 'process-door-entry', op: 'door-processing' },
        callback
      );
    });

    test('should track voice command processing performance', () => {
      const callback = vi.fn().mockImplementation(() => {
        return { recognized: true, command: 'door 350', confidence: 0.89 };
      });

      startSpan(
        { name: 'voice-command-processing', op: 'speech-recognition' },
        callback
      );

      expect(mockSentry.startSpan).toHaveBeenCalledWith(
        { name: 'voice-command-processing', op: 'speech-recognition' },
        callback
      );
    });

    test('should track data export performance', () => {
      const callback = vi.fn().mockImplementation(() => {
        return { exported: true, fileSize: '2.5MB', format: 'ZIP' };
      });

      startSpan(
        { name: 'data-export', op: 'file-generation' },
        callback
      );

      expect(mockSentry.startSpan).toHaveBeenCalledWith(
        { name: 'data-export', op: 'file-generation' },
        callback
      );
    });
  });
});