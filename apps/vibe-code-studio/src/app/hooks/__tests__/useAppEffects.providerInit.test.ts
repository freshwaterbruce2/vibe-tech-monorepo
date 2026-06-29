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
