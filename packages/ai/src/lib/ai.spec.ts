import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createAiRouter,
  createFetchGeminiProvider,
  createFetchMoonshotProvider,
  createFetchDeepSeekProvider,
  createFetchOpenAIProvider,
  createLocalProvider,
  generateWithMetering,
  getAiUsage,
  recordAiUsage,
  resetAiUsage,
  parseStreamBody,
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

  it('handles Moonshot direct provider with Kimi and thinking configuration', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      expect(body.model).toBe('kimi-k2.6');
      expect(body.thinking?.type).toBe('enabled');
      expect(body.temperature).toBe(1.0);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Kimi response',
                reasoning: 'Kimi is thinking...',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      };
    }) as unknown as typeof fetch;

    const provider = createFetchMoonshotProvider({
      apiKey: 'test-kimi-key',
      model: 'kimi-k2.6',
      fetchImpl,
    });

    const result = await provider.generate({
      appId: 'test-app',
      prompt: 'Code a parser',
    });

    expect(result.text).toBe('Kimi response');
    expect(result.reasoning).toBe('Kimi is thinking...');
    expect(result.usage.totalTokens).toBe(30);
  });

  it('handles DeepSeek direct provider and captures reasoning_content', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'DeepSeek response',
              reasoning_content: 'DeepSeek CoT...',
            },
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 5,
          total_tokens: 10,
        },
      }),
    })) as unknown as typeof fetch;

    const provider = createFetchDeepSeekProvider({
      apiKey: 'test-ds-key',
      fetchImpl,
    });

    const result = await provider.generate({
      appId: 'test-app',
      prompt: 'Explain logic',
    });

    expect(result.text).toBe('DeepSeek response');
    expect(result.reasoning).toBe('DeepSeek CoT...');
  });

  it('handles OpenAI and Local providers', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'OpenAI response' } }],
      }),
    })) as unknown as typeof fetch;

    const openaiProvider = createFetchOpenAIProvider({
      apiKey: 'test-oa-key',
      fetchImpl,
    });

    const localProvider = createLocalProvider({
      baseUrl: 'http://localhost:11434/v1',
      fetchImpl,
    });

    const resultOa = await openaiProvider.generate({ appId: 'test', prompt: 'test' });
    const resultLoc = await localProvider.generate({ appId: 'test', prompt: 'test' });

    expect(resultOa.text).toBe('OpenAI response');
    expect(resultLoc.text).toBe('OpenAI response');
  });

  it('propagates AbortSignal for cancellation during stream parsing', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    const mockReadable = {
      getReader: () => {
        return {
          read: async () => {
            // Cancel stream instantly on first read
            controller.abort();
            return { done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Chunk 1"}}]}\n') };
          },
          releaseLock: () => {},
        };
      },
    };

    const response = {
      body: mockReadable,
    } as unknown as Response;

    const stream = parseStreamBody(response, (data) => ({ text: data.choices[0].delta.content }), signal);

    await expect(async () => {
      for await (const _chunk of stream) {
        // Read should throw DOMException due to abort
      }
    }).rejects.toThrow();
  });
});
