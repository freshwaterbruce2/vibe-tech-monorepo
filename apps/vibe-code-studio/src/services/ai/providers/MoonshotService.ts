/**
 * Moonshot Kimi K2.5 Service for Vibe Code Studio
 *
 * Direct integration with Moonshot's Kimi API - no proxy needed.
 * Model: kimi-k2.5 (262K context window)
 *
 * API Docs: https://platform.moonshot.ai/docs/overview
 */

import { logger } from '../../Logger';
import type {
  AIChatOptions,
  AICompletionRequest,
  AICompletionResponse,
  ChatMessage,
  IAIService
} from '../../../types/ai';

// Moonshot API types
interface MoonshotMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MoonshotThinkingConfig {
  type: 'enabled' | 'disabled';
}

interface MoonshotChatRequest {
  model: string;
  messages: MoonshotMessage[];
  temperature?: number;
  max_tokens?: number;
  thinking?: MoonshotThinkingConfig;
  stream?: boolean;
}

interface MoonshotChoice {
  index: number;
  message: {
    role: string;
    content: string;
    reasoning?: string;
  };
  finish_reason: string;
}

interface MoonshotUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens?: number;
}

interface MoonshotChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: MoonshotChoice[];
  usage: MoonshotUsage;
}

// Configuration
const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1';
const DEFAULT_MODEL = 'kimi-k2.5';
const DEFAULT_MAX_TOKENS = 8192;

// Temperature MUST be fixed per Moonshot docs
const THINKING_TEMPERATURE = 1.0;
const NON_THINKING_TEMPERATURE = 0.6;

export class MoonshotService implements IAIService {
  id = 'moonshot';
  private apiKey: string;

  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey
      ?? import.meta.env?.['KIMI_API_KEY']
      ?? import.meta.env?.['VITE_KIMI_API_KEY']
      ?? import.meta.env?.['VITE_MOONSHOT_API_KEY']
      ?? '';

    if (!this.apiKey) {
      logger.warn('[Moonshot] No API key provided. Set KIMI_API_KEY environment variable or VITE_KIMI_API_KEY in .env');
    }
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      logger.warn('[Moonshot] Cannot initialize - no API key');
      return;
    }

    try {
      const response = await fetch(`${MOONSHOT_API_URL}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      if (response.ok) {
        logger.info('[Moonshot] Connected to Kimi K2.5 API');
      } else {
        logger.warn('[Moonshot] API health check failed');
      }
    } catch (error) {
      logger.warn('[Moonshot] Could not connect to API', error);
    }
  }

  private resolveModel(model?: string): string {
    // Map common aliases to Moonshot models
    const map: Record<string, string> = {
      'kimi': 'kimi-k2.5',
      'kimi-k2.5': 'kimi-k2.5',
      'kimi-k2': 'kimi-k2.5',
      'kimi-2.5-pro': 'kimi-k2.5',
      'moonshot/kimi-2.5-pro': 'kimi-k2.5',
      'kimi-latest': 'kimi-latest',
      'kimi-thinking': 'kimi-k2-thinking',
      'moonshot': 'kimi-k2.5',
      'moonshot-v1-32k': 'moonshot-v1-32k',
      'moonshot-v1-128k': 'moonshot-v1-128k',
    };

    if (!model) return DEFAULT_MODEL;
    return map[model.toLowerCase()] ?? model;
  }

  private shouldUseThinking(model: string): boolean {
    return model.includes('thinking') || model.includes('r1');
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Moonshot API key not configured. Set VITE_KIMI_API_KEY in .env');
    }

    const model = this.resolveModel(request.model);
    const useThinking = this.shouldUseThinking(model);
    const temperature = useThinking ? THINKING_TEMPERATURE : NON_THINKING_TEMPERATURE;

    const messages: MoonshotMessage[] = request.messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));

    const body: MoonshotChatRequest = {
      model,
      messages,
      temperature,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      thinking: { type: useThinking ? 'enabled' : 'disabled' },
      stream: false
    };

    const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Moonshot API error (${response.status}): ${errorText}`);
    }

    const data: MoonshotChatResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: choice?.message?.content ?? '',
      reasoning_content: choice?.message?.reasoning,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0
      },
      provider: 'moonshot'
    };
  }

  async *stream(messages: ChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('Moonshot API key not configured');
    }

    const model = this.resolveModel(options?.model);
    const useThinking = this.shouldUseThinking(model);
    const temperature = useThinking ? THINKING_TEMPERATURE : NON_THINKING_TEMPERATURE;

    const moonshotMessages: MoonshotMessage[] = messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    }));

    const body: MoonshotChatRequest = {
      model,
      messages: moonshotMessages,
      temperature,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      thinking: { type: useThinking ? 'enabled' : 'disabled' },
      stream: true
    };

    const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`Moonshot Stream Error (${response.status}): ${text}`);
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

  /**
   * Analyze an image with Kimi K2.5 vision
   */
  async analyzeImage(imageBase64OrUrl: string, prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Moonshot API key not configured');
    }

    // Convert to proper URL format if base64
    const imageUrl = imageBase64OrUrl.startsWith('data:')
      ? imageBase64OrUrl
      : imageBase64OrUrl.startsWith('http')
        ? imageBase64OrUrl
        : `data:image/png;base64,${imageBase64OrUrl}`;

    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt }
        ]
      }
    ];

    const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        max_tokens: DEFAULT_MAX_TOKENS,
        thinking: { type: 'disabled' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Moonshot Vision error (${response.status}): ${errorText}`);
    }

    const data: MoonshotChatResponse = await response.json();
    return data.choices[0]?.message?.content ?? '';
  }

  /**
   * Generate code with thinking mode enabled
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
      model: 'kimi-k2.5',
      maxTokens: 8192
    });

    return response.content;
  }

  /**
   * Review code with detailed analysis
   */
  async reviewCode(code: string, language: string = 'typescript'): Promise<string> {
    const prompt = `Review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide feedback on:\n- Code quality\n- Best practices\n- Potential bugs\n- Performance considerations\n- Security issues`;

    const response = await this.complete({
      messages: [
        { role: 'system', content: 'You are a senior code reviewer. Provide constructive, detailed feedback.' },
        { role: 'user', content: prompt }
      ],
      model: 'kimi-k2.5',
      maxTokens: 4096
    });

    return response.content;
  }
}
