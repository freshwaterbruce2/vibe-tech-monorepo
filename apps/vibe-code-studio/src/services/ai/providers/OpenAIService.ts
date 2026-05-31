/**
 * OpenAI Direct Service for Vibe Code Studio
 *
 * Direct integration with OpenAI API - supports standard API keys and ChatGPT OAuth access tokens.
 * Models: gpt-4o, gpt-4o-mini, o1-mini, o1-preview, etc.
 */

import { logger } from '../../Logger';
import type {
  AIChatOptions,
  AICompletionRequest,
  AICompletionResponse,
  ChatMessage,
  IAIService
} from '../../../types/ai';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

const OPENAI_API_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 4096;

export class OpenAIService implements IAIService {
  id = 'openai';
  private apiKey: string;

  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey 
      ?? import.meta.env?.['VITE_OPENAI_API_KEY']
      ?? '';

    if (!this.apiKey) {
      logger.warn('[OpenAI] No API key/token provided. Set VITE_OPENAI_API_KEY or configure ChatGPT OAuth.');
    }
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      logger.warn('[OpenAI] Cannot initialize - no token/key');
      return;
    }

    try {
      const response = await fetch(`${OPENAI_API_URL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      if (response.ok) {
        logger.info('[OpenAI] Connected to OpenAI API');
      } else {
        logger.warn('[OpenAI] API health check failed');
      }
    } catch (error) {
      logger.warn('[OpenAI] Could not connect to API', error);
    }
  }

  private resolveModel(model?: string): string {
    const map: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-5.2-codex': 'gpt-4o',
      'gpt-5.3-codex': 'gpt-4o',
      'openai/gpt-5.2-codex': 'gpt-4o',
      'openai/gpt-5.3-codex': 'gpt-4o',
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'o1-mini': 'o1-mini',
      'o1-preview': 'o1-preview',
    };

    if (!model) return DEFAULT_MODEL;
    return map[model.toLowerCase()] ?? model;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI authentication token/key not configured');
    }

    const model = this.resolveModel(request.model);

    const messages: OpenAIMessage[] = request.messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));

    const body: OpenAIChatRequest = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: false
    };

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: request.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data: OpenAIChatResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: choice?.message?.content ?? '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0
      },
      provider: 'openai'
    };
  }

  async *stream(messages: ChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('OpenAI authentication token/key not configured');
    }

    const model = this.resolveModel(options?.model);

    const openaiMessages: OpenAIMessage[] = messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));

    const body: OpenAIChatRequest = {
      model,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true
    };

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: options?.signal
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`OpenAI Stream Error (${response.status}): ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async chat(messages: ChatMessage[], options?: AIChatOptions): Promise<string> {
    const response = await this.complete({
      messages,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    });
    return response.content;
  }

  async generateText(prompt: string, options?: { maxTokens?: number; temperature?: number; model?: string }): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }
}
