/**
 * DeepSeek Direct Service for Vibe Code Studio
 *
 * Direct integration with DeepSeek API - no proxy needed.
 * Models: deepseek-chat, deepseek-coder, deepseek-reasoner
 *
 * API Docs: https://platform.deepseek.com/api-docs
 */

import { logger } from '../../Logger';
import type {
  AIChatOptions,
  AICompletionRequest,
  AICompletionResponse,
  ChatMessage,
  IAIService
} from '../../../types/ai';

// DeepSeek API types
interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekChatRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface DeepSeekChoice {
  index: number;
  message: {
    role: string;
    content: string;
    reasoning_content?: string;
  };
  finish_reason: string;
}

interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface DeepSeekChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage: DeepSeekUsage;
}

// Configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_MAX_TOKENS = 8192;

export class DeepSeekService implements IAIService {
  id = 'deepseek';
  private apiKey: string;

  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey 
      ?? import.meta.env?.['VITE_DEEPSEEK_API_KEY']
      ?? '';

    if (!this.apiKey) {
      logger.warn('[DeepSeek] No API key provided. Set VITE_DEEPSEEK_API_KEY in .env');
    }
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      logger.warn('[DeepSeek] Cannot initialize - no API key');
      return;
    }

    try {
      const response = await fetch(`${DEEPSEEK_API_URL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      if (response.ok) {
        logger.info('[DeepSeek] Connected to DeepSeek API');
      } else {
        logger.warn('[DeepSeek] API health check failed');
      }
    } catch (error) {
      logger.warn('[DeepSeek] Could not connect to API', error);
    }
  }

  private resolveModel(model?: string): string {
    // Map common aliases to DeepSeek models
    const map: Record<string, string> = {
      'deepseek': 'deepseek-chat',
      'deepseek-chat': 'deepseek-chat',
      'deepseek-coder': 'deepseek-coder',
      'deepseek-reasoner': 'deepseek-reasoner',
      'deepseek-r1': 'deepseek-reasoner',
      'deepseek-v3': 'deepseek-chat',
      'deepseek-v3.2': 'deepseek-chat',
    };

    if (!model) return DEFAULT_MODEL;
    return map[model.toLowerCase()] ?? model;
  }

  private isReasoningModel(model: string): boolean {
    return model.includes('reasoner') || model.includes('r1');
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured. Set VITE_DEEPSEEK_API_KEY in .env');
    }

    const model = this.resolveModel(request.model);

    const messages: DeepSeekMessage[] = request.messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));

    const body: DeepSeekChatRequest = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: false
    };

    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data: DeepSeekChatResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: choice?.message?.content ?? '',
      reasoning_content: choice?.message?.reasoning_content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0
      },
      provider: 'deepseek'
    };
  }

  async *stream(messages: ChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const model = this.resolveModel(options?.model);

    const deepseekMessages: DeepSeekMessage[] = messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));

    const body: DeepSeekChatRequest = {
      model,
      messages: deepseekMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true
    };

    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`DeepSeek Stream Error (${response.status}): ${text}`);
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
              
              // Also yield reasoning content if present
              const reasoning = data.choices?.[0]?.delta?.reasoning_content;
              if (reasoning) yield `<think>${reasoning}</think>`;
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

  /**
   * Generate code with DeepSeek Coder
   */
  async generateCode(description: string, language: string = 'typescript', context?: string): Promise<string> {
    let prompt = `Generate ${language} code for the following task:\n\n${description}`;
    
    if (context) {
      prompt += `\n\nContext:\n${context}`;
    }
    
    prompt += '\n\nProvide only the code without explanations.';

    const response = await this.complete({
      messages: [
        { role: 'system', content: 'You are a senior software engineer. Generate clean, well-documented, production-ready code.' },
        { role: 'user', content: prompt }
      ],
      model: 'deepseek-coder',
      maxTokens: 8192
    });

    return response.content;
  }

  /**
   * Use DeepSeek Reasoner for complex analysis
   */
  async reason(prompt: string): Promise<{ content: string; reasoning?: string }> {
    const response = await this.complete({
      messages: [{ role: 'user', content: prompt }],
      model: 'deepseek-reasoner',
      maxTokens: 16384
    });

    return {
      content: response.content,
      reasoning: response.reasoning_content
    };
  }
}
