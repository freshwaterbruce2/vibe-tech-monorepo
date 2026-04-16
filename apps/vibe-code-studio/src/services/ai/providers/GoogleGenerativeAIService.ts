import type {
    AIChatOptions,
    AICompletionRequest,
    AICompletionResponse,
    ChatMessage,
    IAIService
} from '../../../types/ai';
import { logger } from '../../Logger';

/**
 * Google Generative AI Provider
 * Custom implementation for Gemini 3.0 API (Late 2025)
 */
export class GoogleGenerativeAIService implements IAIService {
  id = 'google';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey ?? import.meta.env?.['VITE_GOOGLE_API_KEY'] ?? '';
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      logger.warn('[GoogleAI] API Key missing. Google provider will be unavailable.');
    }
  }

  /**
   * Maps standard ChatMessage to Gemini Content format
   */
  private mapMessages(messages: ChatMessage[]) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const rawModelId = request.model ?? 'gemini-3.1-pro';
    const modelId = rawModelId.replace(/^google\//, '');
    const url = `${this.baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`;

    // Extract system instruction if present
    const systemMessage = request.messages.find(m => m.role === 'system');
    const chatMessages = request.messages.filter(m => m.role !== 'system');

    interface GeminiRequestBody {
      contents: { role: string; parts: { text: string }[] }[];
      generationConfig: { temperature: number; maxOutputTokens: number };
      system_instruction?: { parts: { text: string }[] };
    }
    const body: GeminiRequestBody = {
      contents: this.mapMessages(chatMessages),
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 8192,
      }
    };

    if (systemMessage) {
      body.system_instruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google AI Error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text ?? '';

    return {
      content,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0
      },
      provider: 'google'
    };
  }

  async *stream(messages: ChatMessage[], options?: AIChatOptions): AsyncGenerator<string, void, unknown> {
    const rawModelId = options?.model ?? 'gemini-3.1-pro';
    const modelId = rawModelId.replace(/^google\//, '');
    const url = `${this.baseUrl}/models/${modelId}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    interface GeminiStreamBody {
      contents: { role: string; parts: { text: string }[] }[];
      generationConfig: { temperature: number; maxOutputTokens: number };
      system_instruction?: { parts: { text: string }[] };
    }
    const body: GeminiStreamBody = {
      contents: this.mapMessages(chatMessages),
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 8192,
      }
    };

    if (systemMessage) {
      body.system_instruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok || !response.body) {
      throw new Error(`Google AI Stream Error: ${response.statusText}`);
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
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
            } catch (_e) {
              // Partial JSON or heartbeat
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

  async generateText(prompt: string, options?: { maxTokens?: number; temperature?: number; model?: string; signal?: AbortSignal }): Promise<string> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }
}
