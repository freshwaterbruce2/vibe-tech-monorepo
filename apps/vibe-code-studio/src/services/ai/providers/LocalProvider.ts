import type {
  AIProviderConfig,
  CompletionOptions,
  CompletionResponse,
  IAIProvider,
  StreamCompletionResponse,
  AIModel
} from '../AIProviderInterface';
import {
  AIProvider,
  ChatMessage as _ChatMessage
} from '../AIProviderInterface';
import { logger } from '../../Logger';

/**
 * Local Provider - Connects to the local fine-tuned model server
 * Default: Falls back to OpenRouter proxy at localhost:3001 if no local server configured
 */
export class LocalProvider implements IAIProvider {
  private _config: AIProviderConfig | null = null;
  // Use OpenRouter proxy as fallback instead of non-existent local server
  private baseUrl: string = import.meta.env?.['VITE_OPENROUTER_PROXY_URL'] ?? 'http://localhost:3001';

  async initialize(config: AIProviderConfig): Promise<void> {
    this._config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    logger.info('[LocalProvider] Initialized at', this.baseUrl);
  }

  async complete(model: string, options: CompletionOptions): Promise<CompletionResponse> {
    try {
      // Use chat completions format (compatible with OpenRouter proxy fallback)
      const response = await fetch(`${this.baseUrl}/api/openrouter/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'deepseek/deepseek-v3.2',
          messages: options.messages,
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Local server returned ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? '';

      return {
        id: data.id,
        choices: [
          {
            message: {
              role: 'assistant',
              content: content
            },
            finishReason: data.choices?.[0]?.finish_reason ?? 'stop',
            index: 0
          }
        ],
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0
        },
        model: data.model ?? model,
        created: data.created ?? Date.now(),
        content: content
      };
    } catch (error) {
      logger.error('[LocalProvider] Completion failed', error);
      throw error;
    }
  }

  async *streamComplete(
    model: string,
    options: CompletionOptions
  ): AsyncGenerator<StreamCompletionResponse> {
    // Basic implementation for now - falls back to non-streaming if server doesn't support
    const result = await this.complete(model, options);
    yield {
      id: result.id,
      choices: [
        {
          delta: { content: result.choices[0]?.message.content ?? '' },
          index: 0
        }
      ],
      model: result.model,
      created: result.created,
      content: result.content
    };
  }

  async getAvailableModels(): Promise<AIModel[]> {
    return [
      {
        id: 'local/vibe-completion',
        name: 'Vibe Custom (Local)',
        provider: AIProvider.LOCAL,
        contextWindow: 4096,
        maxOutput: 2048,
        costPerMillionInput: 0,
        costPerMillionOutput: 0,
        capabilities: [] // Populated by registry
      }
    ];
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Use health endpoint for OpenRouter proxy, or chat endpoint for local server
      const healthUrl = this.baseUrl.includes('localhost:3001') 
        ? `${this.baseUrl.replace('/v1', '')}/health`
        : `${this.baseUrl}/health`;
      const response = await fetch(healthUrl, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getUsageStats() {
    return { tokensUsed: 0, estimatedCost: 0, requestCount: 0 };
  }

  cancelStream(): void {
    // No-op for local provider - streaming is simple and fast
  }
}
