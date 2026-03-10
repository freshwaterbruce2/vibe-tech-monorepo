/**
 * OpenRouter AI Client Tests
 * @vitest-environment node
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenRouterClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should classify product into correct category', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'electronics-123',
              },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      const categories = [
        { id: 'electronics-123', name: 'Electronics' },
        { id: 'clothing-456', name: 'Clothing' },
      ];

      const result = await openRouterAI.classifyProduct(
        'Wireless Headphones',
        'Bluetooth headphones with noise cancellation',
        categories
      );

      expect(result).toBe('electronics-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should enhance product description', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: {
                role: 'assistant',
                content:
                  '✨ Premium Wireless Headphones\n• Crystal-clear audio\n• 30-hour battery life\n• Active noise cancellation',
              },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.enhanceDescription(
        'Wireless Headphones',
        'Good headphones with long battery'
      );

      expect(result).toContain('Premium Wireless Headphones');
      expect(result).toContain('noise cancellation');
    });

    it('should generate trending keywords as array', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: {
                role: 'assistant',
                content: '["smart home 2026", "AI gadgets", "wireless tech", "eco-friendly", "portable"]',
              },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      const keywords = await openRouterAI.generateTrendingKeywords('technology');

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords).toHaveLength(5);
      expect(keywords).toContain('smart home 2026');
    });

    it('should use correct default models', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      await openRouterAI.enhanceDescription('Test', 'Test description');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('deepseek/deepseek-chat');
    });
  });

  // ============================================
  // BLOCK 2: Edge Case Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should return null when category ID not in available list', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: { content: 'invalid-category-999' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      const categories = [{ id: 'electronics-123', name: 'Electronics' }];

      const result = await openRouterAI.classifyProduct('Product', 'Description', categories);

      expect(result).toBeNull();
    });

    it('should clean markdown code blocks from keyword response', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: {
                content: '```json\n["keyword1", "keyword2"]\n```',
              },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      const keywords = await openRouterAI.generateTrendingKeywords('test');

      expect(keywords).toEqual(['keyword1', 'keyword2']);
    });

    it('should strip quotes from category ID', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: { content: '"electronics-123"' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      const categories = [{ id: 'electronics-123', name: 'Electronics' }];

      const result = await openRouterAI.classifyProduct('Product', 'Description', categories);

      expect(result).toBe('electronics-123');
    });

    it('should use custom models from environment', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      process.env.OPENROUTER_CHAT_MODEL = 'custom/model-v2';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      await openRouterAI.enhanceDescription('Test', 'Description');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('custom/model-v2');
    });

    it('should return empty array for non-array keyword response', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [
            {
              message: { content: '{"keywords": ["a", "b"]}' },
              finish_reason: 'stop',
            },
          ],
        }),
      });

      const { openRouterAI } = await import('./openrouter');

      const keywords = await openRouterAI.generateTrendingKeywords('test');

      expect(keywords).toEqual([]);
    });
  });

  // ============================================
  // BLOCK 3: Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should return null for classification when API key missing', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.classifyProduct('Test', 'Desc', []);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'OPENROUTER_API_KEY missing, skipping AI classification'
      );

      consoleSpy.mockRestore();
    });

    it('should return original description when API key missing', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.enhanceDescription('Test', 'Original description');

      expect(result).toBe('Original description');
      consoleSpy.mockRestore();
    });

    it('should return empty array for keywords when API key missing', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.generateTrendingKeywords('test');

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle API error response', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.classifyProduct('Test', 'Desc', [
        { id: '1', name: 'Cat' },
      ]);

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should handle empty choices in response', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          choices: [],
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.classifyProduct('Test', 'Desc', [
        { id: '1', name: 'Cat' },
      ]);

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return original description on enhancement error', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.enhanceDescription('Test', 'Original text');

      expect(result).toBe('Original text');
      consoleSpy.mockRestore();
    });

    it('should return empty array on keyword generation error', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { openRouterAI } = await import('./openrouter');

      const result = await openRouterAI.generateTrendingKeywords('test');

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });
});
