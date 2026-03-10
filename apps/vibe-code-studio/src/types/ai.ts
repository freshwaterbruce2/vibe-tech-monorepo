export type AIRole = 'system' | 'user' | 'assistant' | 'function';

export interface ChatMessage {
  role: AIRole;
  content: string;
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  signal?: AbortSignal;
}

export interface AICompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  reasoning_content?: string; // For reasoning models (DeepSeek R1, o1, etc.)
  provider?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIService {
  id: string; // 'deepseek' | 'huggingface' | 'openai'
  initialize(): Promise<void>;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  stream?(messages: ChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown>;
}
