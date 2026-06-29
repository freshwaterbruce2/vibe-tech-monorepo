import axios, { AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { OpenRouterError } from './errors.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** OpenAI-compatible tool (function) definition. */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

/** How the model should select a tool. */
export type ToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } };

/** A tool invocation returned by the model. */
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatCompletionRequest {
  /** Single model id. Optional when `models` (a fallback stack) is supplied. */
  model?: string;
  /** Ordered fallback stack; the proxy/OpenRouter tries each in turn. */
  models?: string[];
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  /** OpenAI-compatible tool definitions for tool/function calling. */
  tools?: Tool[];
  /** Force a specific tool or let the model choose. */
  tool_choice?: ToolChoice;
  /** Request a streamed (SSE) response. Set automatically by `chatStream`. */
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage & { tool_calls?: ToolCall[] };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** One Server-Sent-Event chunk from `chatStream`. */
export interface ChatCompletionStreamChunk {
  id?: string;
  model?: string;
  choices: Array<{
    index: number;
    delta?: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface OpenRouterClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  by_model: Record<string, number>;
  period?: string;
  timestamp?: string;
}

type RetryableConfig = InternalAxiosRequestConfig & {
  _retryCount?: number;
};

/**
 * Parse a batch of SSE text lines into stream chunks, reporting whether the
 * terminal `[DONE]` marker was seen. Keep-alive comments and malformed partial
 * lines are skipped.
 */
function parseSseLines(lines: string[]): {
  chunks: ChatCompletionStreamChunk[];
  done: boolean;
} {
  const chunks: ChatCompletionStreamChunk[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') {
      return { chunks, done: true };
    }
    try {
      const chunk = JSON.parse(data) as ChatCompletionStreamChunk;
      if (chunk.choices) {
        chunks.push(chunk);
      }
    } catch {
      // Ignore keep-alive comments and malformed partial lines.
    }
  }
  return { chunks, done: false };
}

export class OpenRouterClient {
  private client: AxiosInstance;
  private options: OpenRouterClientOptions;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001', options: OpenRouterClientOptions = {}) {
    this.baseURL = baseURL;
    this.options = {
      timeout: options.timeout ?? 30000,
      retries: options.retries ?? 0,
      retryDelay: options.retryDelay ?? 1000
    };

    this.client = axios.create({
      baseURL,
      timeout: this.options.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add retry logic if configured
    if (this.options.retries && this.options.retries > 0) {
      this.client.interceptors.response.use(
        (response) => response,
        async (error) => {
          const config = error.config as RetryableConfig | undefined;
          if (!config) {
            return Promise.reject(error);
          }

          config._retryCount = config._retryCount ?? 0;

          if (config._retryCount >= (this.options.retries ?? 0)) {
            return Promise.reject(error);
          }

          config._retryCount += 1;
          await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay ?? 1000));
          return this.client.request(config);
        }
      );
    }
  }

  /**
   * Ensure a `model` field is present for the proxy even when only a `models`
   * fallback stack was supplied. Returns the request unchanged when `model` is
   * already set so callers see no surprise mutations.
   */
  private normalizeRequest(request: ChatCompletionRequest): ChatCompletionRequest {
    if (request.model) {
      return request;
    }
    return { ...request, model: request.models?.[0] };
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await this.client.post<ChatCompletionResponse>(
      '/api/openrouter/chat',
      this.normalizeRequest(request)
    );
    return response.data;
  }

  /**
   * Stream a chat completion as Server-Sent Events. Yields one
   * {@link ChatCompletionStreamChunk} per `data:` line until `[DONE]`.
   *
   * Uses `fetch` (not axios) so the response body is a web ReadableStream that
   * can be consumed incrementally in Node 18+ and browsers alike.
   */
  async *chatStream(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ChatCompletionStreamChunk, void, unknown> {
    const body = JSON.stringify({ ...this.normalizeRequest(request), stream: true });
    const response = await fetch(`${this.baseURL}/api/openrouter/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '');
      throw new OpenRouterError(
        `chatStream request failed (${response.status})${detail ? `: ${detail}` : ''}`,
        response.status
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        const { chunks, done: sawDone } = parseSseLines(lines);
        for (const chunk of chunks) {
          yield chunk;
        }
        if (sawDone) {
          return;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    const response = await this.client.get<{ data: ModelInfo[] }>(
      '/api/openrouter/models'
    );
    return response.data.data;
  }

  async getUsage(period: string = '24h'): Promise<UsageStats> {
    const response = await this.client.get<UsageStats>(
      `/api/openrouter/usage?period=${period}`
    );
    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }
}

// Type aliases for better compatibility
export type Message = ChatMessage;
export type ChatResponse = ChatCompletionResponse;

// Export convenience function
export function createOpenRouterClient(baseURL?: string): OpenRouterClient {
  return new OpenRouterClient(baseURL);
}

// Export default instance
export const openRouter = new OpenRouterClient();

// Re-export the standalone helpers so consumers have a single import surface.
export { OpenRouterError };
export {
  MODEL_PRICING,
  DEFAULT_FALLBACK_STACK,
  calcCost,
  type ModelPricing
} from './pricing.js';
export { MODEL_ALIASES, resolveModelId } from './model-aliases.js';
