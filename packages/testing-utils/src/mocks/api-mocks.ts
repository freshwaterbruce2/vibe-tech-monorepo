/**
 * Common API mocking utilities for vitest
 */

import { vi, type MockInstance } from 'vitest';

/**
 * Mock fetch with custom responses
 * Usage: mockFetch({ '/api/users': { data: mockUsers } })
 */
export function mockFetch(responses: Record<string, unknown>): void {
  global.fetch = vi.fn(async (url: string | URL | Request): Promise<Response> => {
    const path = typeof url === 'string' ? url : url.toString();
    const matchedPath = Object.keys(responses).find(key => path.includes(key));

    if (matchedPath !== undefined) {
      const response = responses[matchedPath];
      return {
        ok: true,
        status: 200,
        json: async () => response,
        text: async () => JSON.stringify(response),
      } as Response;
    }

    throw new Error(`Unmocked fetch call to ${path}`);
  });
}

/**
 * Reset all fetch mocks
 */
export function resetFetchMocks(): void {
  if ('fetch' in globalThis) {
    const fetchMock = globalThis.fetch as typeof globalThis.fetch & { mockReset?: () => void };
    fetchMock.mockReset?.();
  }
}

/**
 * Mock localStorage for testing
 */
export function mockLocalStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      const { [key]: _removed, ...nextStore } = store;
      store = nextStore;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
}

/**
 * Mock console methods to suppress output in tests
 * Usage: const consoleMock = mockConsole(['error', 'warn'])
 */
export function mockConsole(
  methods: Array<'log' | 'error' | 'warn' | 'info' | 'debug'> = ['error', 'warn']
): Record<string, MockInstance> {
  const mocks: Record<string, MockInstance> = {};

  methods.forEach(method => {
    mocks[method] = vi.spyOn(console, method).mockImplementation(() => undefined);
  });

  return mocks;
}

/**
 * Restore all console mocks
 */
export function restoreConsole(mocks: Record<string, MockInstance>): void {
  Object.values(mocks).forEach(mock => mock.mockRestore());
}

/**
 * Create a mock timer for testing async code
 * Usage:
 *   vi.useFakeTimers()
 *   const promise = someAsyncFunction()
 *   await advanceTimers(1000)
 *   vi.useRealTimers()
 */
export async function advanceTimers(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await Promise.resolve(); // Flush promises
}
