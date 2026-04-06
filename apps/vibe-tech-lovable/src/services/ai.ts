import { DEEPSEEK_CONFIG } from '../config/ai';

export interface AIResponse {
  content: string;
  error?: string;
}

export class AIService {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1'; // Standard DeepSeek API Endpoint

  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
  }

  async generateCode(prompt: string, context?: string): Promise<AIResponse> {
    if (!this.apiKey) {
      return { 
        content: '', 
        error: 'API Key not found. Please set VITE_DEEPSEEK_API_KEY in your .env file.' 
      };
    }

    try {
      const messages = [
        { role: 'system', content: DEEPSEEK_CONFIG.systemPrompt },
        ...(context ? [{ role: 'user', content: `Context:\n${context}` }] : []),
        { role: 'user', content: prompt }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_CONFIG.model,
          messages: messages,
          ...DEEPSEEK_CONFIG.parameters
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message ?? `API Request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content ?? '// No code generated'
      };

    } catch (error: unknown) {
      console.error('AI Generation Error:', error);
      return {
        content: '',
        error: (error as Error).message ?? 'Failed to generate code'
      };
    }
  }
}

export const aiService = new AIService();
