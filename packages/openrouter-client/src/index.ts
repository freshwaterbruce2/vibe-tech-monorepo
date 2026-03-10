import axios, { AxiosInstance } from 'axios';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
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

export class OpenRouterClient {
  private client: AxiosInstance;
  private options: OpenRouterClientOptions;

  constructor(baseURL: string = 'http://localhost:3001', options: OpenRouterClientOptions = {}) {
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
        response => response,
        async error => {
          const config = error.config;
          config._retryCount = config._retryCount ?? 0;

          if (config._retryCount >= (this.options.retries ?? 0)) {
            return Promise.reject(error);
          }

          config._retryCount += 1;
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay ?? 1000));
          return this.client.request(config);
        }
      );
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await this.client.post<ChatCompletionResponse>(
      '/api/openrouter/chat',
      request
    );
    return response.data;
  }

  async getModels(): Promise<ModelInfo[]> {
    const response = await this.client.get<{ data: ModelInfo[] }>(
      '/api/openrouter/models'
    );
    return response.data.data;
  }

  async getUsage(period: string = '24h'): Promise<any> {
    const response = await this.client.get(
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
