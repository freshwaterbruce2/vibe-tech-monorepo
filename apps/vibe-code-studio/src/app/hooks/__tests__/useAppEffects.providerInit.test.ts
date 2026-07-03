import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Direct (BYOK) provider init must source keys from the encrypted
 * SecureApiKeyManager store only — never from the client bundle
 * (import.meta.env). This locks the VITE_*_API_KEY removal in buildDirectConfigs.
 */
const getApiKey = vi.fn();
const initializeAllProviders = vi.fn().mockResolvedValue(undefined);
const initializeProvider = vi.fn().mockResolvedValue(undefined);

vi.mock('@vibetech/core', () => ({
  SecureApiKeyManager: { getInstance: () => ({ getApiKey }) },
}));
vi.mock('../../../services/ai/AIProviderFactory', () => ({
  AIProviderFactory: { getInstance: () => ({ initializeAllProviders, initializeProvider }) },
}));
vi.mock('../../../modules/core/services/DatabaseManager', () => ({
  getDatabase: vi.fn(),
  getDbInitError: vi.fn(() => null),
}));

describe('useAIProviderInit — direct (BYOK) key sourcing', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('reads keys from SecureApiKeyManager and ignores import.meta.env', async () => {
    // USE_AI_PROXY is a module-level const, so set the env and (re)import fresh.
    vi.resetModules();
    vi.stubEnv('VITE_USE_AI_PROXY', 'false');
    // An env key is present but must be ignored — keys come from the manager.
    vi.stubEnv('VITE_OPENROUTER_API_KEY', 'env-should-be-ignored');
    getApiKey.mockImplementation(async (provider: string) => `mgr-${provider}-key`);

    const { useAIProviderInit } = await import('../useAppEffects');

    await act(async () => {
      renderHook(() => useAIProviderInit());
      // flush the async initAIProviders() kicked off by the effect
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(initializeAllProviders).toHaveBeenCalledTimes(1);
    const configs = initializeAllProviders.mock.calls[0][0] as Map<string, { apiKey: string }>;

    // OpenRouter is keyed from the manager, not the (ignored) env var.
    const apiKeys = [...configs.values()].map(c => c.apiKey);
    expect(apiKeys).toContain('mgr-openrouter-key');
    expect(apiKeys).not.toContain('env-should-be-ignored');
    expect(getApiKey).toHaveBeenCalledWith('openrouter');
    expect(getApiKey).toHaveBeenCalledWith('moonshot');
    expect(getApiKey).toHaveBeenCalledWith('google');
    expect(getApiKey).toHaveBeenCalledWith('deepseek');
  });
});

/**
 * Proxy-mode boot ORDER (v1.2.1): the provider factory validates against the
 * backend's /health, which only reports keys that reached the custody
 * endpoint. So the effect must run waitForBackendReady -> sync stored keys ->
 * THEN initialize providers. Init-before-sync marks every provider
 * unavailable in installed builds ("Provider X is not configured").
 */
const syncStoredApiKeysToBackend = vi.fn();
vi.mock('../../../services/ai/backendKeySync', () => ({
  syncStoredApiKeysToBackend,
  pushApiKeyToBackend: vi.fn(),
}));

describe('useAIProviderInit — proxy-mode boot order', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function mountProxyMode() {
    vi.resetModules();
    vi.stubEnv('VITE_USE_AI_PROXY', 'true');
    const { useAIProviderInit } = await import('../useAppEffects');
    return renderHook(() => useAIProviderInit());
  }

  it('syncs stored keys to the sidecar BEFORE initializing providers', async () => {
    const order: string[] = [];
    syncStoredApiKeysToBackend.mockImplementation(async () => {
      order.push('sync');
    });
    initializeAllProviders.mockImplementation(async () => {
      order.push('init');
    });

    await act(async () => {
      await mountProxyMode();
    });
    await vi.waitFor(() => expect(initializeAllProviders).toHaveBeenCalledTimes(1));

    expect(order).toEqual(['sync', 'init']);
  });

  it('initializes the proxy providers without any client-side key', async () => {
    syncStoredApiKeysToBackend.mockResolvedValue(undefined);
    initializeAllProviders.mockResolvedValue(undefined);

    await act(async () => {
      await mountProxyMode();
    });
    await vi.waitFor(() => expect(initializeAllProviders).toHaveBeenCalledTimes(1));

    const configs = initializeAllProviders.mock.calls[0][0] as Map<
      string,
      { apiKey: string }
    >;
    expect(configs.size).toBeGreaterThan(0);
    for (const cfg of configs.values()) {
      expect(cfg.apiKey).toBe('');
    }
    // proxy mode never reads client keys at boot
    expect(getApiKey).not.toHaveBeenCalled();
  });

  it('re-syncs keys before re-initializing a provider on apiKeyUpdated', async () => {
    const order: string[] = [];
    syncStoredApiKeysToBackend.mockImplementation(async () => {
      order.push('sync');
    });
    initializeAllProviders.mockImplementation(async () => {
      order.push('boot-init');
    });
    initializeProvider.mockImplementation(async () => {
      order.push('reinit');
    });
    getApiKey.mockResolvedValue('mgr-openrouter-key');

    await act(async () => {
      await mountProxyMode();
    });
    await vi.waitFor(() => expect(initializeAllProviders).toHaveBeenCalledTimes(1));
    order.length = 0; // isolate the event flow from boot

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('apiKeyUpdated', { detail: { provider: 'openrouter' } })
      );
    });
    await vi.waitFor(() => expect(initializeProvider).toHaveBeenCalled());

    expect(order[0]).toBe('sync');
    expect(order.slice(1).every(step => step === 'reinit')).toBe(true);
    // update path passes retries=0 — a failed push must not stall the UI thread
    expect(syncStoredApiKeysToBackend).toHaveBeenCalledWith(expect.anything(), 0);
  });
});
