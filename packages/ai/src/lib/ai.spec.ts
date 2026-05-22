import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createAiRouter,
  createFetchGeminiProvider,
  generateWithMetering,
  getAiUsage,
  recordAiUsage,
  resetAiUsage,
  type AiProvider,
} from './ai';

describe('@vibetech/ai', () => {
  beforeEach(() => {
    resetAiUsage();
  });

  it('records tenant and app scoped token usage', () => {
    const record = recordAiUsage({
      appId: 'invoice-automation-saas',
      tenantId: 'tenant-a',
      provider: 'gemini',
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
    });

    expect(record.totalTokens).toBe(150);
    expect(getAiUsage('invoice-automation-saas', 'gemini', 'tenant-a')).toMatchObject({
      tenantId: 'tenant-a',
      appId: 'invoice-automation-saas',
      totalTokens: 150,
    });
  });

  it('falls back from Gemini to OpenRouter through the router', async () => {
    const gemini = {
      name: 'gemini',
      generate: vi.fn(async () => {
        throw new Error('primary down');
      }),
    } satisfies AiProvider;
    const openRouter = {
      name: 'openrouter',
      generate: vi.fn(async () => ({
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
        text: 'fallback response',
        usage: {
          inputTokens: 2,
          outputTokens: 2,
          totalTokens: 4,
        },
      })),
    } satisfies AiProvider;

    await expect(
      createAiRouter({ gemini, openRouter }).generate({
        appId: 'invoice-automation-saas',
        prompt: 'Draft a reminder',
      }),
    ).resolves.toMatchObject({
      provider: 'openrouter',
      text: 'fallback response',
    });
  });

  it('normalizes Gemini fetch responses and meters usage', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'invoice copy' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 6,
          totalTokenCount: 10,
        },
      }),
    })) as unknown as typeof fetch;

    const provider = createFetchGeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-test',
      fetchImpl,
    });

    const result = await generateWithMetering(provider, {
      appId: 'invoice-automation-saas',
      tenantId: 'tenant-a',
      prompt: 'Generate copy',
    });

    expect(result.text).toBe('invoice copy');
    expect(getAiUsage('invoice-automation-saas', 'gemini', 'tenant-a')?.totalTokens).toBe(10);
  });
});
