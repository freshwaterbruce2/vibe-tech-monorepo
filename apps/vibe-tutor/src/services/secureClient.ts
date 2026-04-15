/**
 * Secure API Client - Communicates with backend proxy
 * No API keys stored client-side - all auth handled by server
 *
 * @module services/secureClient
 * @description 2026 Best Practice - Proxy-based API access for mobile apps
 */

import { BLAKE_CONFIG } from '@/config';
import { sessionStore } from '@/utils/electronStore';
import { CapacitorHttp } from '@capacitor/core';
import { logger } from '../utils/logger';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  retryCount?: number;
  fallbackMessage?: string;
  useReasoning?: boolean;
}

export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

class SecureAPIClient {
  private baseURL: string;
  private sessionToken: string | null = null;
  private tokenExpiry = 0;
  private static readonly FREE_FALLBACK_MODEL = 'openrouter/free';

  constructor() {
    // ALWAYS use proxy for mobile apps - server handles API keys securely
    this.baseURL = BLAKE_CONFIG.apiEndpoint;
    logger.error(`[SecureClient] baseURL resolved to ${this.baseURL}`);
  }

  /**
   * Initialize a session with the backend proxy
   */
  private async initSession(): Promise<void> {
    const targetUrl = `${this.baseURL}${BLAKE_CONFIG.endpoints.session}`;
    logger.error(`[SecureClient] initSession → POST ${targetUrl}`);
    try {
      const response = await CapacitorHttp.post({
        url: targetUrl,
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });
      logger.error(`[SecureClient] initSession response status: ${response.status}`);

      if (response.status !== 200) {
        throw new Error(`Session init failed: ${response.status}`);
      }

      const data = response.data;
      this.sessionToken = data.token;
      this.tokenExpiry = Date.now() + data.expiresIn * 1000;

      // Store token securely
      sessionStore.set('vibetutor_session', this.sessionToken);
      sessionStore.set('vibetutor_expiry', String(this.tokenExpiry));
    } catch (error) {
      logger.error('[SecureClient] Session initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid session before making requests
   */
  private async ensureValidSession(): Promise<void> {
    if (this.sessionToken && Date.now() < this.tokenExpiry) {
      return; // Session still valid
    }

    // Try to restore from storage
    const storedToken = sessionStore.get<string>('vibetutor_session');
    const storedExpiry = sessionStore.get<string>('vibetutor_expiry');

    if (storedToken && storedExpiry && Date.now() < Number(storedExpiry)) {
      this.sessionToken = storedToken;
      this.tokenExpiry = Number(storedExpiry);

      return;
    }

    // Initialize new session
    await this.initSession();
  }

  /**
   * Make a chat completion request through the proxy
   */
  async chatCompletion(
    messages: DeepSeekMessage[],
    options: ChatOptions = {},
  ): Promise<ChatCompletionResponse> {
    await this.ensureValidSession();

    const maxRetries = options.retryCount ?? 3;
    let lastError: Error | null = null;
    let forcedModel: string | undefined;

    const buildRequestData = (modelOverride?: string) => {
      const model = modelOverride ?? options.model;
      return {
        messages,
        // Keep top-level fields for newer backend variants.
        model,
        temperature: options.temperature,
        top_p: options.top_p,
        max_tokens: options.max_tokens,
        // Include nested options for legacy backend variants.
        options: {
          model,
          temperature: options.temperature,
          top_p: options.top_p,
          max_tokens: options.max_tokens,
        },
      };
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await CapacitorHttp.request({
          url: `${this.baseURL}${BLAKE_CONFIG.endpoints.chat}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.sessionToken}`,
          },
          data: buildRequestData(forcedModel),
          connectTimeout: 30000,
          readTimeout: 30000,
        });

        if (response.status === 401) {
          // Session expired, reinitialize and retry
          await this.initSession();
          continue;
        }

        if (response.status === 429) {
          // Rate limited
          const retryAfter = response.data?.retryAfter ?? 60;
          logger.warn(`[SecureClient] Rate limited, retry after ${retryAfter}s`);

          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
        }

        // Billing/access errors from paid models: retry once using free router model.
        if (
          (response.status === 402 || response.status === 503) &&
          (forcedModel ?? options.model) !== SecureAPIClient.FREE_FALLBACK_MODEL
        ) {
          forcedModel = SecureAPIClient.FREE_FALLBACK_MODEL;
          logger.warn(
            '[SecureClient] Retrying chat with free fallback model after paid-model failure',
          );
          continue;
        }

        if (response.status < 200 || response.status >= 300) {
          const serverMsg = response.data?.message ?? response.data?.error ?? '';
          throw new Error(`API error: ${response.status} - ${serverMsg}`);
        }

        return response.data;
      } catch (error) {
        lastError = error as Error;
        logger.error(`[SecureClient] Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const backoff = Math.min(Math.pow(2, attempt - 1) * 1000, 10000);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    throw lastError ?? new Error('Request failed after all retries');
  }

  /**
   * Check if the backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await CapacitorHttp.get({
        url: `${this.baseURL}${BLAKE_CONFIG.endpoints.health}`,
      });
      return response.status === 200 && response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const secureClient = new SecureAPIClient();

/**
 * Helper function for chat completions
 */
export async function createChatCompletion(
  messages: DeepSeekMessage[],
  options: ChatOptions = {},
): Promise<string | null> {
  try {
    const response = await secureClient.chatCompletion(messages, options);
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return options.fallbackMessage ?? null;
    }

    return content;
  } catch (error) {
    logger.error('[SecureClient] Chat completion error:', error);
    logger.error('[SecureClient] Chat completion error details:', error);
    return (
      options.fallbackMessage ??
      "I'm having trouble connecting right now. Please try again in a moment! 🔄"
    );
  }
}

// Legacy export for compatibility
export { secureClient as deepseekClient };
