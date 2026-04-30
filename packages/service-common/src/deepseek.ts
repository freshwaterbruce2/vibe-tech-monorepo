// DeepSeek API Client
// Uses OpenAI-compatible SDK with DeepSeek base URL

import OpenAI from 'openai';

export interface DeepSeekConfig {
  apiKey: string;
  model?: 'deepseek-reasoner' | 'deepseek-coder';
  maxTokens?: number;
  temperature?: number;
  useReasoning?: boolean; // Auto-select deepseek-reasoner for complex queries
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface DeepSeekReasoningDelta {
  reasoning_content?: string;
  content?: string;
}

export class DeepSeekClient {
  private client: OpenAI;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: DeepSeekConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });
    
    this.defaultModel = config.model ?? 'deepseek-reasoner';
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  /**
   * Create a chat completion
   * Automatically uses deepseek-reasoner for complex reasoning tasks
   */
  async chat(options: CompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages: options.messages,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      temperature: options.temperature ?? this.defaultTemperature,
      stream: false,
    });

    return response.choices[0]?.message?.content ?? '';
  }

  /**
   * Create a chat completion with R1 reasoning model
   * Returns both reasoning process and final answer
   */
  async chatWithReasoning(options: CompletionOptions): Promise<{reasoning: string, answer: string}> {
    const stream = await this.client.chat.completions.create({
      model: 'deepseek-reasoner',
      messages: options.messages,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      stream: true,
    });

    let reasoning = '';
    let answer = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as DeepSeekReasoningDelta | undefined;
      if (delta?.reasoning_content) {
        reasoning += delta.reasoning_content;
      }

      if (delta?.content) {
        answer += delta.content;
      }
    }

    return { reasoning, answer };
  }

  /**
   * Stream a chat completion
   */
  async *chatStream(options: CompletionOptions): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages: options.messages,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      temperature: options.temperature ?? this.defaultTemperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Generate embeddings (if supported)
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'deepseek-reasoner', // Upgraded to R1 reasoning model - Use appropriate embedding model
      input: text,
    });

    return response.data[0]?.embedding ?? [];
  }

  /**
   * Simple completion helper
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });
    
    return this.chat({ messages });
  }

  /**
   * Code completion using deepseek-coder
   */
  async codeComplete(prompt: string, language?: string): Promise<string> {
    const systemPrompt = language 
      ? `You are a ${language} expert. Provide clean, efficient code.`
      : 'You are an expert programmer. Provide clean, efficient code.';

    return this.chat({
      model: 'deepseek-coder',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Lower temperature for code
    });
  }
}

// Factory function for easy instantiation
export function createDeepSeekClient(apiKey?: string): DeepSeekClient {
  const key = apiKey?.trim() ? apiKey : process.env.DEEPSEEK_API_KEY;
  
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY is required');
  }

  return new DeepSeekClient({ apiKey: key });
}

export default DeepSeekClient;

