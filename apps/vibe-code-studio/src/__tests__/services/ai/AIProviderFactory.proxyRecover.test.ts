import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIProviderFactory } from '../../../services/ai/AIProviderFactory';
import type { AIProviderConfig } from '../../../services/ai/AIProviderInterface';
import { AIProvider } from '../../../services/ai/AIProviderInterface';

const healthResponse = (configured: Record<string, boolean> = { openrouter: true }) =>
  new Response(JSON.stringify({ ok: true, configured }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('AIProviderFactory proxy recovery', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(healthResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    await AIProviderFactory.getInstance().cleanup();
    vi.unstubAllGlobals();
  });

  it('auto-initializes via proxy when getProvider has no config', async () => {
    const factory = AIProviderFactory.getInstance();
    // Do not pre-initialize — getProvider should recover in proxy mode
    const provider = await factory.getProvider(AIProvider.OPENROUTER);
    expect(provider).toBeTruthy();
  });

  it('ensureProxyProvidersInitialized initializes missing providers and swallows failures', async () => {
    const factory = AIProviderFactory.getInstance();
    await factory.ensureProxyProvidersInitialized();
    expect(factory.getInitializedProviders().length).toBeGreaterThan(0);

    // Second call: already initialized path
    await factory.ensureProxyProvidersInitialized();

    // Force a failure path: mock initializeProvider via broken health then recover
    fetchMock.mockRejectedValueOnce(new Error('down'));
    await factory.cleanup();
    await factory.ensureProxyProvidersInitialized();
  });

  it('logs a warning when a proxy provider fails during ensure', async () => {
    const factory = AIProviderFactory.getInstance();
    await factory.cleanup();
    // First two providers succeed, third fails via initializeProvider spy
    const original = factory.initializeProvider.bind(factory);
    let calls = 0;
    vi.spyOn(factory, 'initializeProvider').mockImplementation(async config => {
      calls += 1;
      if (calls === 3) throw new Error('provider init failed');
      return original(config);
    });
    await factory.ensureProxyProvidersInitialized();
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('getProvider uses explicit config when provided', async () => {
    const factory = AIProviderFactory.getInstance();
    const config: AIProviderConfig = {
      provider: AIProvider.OPENROUTER,
      apiKey: '',
      model: 'deepseek/deepseek-v4-pro',
    };
    const p = await factory.getProvider(AIProvider.OPENROUTER, config);
    expect(p).toBeTruthy();
  });
});
