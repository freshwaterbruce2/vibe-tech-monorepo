/**
 * OpenRouter AI Client for Business Booking Platform
 *
 * Unified AI gateway replacing direct OpenAI integration
 * Supports multiple models via OpenRouter API
 *
 * Primary Model: DeepSeek Chat (ultra-cheap ~$0.0003/1M tokens)
 * Fallback: Google Gemini 2.0 Flash (FREE)
 * Premium: OpenAI GPT-4 Turbo (for complex reasoning when needed)
 *
 * Migration from OpenAI: 2026-01-24
 */

import { logger } from '../utils/logger';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private fallbackModel: string;
  private premiumModel: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.baseUrl =
      process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';

    // Model selection (2026 best models for hotel booking platform)
    this.defaultModel =
      process.env.OPENROUTER_DEFAULT_MODEL || 'deepseek/deepseek-chat';
    this.fallbackModel =
      process.env.OPENROUTER_FALLBACK_MODEL ||
      'google/gemini-2.0-flash-exp:free';
    this.premiumModel =
      process.env.OPENROUTER_PREMIUM_MODEL || 'openai/gpt-4-turbo';
  }

  /**
   * Create a chat completion via OpenRouter API
   */
  async createChatCompletion(
    messages: OpenRouterMessage[],
    options: OpenRouterChatOptions = {},
  ): Promise<OpenRouterResponse> {
    if (!this.apiKey) {
      throw new Error(
        'OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.',
      );
    }

    const {
      model = this.defaultModel,
      temperature = 0.7,
      max_tokens = 1000,
      response_format,
    } = options;

    const requestBody: any = {
      model,
      messages,
      temperature,
      max_tokens,
    };

    if (response_format) {
      requestBody.response_format = response_format;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.API_BASE_URL || 'http://localhost:3001',
          'X-Title': 'Vibe Business Booking Platform',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenRouter API request failed', {
          status: response.status,
          error: errorText,
          model,
        });

        // Try fallback model on rate limit or model unavailable
        if (
          response.status === 429 ||
          response.status === 503 ||
          errorText.includes('model is overloaded')
        ) {
          if (model !== this.fallbackModel) {
            logger.info('Retrying with fallback model', {
              original: model,
              fallback: this.fallbackModel,
            });
            return this.createChatCompletion(messages, {
              ...options,
              model: this.fallbackModel,
            });
          }
        }

        throw new Error(
          `OpenRouter API error ${response.status}: ${errorText}`,
        );
      }

      const data: OpenRouterResponse = await response.json();

      logger.debug('OpenRouter API success', {
        model: data.model,
        usage: data.usage,
      });

      return data;
    } catch (error) {
      logger.error('OpenRouter request failed', {
        error,
        model,
        messagesCount: messages.length,
      });
      throw error;
    }
  }

  /**
   * Helper: Extract message content from OpenRouter response
   */
  extractContent(response: OpenRouterResponse): string {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices in OpenRouter response');
    }

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choices in OpenRouter response');
    }

    const {content} = choice.message;
    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    return content;
  }

  /**
   * Helper: Create simple prompt completion
   */
  async complete(
    systemPrompt: string,
    userPrompt: string,
    options: OpenRouterChatOptions = {},
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.createChatCompletion(messages, options);
    return this.extractContent(response);
  }

  /**
   * Helper: JSON-formatted completion with validation
   */
  async completeJSON<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options: Omit<OpenRouterChatOptions, 'response_format'> = {},
  ): Promise<T> {
    const response = await this.complete(systemPrompt, userPrompt, {
      ...options,
      response_format: { type: 'json_object' },
    });

    try {
      return JSON.parse(response) as T;
    } catch (error) {
      logger.error('Failed to parse OpenRouter JSON response', {
        error,
        response,
      });
      throw new Error('Invalid JSON response from AI');
    }
  }

  /**
   * Get current model being used
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Use premium model for complex queries
   */
  usePremiumModel(): string {
    return this.premiumModel;
  }
}

// Export singleton instance
export const openRouterClient = new OpenRouterClient();
