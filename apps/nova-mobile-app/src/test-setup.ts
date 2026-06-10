import { vi } from 'vitest';

// Define global __DEV__ for test environments
(global as any).__DEV__ = true;

// Mock react-native — not available in Node test environment
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
  },
}));

// Mock @nova/core/abstraction — workspace package not importable in isolated test
vi.mock('@nova/core/abstraction', () => ({
  BaseAgentAdapter: class BaseAgentAdapter {
    connect() {
      /* mock */
    }
  },
}));

// Mock @nova/types — provides type stubs only
vi.mock('@nova/types', () => ({}));
