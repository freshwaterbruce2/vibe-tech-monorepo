export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ModelProfile = 'auto' | 'fast' | 'reasoning' | 'creative' | string;

export interface CompletionOptions {
  model?: ModelProfile;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface UsageStats {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface VibeGatewayMetadata {
  fallback_used: boolean;
  primary_model: string;
  resolved_model: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: UsageStats;
  vibe_gateway?: VibeGatewayMetadata;
}

export interface VibeAIClientConfig {
  apiKey: string;
  baseURL?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class VibeAIClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: VibeAIClientConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('VibeAIClient requires a valid apiKey (e.g. vibe_sk_...).');
    }
    this.apiKey = config.apiKey.trim();
    this.baseURL = (config.baseURL || 'https://vibe-ai-gateway-734857480460.us-east4.run.app').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 25000;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
  }

  /**
   * Primary method for sending chat completions through the universal Vibe gateway.
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<ChatCompletionResponse> {
    const url = `${this.baseURL}/v1/chat/completions`;

    const payload = {
      model: options.model ?? 'auto',
      messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    };

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      const message = errBody?.error?.message || `Gateway request failed with status ${response.status}`;
      throw new Error(`[VibeAIClient] ${message}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    return data;
  }

  /**
   * Helper method that directly returns the text content of the completion.
   */
  async generateText(
    promptOrMessages: string | ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<string> {
    const messages: ChatMessage[] = typeof promptOrMessages === 'string'
      ? [{ role: 'user', content: promptOrMessages }]
      : promptOrMessages;

    const res = await this.createChatCompletion(messages, options);
    const text = res.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      throw new Error('[VibeAIClient] Empty response content from gateway.');
    }
    return text;
  }

  /**
   * Health check to test connectivity to the gateway.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await this.fetchImpl(`${this.baseURL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
