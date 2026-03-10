/**
 * Jest Integration Test Setup
 * Global setup for Firebase, Sentry, and Square integration tests
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import 'whatwg-fetch';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDoorNumber(): R;
      toBeValidDestination(): R;
      toHaveValidFirebaseConfig(): R;
      toHaveValidSquareConfig(): R;
      toHaveValidSentryConfig(): R;
    }
  }
}

// Custom Jest matchers for shipping domain
expect.extend({
  toBeValidDoorNumber(received: number) {
    const isValid = received >= 332 && received <= 454;
    return {
      message: () =>
        `expected ${received} ${isValid ? 'not ' : ''}to be a valid door number (332-454)`,
      pass: isValid,
    };
  },

  toBeValidDestination(received: string) {
    const validDestinations = ['6024', '6070', '6039', '6040', '7045'];
    const isValid = validDestinations.includes(received);
    return {
      message: () =>
        `expected ${received} ${isValid ? 'not ' : ''}to be a valid destination (${validDestinations.join(', ')})`,
      pass: isValid,
    };
  },

  toHaveValidFirebaseConfig(received: any) {
    const requiredKeys = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId'
    ];

    const hasAllKeys = requiredKeys.every(key => received && received[key]);
    const missingKeys = requiredKeys.filter(key => !received || !received[key]);

    return {
      message: () =>
        hasAllKeys
          ? `expected Firebase config not to have all required keys`
          : `expected Firebase config to have all required keys. Missing: ${missingKeys.join(', ')}`,
      pass: hasAllKeys,
    };
  },

  toHaveValidSquareConfig(received: any) {
    const hasAccessToken = received && received.accessToken;
    const hasEnvironment = received && ['sandbox', 'production'].includes(received.environment);
    const hasLocationId = received && received.locationId;

    const isValid = hasAccessToken && hasEnvironment && hasLocationId;

    return {
      message: () =>
        isValid
          ? `expected Square config not to be valid`
          : `expected Square config to be valid (needs accessToken, environment, locationId)`,
      pass: isValid,
    };
  },

  toHaveValidSentryConfig(received: any) {
    const hasDsn = received && received.dsn;
    const hasEnvironment = received && received.environment;

    const isValid = hasDsn && hasEnvironment;

    return {
      message: () =>
        isValid
          ? `expected Sentry config not to be valid`
          : `expected Sentry config to be valid (needs dsn, environment)`,
      pass: isValid,
    };
  },
});

// Global test setup
beforeAll(async () => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITE_FIREBASE_USE_EMULATOR = 'true';
  process.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
  process.env.SQUARE_ENVIRONMENT = 'sandbox';
  process.env.SENTRY_ENVIRONMENT = 'test';

  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    // Keep error and warn for debugging
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  };

  // Mock window.matchMedia (not available in jsdom)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver (not available in jsdom)
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    disconnect() {}
    unobserve() {}
  };

  // Mock ResizeObserver (not available in jsdom)
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() {}
    disconnect() {}
    unobserve() {}
  };

  // Mock Web Speech API for voice command tests
  global.SpeechRecognition = class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = 'en-US';
    onstart = null;
    onresult = null;
    onerror = null;
    onend = null;

    start() {
      if (this.onstart) this.onstart();
    }

    stop() {
      if (this.onend) this.onend();
    }

    abort() {
      if (this.onend) this.onend();
    }
  };

  global.webkitSpeechRecognition = global.SpeechRecognition;

  // Mock geolocation API
  global.navigator.geolocation = {
    getCurrentPosition: vi.fn().mockImplementation((success) =>
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
      })
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };

  // Mock crypto.subtle for testing
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      },
    },
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
  });

  // Mock IndexedDB
  global.indexedDB = {
    open: vi.fn().mockResolvedValue({}),
    deleteDatabase: vi.fn().mockResolvedValue({}),
    databases: vi.fn().mockResolvedValue([]),
  } as any;

  // Mock File and Blob APIs for export tests
  global.File = class MockFile {
    constructor(public chunks: any[], public filename: string, public options: any = {}) {}
    get name() { return this.filename; }
    get size() { return this.chunks.reduce((acc, chunk) => acc + chunk.length, 0); }
    get type() { return this.options.type || ''; }
  } as any;

  global.Blob = class MockBlob {
    constructor(public chunks: any[] = [], public options: any = {}) {}
    get size() { return this.chunks.reduce((acc, chunk) => acc + chunk.length, 0); }
    get type() { return this.options.type || ''; }
  } as any;

  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');
  global.URL.revokeObjectURL = vi.fn();

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn().mockImplementation(cb => setTimeout(cb, 16));
  global.cancelAnimationFrame = vi.fn().mockImplementation(clearTimeout);
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Clear localStorage
  window.localStorage.clear();
  window.sessionStorage.clear();

  // Clear any global variables set during tests
  delete (global as any).mockFirebaseUser;
  delete (global as any).mockSquareResponse;
  delete (global as any).mockSentryEvents;

  // Reset document body
  document.body.innerHTML = '';
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't fail tests on unhandled rejections in integration tests
  // as some Firebase/external services might have timing issues
});

// Helper functions for integration tests
export const integrationTestHelpers = {
  // Firebase helpers
  createMockFirebaseUser: (overrides = {}) => ({
    uid: 'test-user-123',
    email: 'test@warehouse.com',
    displayName: 'Test User',
    emailVerified: true,
    ...overrides,
  }),

  createMockFirebaseConfig: (overrides = {}) => ({
    apiKey: 'test-api-key',
    authDomain: 'test-project.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123',
    ...overrides,
  }),

  // Square helpers
  createMockSquareConfig: (overrides = {}) => ({
    accessToken: 'test-access-token',
    environment: 'sandbox',
    locationId: 'test-location-123',
    ...overrides,
  }),

  createMockSquareOrder: (overrides = {}) => ({
    id: 'order-123',
    locationId: 'test-location-123',
    basePriceMoney: { amount: 2900, currency: 'USD' },
    lineItems: [{
      name: 'Professional Plan',
      quantity: '1',
      itemType: 'ITEM_SUBSCRIPTION'
    }],
    ...overrides,
  }),

  // Sentry helpers
  createMockSentryConfig: (overrides = {}) => ({
    dsn: 'https://test-dsn@sentry.io/12345',
    environment: 'test',
    tracesSampleRate: 0.1,
    ...overrides,
  }),

  // Test data helpers
  createMockDoorEntry: (overrides = {}) => ({
    id: `door-${Date.now()}`,
    doorNumber: 332,
    destination: '6024',
    freightType: '23/43',
    trailerStatus: 'partial',
    timestamp: new Date(),
    userId: 'test-user-123',
    tenantId: 'test-tenant-123',
    ...overrides,
  }),

  createMockPalletEntry: (overrides = {}) => ({
    id: `pallet-${Date.now()}`,
    doorNumber: 332,
    count: 25,
    timestamp: new Date(),
    userId: 'test-user-123',
    tenantId: 'test-tenant-123',
    ...overrides,
  }),

  // Async helpers
  waitFor: (condition: () => boolean, timeout = 5000) => {
    return new Promise<void>((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Make helpers available globally
(global as any).integrationTestHelpers = integrationTestHelpers;