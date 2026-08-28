import type { ToolDefinition } from './schema-dedup.js';

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: KimiToolCall[];
  tool_call_id?: string;
}

export interface KimiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface KimiCompletionRequest {
  model: string;
  messages: KimiMessage[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
}

export interface KimiCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: KimiMessage;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
}

export interface KimiClientOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/**
 * Minimal typed client for the Moonshot Kimi Code API.
 */
export class KimiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: KimiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://api.moonshot.cn/v1';
    this.model = options.model ?? 'kimi-k2-7-code';
  }

  async complete(request: Omit<KimiCompletionRequest, 'model'>): Promise<KimiCompletionResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const body: KimiCompletionRequest = {
      ...request,
      model: this.model,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kimi API error ${response.status}: ${text}`);
    }

    return (await response.json()) as KimiCompletionResponse;
  }
}
