// OpenRouter client integration for vibe-tutor (MOBILE-OPTIMIZED)
// UPDATED: January 10, 2026 - Fixed to use backend proxy
// Uses CapacitorHttp for Android compatibility

import { BLAKE_CONFIG } from '@/config';
import { sessionStore } from '@/utils/electronStore';
import { CapacitorHttp } from '@capacitor/core';

// Type definitions
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface ChatResponse {
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

// Model policy: DeepSeek V3.2 primary + free fallback via backend.
export const MODELS = {
  PRIMARY_PAID: 'deepseek/deepseek-v3.2',
  FALLBACK_FREE: 'openrouter/free',
};

// Session management
let sessionToken: string | null = null;
let tokenExpiry = 0;

async function ensureSession(): Promise<void> {
  if (!sessionToken || Date.now() >= tokenExpiry) {
    const stored = sessionStore.get<string>('openrouter_session');
    const expiry = sessionStore.get<string>('openrouter_expiry');

    if (stored && expiry && Date.now() < Number(expiry)) {
      sessionToken = stored;
      tokenExpiry = Number(expiry);
    } else {
      // Initialize new session
      const response = await CapacitorHttp.request({
        url: `${BLAKE_CONFIG.apiEndpoint}${BLAKE_CONFIG.endpoints.session}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200) {
        sessionToken = response.data.token;
        tokenExpiry = Date.now() + response.data.expiresIn * 1000;
        // Store in secure storage
        if (sessionToken) {
          sessionStore.set('openrouter_session', sessionToken);
        }
        sessionStore.set('openrouter_expiry', String(tokenExpiry));
      }
    }
  }
}

/**
 * Mobile-optimized OpenRouter client using backend proxy
 */
class OpenRouterClient {
  private timeout: number;
  private retries: number;

  constructor(options?: { timeout?: number; retries?: number }) {
    this.timeout = options?.timeout ?? 30000;
    this.retries = options?.retries ?? 3;
    console.debug('[OpenRouter] Initialized with backend:', BLAKE_CONFIG.apiEndpoint);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    await ensureSession();

    const maxRetries = this.retries;
    let lastError: Error | null = null;
    let forceFreeFallback = false;

    const buildPayload = () => {
      const model = forceFreeFallback ? MODELS.FALLBACK_FREE : request.model;
      return {
        ...request,
        model,
        // Include nested options for legacy backend compatibility.
        options: {
          model,
          temperature: request.temperature,
          top_p: request.top_p,
          max_tokens: request.max_tokens,
        },
      };
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await CapacitorHttp.post({
          url: `${BLAKE_CONFIG.apiEndpoint}${BLAKE_CONFIG.endpoints.chat}`,
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          data: buildPayload(),
          connectTimeout: this.timeout,
          readTimeout: this.timeout,
        });

        if (response.status === 401) {
          // Session expired
          sessionToken = null;
          await ensureSession();
          continue;
        }

        if (response.status === 429) {
          const retryAfter = response.data?.retryAfter ?? 60;
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
        }

        if (
          (response.status === 402 || response.status === 503) &&
          !forceFreeFallback &&
          request.model !== MODELS.FALLBACK_FREE
        ) {
          forceFreeFallback = true;
          console.warn('[OpenRouter] Retrying with free fallback model');
          continue;
        }

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`API error: ${response.status}`);
        }

        return response.data as ChatResponse;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const backoff = Math.min(Math.pow(2, attempt - 1) * 1000, 10000);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    throw lastError ?? new Error('Request failed after all retries');
  }
}

// Singleton instance
export const openRouterClient = new OpenRouterClient();

// ============== HELPER FUNCTIONS ==============

/**
 * Get homework help
 */
export async function getHomeworkHelp(subject: string, question: string): Promise<string> {
  try {
    const response = await openRouterClient.chat({
      model: MODELS.PRIMARY_PAID,
      messages: [
        {
          role: 'system',
          content: `You are a helpful tutor for ${subject}. Provide clear, concise explanations. Focus on teaching concepts, not just giving answers.`,
        },
        { role: 'user', content: question },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content ?? 'Sorry, I could not process your request.';
  } catch (error) {
    console.error('[OpenRouter] Homework help error:', error);
    return navigator.onLine
      ? "I'm having trouble connecting right now. Please try again."
      : "I'm offline. Please check your internet connection.";
  }
}

/**
 * Parse homework input into structured data
 */
export async function parseHomeworkInput(input: string): Promise<{
  subject?: string;
  title?: string;
  dueDate?: string;
  description?: string;
}> {
  try {
    const response = await openRouterClient.chat({
      model: MODELS.PRIMARY_PAID,
      messages: [
        {
          role: 'system',
          content:
            'Extract homework details as JSON: {subject, title, dueDate (YYYY-MM-DD), description}. Only include clearly mentioned fields.',
        },
        { role: 'user', content: input },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (error) {
    console.error('[OpenRouter] Parse error:', error);
    return {};
  }
}

/**
 * Break down complex task into steps
 */
export async function breakDownTask(task: string): Promise<string[]> {
  try {
    const response = await openRouterClient.chat({
      model: MODELS.PRIMARY_PAID,
      messages: [
        {
          role: 'system',
          content: 'Break this task into 3-5 simple steps. Return as numbered list.',
        },
        { role: 'user', content: `Break down: ${task}` },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const steps = content
      .split('\n')
      .filter((line) => line.trim().match(/^\d+\./))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);

    return steps.length > 0 ? steps : ['Start the task', 'Work through it', 'Review your work'];
  } catch (error) {
    console.error('[OpenRouter] Break down error:', error);
    return ['Start the task', 'Work through it', 'Review your work'];
  }
}

/**
 * Generate an ADHD-optimized afternoon schedule suggestion.
 * Returns an array of time-block objects; falls back to [] on parse error.
 */
export async function generateScheduleSuggestion(context: {
  peakHours: number[];
  energyLevel: 1 | 2 | 3;
  homeworkTitles: string[];
}): Promise<Array<{ time: string; activity: string; durationMinutes: number; type: string }>> {
  const { peakHours, energyLevel, homeworkTitles } = context;
  const energyLabel = energyLevel === 1 ? 'low' : energyLevel === 2 ? 'medium' : 'high';
  const peakLabel = peakHours.map((h) => `${h % 12 || 12}${h < 12 ? 'AM' : 'PM'}`).join(', ');
  const homeworkList = homeworkTitles.length > 0 ? homeworkTitles.join(', ') : 'general study';

  try {
    const response = await openRouterClient.chat({
      model: MODELS.PRIMARY_PAID,
      messages: [
        {
          role: 'system',
          content: `You are a smart schedule builder for a child with ADHD. Create a 3–6 hour after-school schedule.
Rules:
- Schedule hard homework during peak hours: ${peakLabel}
- Always add a 10-minute break after any homework block
- Max 2 hours total homework time
- Energy is ${energyLabel}: low=start easy tasks, high=tackle hard tasks first
- End with a fun reward (Roblox or gaming, 30 min)
- Return ONLY a JSON array, no prose or markdown:
[{"time":"4:00 PM","activity":"Math homework","durationMinutes":30,"type":"homework"},...]
Valid types: homework, break, chore, fun, meal`,
        },
        {
          role: 'user',
          content: `Build my schedule. Homework: ${homeworkList}. Energy: ${energyLabel}. My best hours: ${peakLabel}.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 700,
    });

    const content = response.choices[0]?.message?.content ?? '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? (parsed as Array<{ time: string; activity: string; durationMinutes: number; type: string }>) : [];
  } catch (error) {
    console.error('[OpenRouter] Schedule suggestion error:', error);
    return [];
  }
}

export type Message = ChatMessage;
