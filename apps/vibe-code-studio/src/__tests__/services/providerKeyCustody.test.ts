import { describe, expect, it } from 'vitest';

import type { AICompletionRequest } from '../../types/ai';
import { DeepSeekService } from '../../services/ai/providers/DeepSeekService';
import { GoogleGenerativeAIService } from '../../services/ai/providers/GoogleGenerativeAIService';
import { MoonshotService } from '../../services/ai/providers/MoonshotService';
import { OpenRouterService } from '../../services/ai/providers/OpenRouterService';

/**
 * Provider key custody: direct provider services must NOT read API keys from the
 * client bundle (import.meta.env). A key is supplied explicitly (from the
 * factory / SecureApiKeyManager) or the request is refused. This locks the
 * VITE_*_API_KEY removal so secrets can never leak into the browser build.
 */
const req = (): AICompletionRequest => ({
  messages: [{ role: 'user', content: 'hi' }],
});

describe('provider key custody (no client-bundle env keys)', () => {
  it('Moonshot refuses to complete without an explicitly supplied key', async () => {
    await expect(new MoonshotService().complete(req())).rejects.toThrow(/not configured/i);
  });

  it('DeepSeek refuses to complete without an explicitly supplied key', async () => {
    await expect(new DeepSeekService().complete(req())).rejects.toThrow(/not configured/i);
  });

  it('constructs every direct provider with and without an explicit key', () => {
    // No key: constructors must not throw (they warn and stay unconfigured).
    expect(() => new MoonshotService()).not.toThrow();
    expect(() => new DeepSeekService()).not.toThrow();
    expect(() => new GoogleGenerativeAIService()).not.toThrow();
    expect(() => new OpenRouterService()).not.toThrow();

    // Explicit key: the BYOK / factory path.
    expect(() => new MoonshotService({ apiKey: 'sk-moon' })).not.toThrow();
    expect(() => new DeepSeekService({ apiKey: 'sk-deep' })).not.toThrow();
    expect(() => new GoogleGenerativeAIService({ apiKey: 'sk-goog' })).not.toThrow();
    expect(() => new OpenRouterService({ apiKey: 'sk-or' })).not.toThrow();
  });
});

/**
 * MODEL_MAP resolution: the Kimi 2.5 aliases must map to the OpenRouter-hosted
 * `moonshotai/kimi-k2.5` slug so proxy-mode fallback (BackendProxyService
 * .buildOpenRouterRoute) and direct OpenRouter mode agree. `moonshot/` is the
 * direct-Moonshot-API author and 404s on OpenRouter, so it must be rewritten.
 */
describe('OpenRouterService.resolveModelId (Kimi 2.5 aliases)', () => {
  it('maps both kimi-2.5-pro aliases to moonshotai/kimi-k2.5', () => {
    expect(OpenRouterService.resolveModelId('kimi-2.5-pro')).toBe('moonshotai/kimi-k2.5');
    expect(OpenRouterService.resolveModelId('moonshot/kimi-2.5-pro')).toBe('moonshotai/kimi-k2.5');
  });

  it('passes through an already-canonical author/slug id unchanged', () => {
    expect(OpenRouterService.resolveModelId('deepseek/deepseek-r1')).toBe('deepseek/deepseek-r1');
  });

  it('maps a known bare alias via MODEL_MAP', () => {
    expect(OpenRouterService.resolveModelId('gpt-4o')).toBe('openai/gpt-4o');
  });

  it('prefixes a genuinely unknown, slash-less slug with openai/ (fallback)', () => {
    expect(OpenRouterService.resolveModelId('totally-unknown-slug')).toBe(
      'openai/totally-unknown-slug'
    );
  });
});
