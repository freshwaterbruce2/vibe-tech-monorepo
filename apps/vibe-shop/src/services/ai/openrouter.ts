/**
 * OpenRouter AI Client for Vibe-Shop
 *
 * Uses OpenRouter API to access multiple AI models via unified interface
 * Default: DeepSeek Chat (ultra-cheap, fast)
 * Fallback: Google Gemini 2.0 Flash (if DeepSeek unavailable)
 *
 * Cost: ~$0.0003 per 1M tokens (DeepSeek)
 * Updated: 2026-01-24
 */

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;
  private chatModel: string;
  private fallbackModel: string;

  constructor() {
    // OpenRouter API Configuration
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';

    // Model selection (best models for e-commerce as of Jan 2026)
    // Ultra-cheap chat model for product classification/enhancement
    this.chatModel = process.env.OPENROUTER_CHAT_MODEL || 'deepseek/deepseek-chat';

    // Fallback to Google Gemini if DeepSeek unavailable
    this.fallbackModel =
      process.env.OPENROUTER_FALLBACK_MODEL || 'google/gemini-2.0-flash-exp:free';
  }

  /**
   * Make a chat completion request to OpenRouter
   */
  private async chat(
    messages: OpenRouterMessage[],
    model?: string,
    temperature: number = 0.7,
    maxTokens: number = 1000,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const requestBody = {
      model: model || this.chatModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vibe-shop.local',
          'X-Title': 'Vibe-Shop E-commerce Platform',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      return data.choices[0]!.message.content;
    } catch (error) {
      console.error('OpenRouter chat failed:', error);
      throw error;
    }
  }

  /**
   * Classify a product into a specific category based on its name and description.
   */
  async classifyProduct(
    name: string,
    description: string,
    availableCategories: { id: string; name: string }[],
  ): Promise<string | null> {
    try {
      if (!this.apiKey) {
        console.warn('OPENROUTER_API_KEY missing, skipping AI classification');
        return null;
      }

      const categoriesList = availableCategories.map((c) => `- ${c.name} (ID: ${c.id})`).join('\n');

      const systemPrompt = 'You are an expert e-commerce product classifier for Vibe-shop.';

      const userPrompt = `
Product Name: ${name}
Product Description: ${description}

Available Categories:
${categoriesList}

Task: Analyze the product and assign it to the MOST relevant category from the list above.
Return ONLY the Category ID. If none fit perfectly, pick the closest match.
      `.trim();

      const messages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const categoryId = await this.chat(messages, this.chatModel, 0.3, 50);
      const cleanedId = categoryId.trim().replace(/['"]/g, '');

      // Validate that ID exists in our list
      const exists = availableCategories.find(
        (c) => c.id === cleanedId || c.id === categoryId.trim(),
      );

      return exists ? exists.id : null;
    } catch (error) {
      console.error('AI Classification failed:', error);
      return null;
    }
  }

  /**
   * Rewrite a product description to be more engaging and SEO-friendly.
   */
  async enhanceDescription(name: string, rawDescription: string): Promise<string> {
    try {
      if (!this.apiKey) {
        console.warn('OPENROUTER_API_KEY missing, returning original description');
        return rawDescription;
      }

      const systemPrompt =
        'You are a professional copywriter for Vibe-shop, a trendy automated e-commerce store.';

      const userPrompt = `
Rewrite the following product description to be catchy, engaging, and SEO-optimized.
Use bullet points for key features if applicable. Keep it under 200 words.

Product: ${name}
Original Description: ${rawDescription}

Output:
      `.trim();

      const messages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const enhanced = await this.chat(messages, this.chatModel, 0.8, 300);
      return enhanced.trim();
    } catch (error) {
      console.error('AI Description enhancement failed:', error);
      return rawDescription;
    }
  }

  /**
   * Suggest trending keywords related to a seed topic.
   */
  async generateTrendingKeywords(topic: string): Promise<string[]> {
    try {
      if (!this.apiKey) {
        console.warn('OPENROUTER_API_KEY missing, returning empty keywords');
        return [];
      }

      const systemPrompt =
        'You are an e-commerce SEO expert specializing in trending keyword research.';

      const userPrompt = `
Generate 5 trending, high-volume search keywords related to "${topic}" for 2026.
Return ONLY a JSON array of strings, e.g., ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"].
No markdown, no explanations, just the JSON array.
      `.trim();

      const messages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.chat(messages, this.chatModel, 0.7, 150);

      // Clean up response (remove markdown code blocks if present)
      const cleanedResponse = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const keywords = JSON.parse(cleanedResponse);

      if (Array.isArray(keywords)) {
        return keywords;
      }

      return [];
    } catch (error) {
      console.error('AI Keyword generation failed:', error);
      return [];
    }
  }
}

// Export singleton instance
export const openRouterAI = new OpenRouterClient();
