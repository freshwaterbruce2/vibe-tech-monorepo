/**
 * Vitest setup file for @vibetech/shared-utils
 */

import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      const { [key]: _removed, ...rest } = store;
      store = rest;
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// Mock window object for browser environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}

// Mock crypto for SecureApiKeyManager tests
const cryptoMock = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  subtle: {
    digest: async (_algorithm: string, _data: ArrayBuffer) => {
      // Simple mock hash - returns array buffer of zeros
      return new ArrayBuffer(32);
    },
  },
};

// Use vi.stubGlobal instead of direct assignment (crypto is getter-only)
vi.stubGlobal('crypto', cryptoMock);

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});
