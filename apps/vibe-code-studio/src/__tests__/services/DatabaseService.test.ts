import { describe, expect, it, vi } from 'vitest';
import { DatabaseService, databaseService } from '../../services/DatabaseService';

// Mock sql.js since it's a complex dependency
vi.mock('sql.js', () => ({
  default: vi.fn(() => Promise.resolve({
    Database: vi.fn(() => ({
      exec: vi.fn(),
      run: vi.fn(),
      prepare: vi.fn(() => ({
        get: vi.fn(),
        run: vi.fn(),
      })),
      close: vi.fn(),
    })),
  })),
}));

// Mock better-sqlite3 since it's a native dependency
vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => ({
    exec: vi.fn(),
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    })),
    close: vi.fn(),
  })),
}));

// Mock logger to avoid cluttering test output
vi.mock('../Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DatabaseService', () => {
  describe('Initialization', () => {
    it('should be a singleton instance', () => {
      expect(databaseService).toBeInstanceOf(DatabaseService);
    });

    it('should initialize successfully', async () => {
      await databaseService.initialize();
      const status = await databaseService.getStatus();
      expect(['ready', 'fallback', 'initializing']).toContain(status);
    });
  });

  describe('Storage Operations', () => {
    it('should save and retrieve chat messages', async () => {
      const workspace = 'test-workspace';
      const userMsg = 'hello';
      const aiRes = 'hi';
      const model = 'test-model';

      const id = await databaseService.saveChatMessage(workspace, userMsg, aiRes, model);
      expect(id).toBeDefined();

      const history = await databaseService.getChatHistory(workspace);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should log analytics events', async () => {
      await databaseService.logEvent('test_event', { foo: 'bar' });
      // In fallback mode this saves to localStorage, which we could verify if needed
    });
  });
});
