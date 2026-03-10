/**
 * Vibe-Shop AI Service
 *
 * Uses OpenRouter API for all AI operations (product classification,
 * description enhancement, trending keywords)
 *
 * Migrated from Google Gemini to OpenRouter (2026-01-24)
 * - Consistent with other VibeTech apps
 * - Ultra-cheap DeepSeek Chat model (~$0.0003/1M tokens)
 * - Fallback to Google Gemini if DeepSeek unavailable
 */

import { openRouterAI } from './openrouter';

export const ai = {
  /**
   * Classify a product into a specific category based on its name and description.
   */
  async classifyProduct(
    name: string,
    description: string,
    availableCategories: { id: string; name: string }[]
  ): Promise<string | null> {
    return openRouterAI.classifyProduct(name, description, availableCategories);
  },

  /**
   * Rewrite a product description to be more engaging and SEO-friendly.
   */
  async enhanceDescription(name: string, rawDescription: string): Promise<string> {
    return openRouterAI.enhanceDescription(name, rawDescription);
  },

  /**
   * Suggest trending keywords related to a seed topic.
   */
  async generateTrendingKeywords(topic: string): Promise<string[]> {
    return openRouterAI.generateTrendingKeywords(topic);
  },
};
