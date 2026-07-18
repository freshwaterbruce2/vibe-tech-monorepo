import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage } from '../../types/ai';
import { AIProvider } from '../../services/ai/AIProviderInterface';
import { UnifiedAIService } from '../../services/ai/UnifiedAIService';

const { mockFactory, mockProvider, completeSpy } = vi.hoisted(() => {
  const complete = vi.fn();
  const provider = {
    initialize: vi.fn(),
    complete,
    streamComplete: vi.fn(async function* streamComplete() {
      if (false) {
        yield {
          id: 'stream-id',
          choices: [{ delta: { content: '' }, index: 0 }],
          model: 'moonshot/kimi-2.5-pro',
          created: Date.now(),
          content: '',
        };
      }
    }),
    getAvailableModels: vi.fn(async () => []),
    validateConnection: vi.fn(async () => true),
    getUsageStats: vi.fn(async () => ({
      tokensUsed: 0,
      estimatedCost: 0,
      requestCount: 0,
    })),
    cancelStream: vi.fn(),
  };
  const factory = {
    getProvider: vi.fn(),
    initializeProvider: vi.fn(),
    getInitializedProviders: vi.fn(() => []),
    getProviderStatus: vi.fn(),
  };

  return {
    mockFactory: factory,
    mockProvider: provider,
    completeSpy: complete,
  };
});

vi.mock('../../services/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/ai/AIProviderFactory', () => ({
  AIProviderFactory: {
    getInstance: () => mockFactory,
  },
}));

describe('UnifiedAIService model routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFactory.getProvider.mockResolvedValue(mockProvider);
    completeSpy.mockResolvedValue({
      content: 'override-model-response',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    (UnifiedAIService as unknown as { instance?: UnifiedAIService }).instance = undefined;
  });

  it('routes completions through the requested model override', async () => {
    const service = UnifiedAIService.getInstance();
    service.setModel('moonshot/kimi-2.5-pro');
    const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];

    const content = await service.chat(messages, { model: 'openai/gpt-5.2' });

    expect(content).toBe('override-model-response');
    expect(mockFactory.getProvider).toHaveBeenCalledWith(AIProvider.OPENROUTER);
    expect(completeSpy).toHaveBeenCalledWith(
      'openai/gpt-5.2',
      expect.objectContaining({
        messages,
      })
    );
  });

  it('uses the current model when no override is provided', async () => {
    const service = UnifiedAIService.getInstance();
    service.setModel('moonshot/kimi-2.5-pro');
    const messages: ChatMessage[] = [{ role: 'user', content: 'hello again' }];

    await service.chat(messages);

    expect(mockFactory.getProvider).toHaveBeenCalledWith(AIProvider.MOONSHOT);
    expect(completeSpy).toHaveBeenCalledWith(
      'moonshot/kimi-2.5-pro',
      expect.objectContaining({
        messages,
      })
    );
  });

  it('forwards a pre-aborted signal to the provider', async () => {
    const service = UnifiedAIService.getInstance();
    service.setModel('deepseek/deepseek-v4-pro');
    const controller = new AbortController();
    controller.abort();

    await service.sendContextualMessage({ userQuery: 'plan', signal: controller.signal });

    expect(completeSpy).toHaveBeenCalledWith(
      'deepseek/deepseek-v4-pro',
      expect.objectContaining({ signal: expect.objectContaining({ aborted: true }) })
    );
  });

  it('lazily initializes via backend proxy when the factory has no provider yet', async () => {
    mockFactory.getProvider
      .mockRejectedValueOnce(new Error('Provider not initialized'))
      .mockResolvedValue(mockProvider);
    mockFactory.initializeProvider.mockResolvedValue(mockProvider);
    mockFactory.getInitializedProviders.mockReturnValue([]);

    const service = UnifiedAIService.getInstance();
    service.setModel('moonshot/kimi-2.5-pro');

    const content = await service.chat([{ role: 'user', content: 'hi' }]);
    expect(content).toBe('override-model-response');
    expect(mockFactory.initializeProvider).toHaveBeenCalledWith(
      expect.objectContaining({ provider: AIProvider.MOONSHOT, apiKey: '' })
    );
  });

  it('returns undefined path when proxy lazy init fails and surfaces unavailable', async () => {
    mockFactory.getProvider.mockRejectedValue(new Error('Provider not initialized'));
    mockFactory.initializeProvider.mockRejectedValue(new Error('proxy down'));
    mockFactory.getInitializedProviders.mockReturnValue([]);

    const service = UnifiedAIService.getInstance();
    service.setModel('moonshot/kimi-2.5-pro');

    await expect(service.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      /AI service unavailable/i
    );
  });

  it('propagates the no-provider error through the streaming path (proxy guard)', async () => {
    mockFactory.getProvider.mockRejectedValue(new Error('Provider not initialized'));
    mockFactory.initializeProvider.mockRejectedValue(new Error('proxy down'));
    mockFactory.getInitializedProviders.mockReturnValue([]);

    const service = UnifiedAIService.getInstance();
    service.setModel('moonshot/kimi-2.5-pro');

    const drain = async () => {
      for await (const _chunk of service.sendContextualMessageStream({ userQuery: 'hi' })) {
        // exhaust the generator
      }
    };

    await expect(drain()).rejects.toThrow();
  });

  it('lazily initializes via proxy for streamComplete', async () => {
    mockFactory.getProvider
      .mockRejectedValueOnce(new Error('Provider not initialized'))
      .mockResolvedValue(mockProvider);
    mockFactory.initializeProvider.mockResolvedValue(mockProvider);
    mockFactory.getInitializedProviders.mockReturnValue([]);
    mockProvider.streamComplete.mockImplementation(async function* () {
      yield {
        id: 's',
        choices: [{ delta: { content: 'x' }, index: 0 }],
        model: 'm',
        created: Date.now(),
        content: 'x',
      };
    });

    const service = UnifiedAIService.getInstance();
    service.setModel('moonshot/kimi-2.5-pro');
    const chunks: unknown[] = [];
    for await (const chunk of service.sendContextualMessageStream({ userQuery: 'stream' })) {
      chunks.push(chunk);
    }
    expect(mockFactory.initializeProvider).toHaveBeenCalled();
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('raises a real error instead of returning fake demo content for an unregistered model', async () => {
    const service = UnifiedAIService.getInstance();
    service.setModel('local/vibe-completion');

    await expect(service.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      /Model "local\/vibe-completion" is not available/i
    );
    expect(mockFactory.getProvider).not.toHaveBeenCalled();
  });
});

describe('UnifiedAIService BYOK key resolution (proxy off)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock('@vibetech/core');
  });

  it('resolves a provider key from SecureApiKeyManager, never import.meta.env', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_AI_PROXY', 'false');

    const getApiKey = vi.fn(async (k: string) => (k === 'moonshot' ? 'sk-moon' : null));
    vi.doMock('@vibetech/core', () => ({
      SecureApiKeyManager: { getInstance: () => ({ getApiKey }) },
    }));

    const mod = await import('../../services/ai/UnifiedAIService');
    (mod.UnifiedAIService as unknown as { instance?: unknown }).instance = undefined;
    const service = mod.UnifiedAIService.getInstance();

    const configured = await service.isAnyProviderConfigured();

    expect(configured).toBe(true);
    expect(getApiKey).toHaveBeenCalledWith('moonshot');
  });
});

describe('UnifiedAIService generation sessions', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  beforeEach(() => {
    (UnifiedAIService as unknown as { instance?: UnifiedAIService }).instance = undefined;
  });

  it('creates a session with a crypto-generated UUID id when none is provided', () => {
    const service = UnifiedAIService.getInstance();

    const session = service.createGenerationSession();

    expect(session.id).toMatch(UUID_RE);
    expect(session.signal.aborted).toBe(false);

    const second = service.createGenerationSession();
    expect(second.id).toMatch(UUID_RE);
    expect(second.id).not.toBe(session.id);
  });

  it('aborts the previous controller when a session id is reused', () => {
    const service = UnifiedAIService.getInstance();

    const first = service.createGenerationSession('shared-id');
    const replacement = service.createGenerationSession('shared-id');

    expect(first.signal.aborted).toBe(true);
    expect(replacement.signal.aborted).toBe(false);
  });

  it('cancels and completes sessions through their lifecycle helpers', () => {
    const service = UnifiedAIService.getInstance();

    const session = service.createGenerationSession();
    expect(service.cancelGenerationSession(session.id)).toBe(true);
    expect(session.signal.aborted).toBe(true);
    expect(service.cancelGenerationSession(session.id)).toBe(false);

    const done = service.createGenerationSession();
    service.completeGenerationSession(done.id);
    expect(service.cancelGenerationSession(done.id)).toBe(false);
  });
});
