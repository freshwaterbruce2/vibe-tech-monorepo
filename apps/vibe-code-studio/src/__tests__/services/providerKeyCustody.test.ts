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
