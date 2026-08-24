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
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface AICompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
  reasoningEffort?: 'low' | 'medium' | 'high';
  responseFormat?: {
    type: 'json_schema';
    jsonSchema: { name: string; strict: true; schema: Record<string, unknown> };
  };
  providerPreferences?: { requireParameters: boolean };
  tools?: Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }>;
  toolChoice?: 'auto' | 'required' | 'none';
}

export interface AICompletionResponse {
  content: string;
  reasoning_content?: string; // For reasoning models (DeepSeek R1, o1, etc.)
  provider?: string;
  requestId?: string;
  model?: string;
  finishReason?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
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
