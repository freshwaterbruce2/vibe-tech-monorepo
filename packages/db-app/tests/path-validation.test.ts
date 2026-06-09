import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('better-sqlite3', () => {
  const mockDb = {
    pragma: () => {},
    exec: () => {},
    prepare: () => ({ run: () => {} }),
  };

  class MockDatabase {
    constructor(...args: any[]) {
      const calls = (globalThis as any).mockConstructorCalls || [];
      calls.push(args);
      (globalThis as any).mockConstructorCalls = calls;
      return mockDb;
    }
  }

  return {
    default: MockDatabase,
  };
});

// Mock fs to prevent actual directory creation
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

import { AppDatabase } from '../src/index.js';

describe('AppDatabase Path Resolution and Fallbacks', () => {
  beforeEach(() => {
    (globalThis as any).mockConstructorCalls = [];
    AppDatabase.resetInstance();
  });

  afterEach(() => {
    AppDatabase.resetInstance();
    delete (globalThis as any).mockConstructorCalls;
  });

  it('should allow :memory: path without modification', () => {
    AppDatabase.getInstance({ path: ':memory:' });
    expect((globalThis as any).mockConstructorCalls[0]).toEqual([':memory:', expect.any(Object)]);
  });

  it('should redirect relative paths to D:\\databases\\', () => {
    AppDatabase.getInstance({ path: 'test_relative.db' });
    expect((globalThis as any).mockConstructorCalls[0]).toEqual(['D:\\databases\\test_relative.db', expect.any(Object)]);
  });

  it('should redirect C:\\ drive paths to D:\\databases\\', () => {
    AppDatabase.getInstance({ path: 'C:\\dev\\some_db.db' });
    expect((globalThis as any).mockConstructorCalls[0]).toEqual(['D:\\databases\\some_db.db', expect.any(Object)]);
  });

  it('should redirect V:\\ drive paths to D:\\databases\\', () => {
    AppDatabase.getInstance({ path: 'V:\\monorepo\\another.db' });
    expect((globalThis as any).mockConstructorCalls[0]).toEqual(['D:\\databases\\another.db', expect.any(Object)]);
  });

  it('should preserve valid D:\\databases\\ paths', () => {
    AppDatabase.getInstance({ path: 'D:\\databases\\valid_custom.db' });
    expect((globalThis as any).mockConstructorCalls[0]).toEqual(['D:\\databases\\valid_custom.db', expect.any(Object)]);
  });
});
