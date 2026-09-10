import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../services/AIUsageMode', () => ({
  activeAIUsageMode: 'subscription',
  backendBaseUrl: 'https://api.example.com',
}));
vi.mock('../../services/BillingService', () => ({
  billingService: {
    getStatus: vi.fn(async () => ({ managedAI: { available: true, maxTokens: 2048 } })),
  },
}));
vi.mock('../../services/ai/AIProviderFactory', () => ({
  AIProviderFactory: { getInstance: () => ({}) },
}));
import { UnifiedAIService } from '../../services/ai/UnifiedAIService';
import { BackendProxyService } from '../../services/ai/providers/BackendProxyService';

describe('Subscription AI request isolation', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  it('uses the managed OpenRouter route and never sends a personal authorization key', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })
    );
    await new BackendProxyService().complete({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('https://api.example.com/api/ai/openrouter/api/v1/chat/completions');
    expect(options?.headers).toEqual({
      'Content-Type': 'application/json',
      'x-ai-mode': 'subscription',
    });
    expect(options?.credentials).toBe('include');
  });
  it('stops on exhausted allowance without falling back to another provider or key', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Allowance exhausted', { status: 429 }));
    await expect(
      new BackendProxyService().complete({
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: 'Hi' }],
      })
    ).rejects.toThrow('429');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects unknown subscription models instead of returning a demo success', async () => {
    await expect(
      UnifiedAIService.getInstance().complete({
        model: 'not-a-real-model',
        messages: [{ role: 'user', content: 'Hi' }],
      })
    ).rejects.toThrow('model is unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
});
