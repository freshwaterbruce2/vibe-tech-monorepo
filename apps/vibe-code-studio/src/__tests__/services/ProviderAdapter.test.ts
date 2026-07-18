import { describe, expect, it, vi } from 'vitest';

import { AIProvider } from '../../services/ai/AIProviderInterface';
import { ServiceAdapter } from '../../services/ai/ProviderAdapter';
import type { IAIService } from '../../types/ai';

describe('ServiceAdapter provider metadata', () => {
  it('preserves the provider-reported resolved model and request metadata', async () => {
    const service: IAIService = {
      id: 'openrouter',
      initialize: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockResolvedValue({
        content: '{}',
        provider: 'openrouter',
        requestId: 'request-1',
        model: 'deepseek/deepseek-v4-pro:resolved',
        finishReason: 'stop',
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      }),
    };
    const adapter = new ServiceAdapter(service, AIProvider.OPENROUTER);

    const response = await adapter.complete('deepseek/deepseek-v4-pro', {
      messages: [{ role: 'user', content: 'plan' }],
    });

    expect(response).toMatchObject({
      id: 'request-1',
      model: 'deepseek/deepseek-v4-pro:resolved',
      choices: [{ finishReason: 'stop' }],
      usage: { totalTokens: 3 },
    });
  });
});
