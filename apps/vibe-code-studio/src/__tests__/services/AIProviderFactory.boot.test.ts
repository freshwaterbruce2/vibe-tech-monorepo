/**
 * Boot-cost regression tests for AIProviderFactory (proxy mode, the default).
 *
 * App boot initializes the proxy-backed providers via initializeAllProviders();
 * provider validation must be the GET /api/ai/health reachability probe — a
 * boot must NEVER fire a chat/completions request (zero completion tokens).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIProviderFactory } from '../../services/ai/AIProviderFactory';
import type { AIProviderConfig } from '../../services/ai/AIProviderInterface';
import { AIProvider } from '../../services/ai/AIProviderInterface';

const healthResponse = () =>
  new Response(JSON.stringify({ ok: true, configured: { openrouter: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const bootConfigs = (): Map<AIProvider, AIProviderConfig> => {
  // Mirrors buildProxyConfigs() in useAppEffects: proxy providers boot with an
  // empty client key (the sidecar injects the real key server-side).
  const configs = new Map<AIProvider, AIProviderConfig>();
  for (const provider of [AIProvider.MOONSHOT, AIProvider.OPENROUTER, AIProvider.GOOGLE]) {
    configs.set(provider, { provider, apiKey: '', model: 'moonshot/kimi-2.5-pro' });
  }
  return configs;
};

describe('AIProviderFactory boot (proxy mode)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(healthResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    await AIProviderFactory.getInstance().cleanup();
    vi.unstubAllGlobals();
  });

  it('initializes every proxy provider without firing a completion request', async () => {
    const factory = AIProviderFactory.getInstance();

    await factory.initializeAllProviders(bootConfigs());

    // Boot succeeded: providers are initialized and available.
    expect(factory.getInitializedProviders()).toEqual(
      expect.arrayContaining([AIProvider.MOONSHOT, AIProvider.OPENROUTER, AIProvider.GOOGLE])
    );

    // Zero-token boot: nothing may POST, and nothing may hit a completions URL.
    expect(fetchMock).toHaveBeenCalled();
    for (const [url, init] of fetchMock.mock.calls) {
      const method = ((init as RequestInit | undefined)?.method ?? 'GET').toUpperCase();
      expect(String(url)).not.toContain('/chat/completions');
      expect(method).toBe('GET');
    }
  });

  it('validates providers against the /health endpoint only', async () => {
    const factory = AIProviderFactory.getInstance();

    await factory.initializeAllProviders(bootConfigs());

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toMatch(/\/health$/);
    }
  });
});
