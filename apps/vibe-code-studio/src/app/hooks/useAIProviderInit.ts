/**
 * AI provider factory initialization (proxy + BYOK modes).
 */

import { SecureApiKeyManager } from '@vibetech/core';
import { useEffect } from 'react';

import { logger } from '../../services/Logger';
import { AIProviderFactory } from '../../services/ai/AIProviderFactory';
import type { AIProviderConfig } from '../../services/ai/AIProviderInterface';
import { AIProvider } from '../../services/ai/AIProviderInterface';
import { syncStoredApiKeysToBackend } from '../../services/ai/backendKeySync';
import { waitForBackendReady } from './backendHealth';

// Proxy mode (default ON): the backend injects provider keys, so providers are
// initialized without a client-side key. Must match AIProviderFactory.
const USE_AI_PROXY = import.meta.env['VITE_USE_AI_PROXY'] !== 'false';

/** Initialize a single provider in the factory with a given API key */
async function initProviderWithKey(
  factory: AIProviderFactory,
  provider: AIProvider,
  apiKey: string,
  model: string
) {
  await factory.initializeProvider({
    provider,
    apiKey,
    model,
  });
}

// OpenRouter backs multiple providers under one key.
const OPENROUTER_BACKED_PROVIDERS = [
  AIProvider.OPENROUTER,
  AIProvider.OPENAI,
  AIProvider.ANTHROPIC,
  AIProvider.GROQ,
  AIProvider.PERPLEXITY,
  AIProvider.TOGETHER,
  AIProvider.OLLAMA,
];

/**
 * Resolve a provider key for direct (BYOK) mode. Keys come only from the
 * encrypted SecureApiKeyManager store (Settings UI) — never from the client
 * bundle (import.meta.env), which would ship secrets to the browser.
 */
function makeGetKey(keyManager: ReturnType<typeof SecureApiKeyManager.getInstance>) {
  return (provider: string): Promise<string | null> => keyManager.getApiKey(provider);
}

/** Build the proxy-mode config map (providers initialized without a client key). */
function buildProxyConfigs(): Map<AIProvider, AIProviderConfig> {
  const configs = new Map<AIProvider, AIProviderConfig>();
  const proxyProviders = [AIProvider.MOONSHOT, AIProvider.OPENROUTER, AIProvider.GOOGLE];
  proxyProviders.forEach(p => {
    configs.set(p, { provider: p, apiKey: '', model: 'moonshot/kimi-2.5-pro' });
  });
  return configs;
}

/** Build the direct-key config map by reading keys from the key manager. */
async function buildDirectConfigs(
  keyManager: ReturnType<typeof SecureApiKeyManager.getInstance>
): Promise<Map<AIProvider, AIProviderConfig>> {
  const configs = new Map<AIProvider, AIProviderConfig>();
  const getKey = makeGetKey(keyManager);

  const openRouterKey = await getKey('openrouter');
  if (openRouterKey) {
    OPENROUTER_BACKED_PROVIDERS.forEach(p => {
      configs.set(p, { provider: p, apiKey: openRouterKey, model: 'moonshot/kimi-2.5-pro' });
    });
  }

  const moonshotKey = await getKey('moonshot');
  if (moonshotKey) {
    configs.set(AIProvider.MOONSHOT, {
      provider: AIProvider.MOONSHOT,
      apiKey: moonshotKey,
      model: 'moonshot/kimi-2.5-pro',
    });
  }

  const googleKey = await getKey('google');
  if (googleKey) {
    configs.set(AIProvider.GOOGLE, {
      provider: AIProvider.GOOGLE,
      apiKey: googleKey,
      model: 'gemini-2.0-flash',
    });
  }

  const deepseekKey = await getKey('deepseek');
  if (deepseekKey) {
    configs.set(AIProvider.DEEPSEEK, {
      provider: AIProvider.DEEPSEEK,
      apiKey: deepseekKey,
      model: 'deepseek/deepseek-v3.2',
    });
  }

  configs.set(AIProvider.LOCAL, {
    provider: AIProvider.LOCAL,
    apiKey: '',
    model: 'local/vibe-completion',
  });

  return configs;
}

/** Initialize all AI providers, choosing proxy or direct-key mode. */
async function initAIProviders(): Promise<void> {
  const factory = AIProviderFactory.getInstance();

  if (USE_AI_PROXY) {
    await factory.initializeAllProviders(buildProxyConfigs());
    return;
  }

  const keyManager = SecureApiKeyManager.getInstance(logger);
  const configs = await buildDirectConfigs(keyManager);
  await factory.initializeAllProviders(configs);
}

/** Re-initialize providers for a single provider after a key update from Settings. */
async function reinitProviderFromEvent(e: Event): Promise<void> {
  const detail = (e as CustomEvent).detail;
  const provider = detail?.provider as string;
  if (!provider) return;

  const factory = AIProviderFactory.getInstance();
  const keyManager = SecureApiKeyManager.getInstance(logger);
  const apiKey = await keyManager.getApiKey(provider);
  if (!apiKey) return;

  logger.info(`[useAIProviderInit] Re-initializing provider after key update: ${provider}`);

  try {
    if (provider === 'openrouter') {
      for (const p of OPENROUTER_BACKED_PROVIDERS) {
        await initProviderWithKey(factory, p, apiKey, 'moonshot/kimi-2.5-pro');
      }
    } else if (provider === 'moonshot') {
      await initProviderWithKey(factory, AIProvider.MOONSHOT, apiKey, 'moonshot/kimi-2.5-pro');
    } else if (provider === 'google') {
      await initProviderWithKey(factory, AIProvider.GOOGLE, apiKey, 'gemini-2.0-flash');
    } else if (provider === 'deepseek') {
      await initProviderWithKey(factory, AIProvider.DEEPSEEK, apiKey, 'deepseek/deepseek-v3.2');
    }
  } catch (error) {
    logger.error(`[useAIProviderInit] Failed to re-init provider ${provider}:`, error);
  }
}

/**
 * Hook for initializing AI Providers
 * Loads keys from SecureApiKeyManager, and listens for key updates
 */
export function useAIProviderInit() {
  useEffect(() => {
    if (USE_AI_PROXY) {
      void (async () => {
        await waitForBackendReady();
        await syncStoredApiKeysToBackend(SecureApiKeyManager.getInstance(logger));
        await initAIProviders();
      })();
    } else {
      initAIProviders();
    }

    const handleKeyUpdate = (e: Event) => {
      if (USE_AI_PROXY) {
        void (async () => {
          await syncStoredApiKeysToBackend(SecureApiKeyManager.getInstance(logger), 0);
          await reinitProviderFromEvent(e);
        })();
      } else {
        reinitProviderFromEvent(e);
      }
    };

    window.addEventListener('apiKeyUpdated', handleKeyUpdate);
    return () => window.removeEventListener('apiKeyUpdated', handleKeyUpdate);
  }, []);
}
