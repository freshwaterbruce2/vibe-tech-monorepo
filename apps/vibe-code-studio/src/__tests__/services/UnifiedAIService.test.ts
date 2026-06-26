import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      }),
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
      }),
    );
  });
});
