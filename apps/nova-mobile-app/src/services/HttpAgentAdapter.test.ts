import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock config.ts to avoid react-native Platform dependency
vi.mock('../config', () => ({
  config: {
    API_URL: 'http://mocked-default.com',
    API_TIMEOUT: 5000,
    APP_VERSION: '1.0.0-test',
    HEALTH_CHECK_INTERVAL: 30000,
    FEATURES: { MEMORY_SEARCH: true, VOICE_INPUT: false },
    THEME: {},
    BRIDGE_TOKEN: 'test_token_123',
  },
}));

import { HttpAgentAdapter } from './HttpAgentAdapter';

// Mock global fetch
global.fetch = vi.fn() as unknown as typeof fetch;

describe('HttpAgentAdapter', () => {
  let adapter: HttpAgentAdapter;
  const mockBaseUrl = 'http://test-api.com';

  beforeEach(() => {
    vi.resetAllMocks();
    adapter = new HttpAgentAdapter(mockBaseUrl, { maxRetries: 0, timeoutMs: 5000 });
  });

  describe('chat', () => {
    it('should send POST request to /chat and return content', async () => {
      const mockResponse = { content: 'Hello from AI' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await adapter.chat('Hello', 'proj-123');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/chat`,
        expect.objectContaining({
          method: 'POST',
          headers: new Headers({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test_token_123',
          }),
          body: JSON.stringify({ message: 'Hello', projectId: 'proj-123' }),
        }),
      );
      expect(result).toBe('Hello from AI');
    });

    it('should throw error when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(adapter.chat('hi')).rejects.toThrow('Chat failed: 500 Internal Server Error');
    });
  });

  describe('getStatus', () => {
    it('should fetch status successfully', async () => {
      const mockStatus = { status: 'idle', currentTask: null };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await adapter.getStatus();
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/status`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getHealth', () => {
    it('should fetch health endpoint', async () => {
      const mockHealth = { ok: true, uptime: 120 };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      });

      const result = await adapter.getHealth();
      expect(result).toEqual({ ok: true, uptime: 120 });
    });

    it('should throw on non-ok response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await expect(adapter.getHealth()).rejects.toThrow('Health check failed: 503');
    });
  });

  describe('searchMemories', () => {
    it('should search memories and return results array', async () => {
      const mockResults = { results: ['memory-1', 'memory-2'] };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults,
      });

      const result = await adapter.searchMemories('test query');
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/memories/search?query=test%20query`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(result).toEqual(['memory-1', 'memory-2']);
    });

    it('should return empty array when results is null', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await adapter.searchMemories('nothing');
      expect(result).toEqual([]);
    });
  });

  describe('getProjects', () => {
    it('should fetch project list', async () => {
      const mockProjects = [{ id: 'p1', name: 'Project 1', status: 'active' }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await adapter.getProjects();
      expect(result).toEqual(mockProjects);
    });
  });

  describe('setBaseUrl', () => {
    it('should update the base URL for subsequent requests', async () => {
      const newUrl = 'http://new-server.com';
      adapter.setBaseUrl(newUrl);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, uptime: 1 }),
      });

      await adapter.getHealth();
      expect(global.fetch).toHaveBeenCalledWith(`${newUrl}/health`, expect.anything());
    });
  });

  describe('stub methods', () => {
    it('searchWeb should return empty array', async () => {
      const result = await adapter.searchWeb('test');
      expect(result).toEqual([]);
    });

    it('updateCapabilities should be a no-op', async () => {
      await expect(adapter.updateCapabilities(['cap1'])).resolves.toBeUndefined();
    });

    it('sendIpcMessage should be a no-op', async () => {
      await expect(adapter.sendIpcMessage({ type: 'test' })).resolves.toBeUndefined();
    });
  });
});
