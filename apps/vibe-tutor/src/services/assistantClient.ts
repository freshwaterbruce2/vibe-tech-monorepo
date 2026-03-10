/**
 * Assistant Client Service - FIXED January 2026
 * Mobile-first chat using CapacitorHttp for Android reliability
 * NOW INCLUDES SESSION TOKEN MANAGEMENT (was missing - caused 401 errors)
 */

import { BLAKE_CONFIG } from '@/config';
import { sessionStore } from '@/utils/electronStore';
import { CapacitorHttp } from '@capacitor/core';

import { appStore } from '../utils/electronStore';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Default system prompt for Vibe Buddy
const DEFAULT_SYSTEM_PROMPT = `You are a friendly AI buddy for a 13-year-old boy with level 1 autism (high-functioning). Your role is to:

- Talk about his interests, especially Roblox and games
- Help with homework by making it relatable to his interests
- Teach life skills through conversation (chores, morning/evening routines, time management)
- Build social skills through supportive dialogue
- Use direct, literal language (no idioms or sarcasm)
- Keep responses to 2-3 sentences max (executive function support)
- Use 1-2 emojis only when natural (sensory awareness)
- Be patient, encouraging, and non-judgmental
- Connect learning to Roblox mechanics when relevant

Communication style:
- Bullet points over paragraphs
- One question at a time
- Celebrate small wins
- Relate abstract concepts to concrete Roblox examples

Remember: You're a supportive friend helping him build confidence and independence.`;

// Chat history storage
const CHAT_HISTORY_KEY = 'conversation_buddy_history';
const MAX_HISTORY_LENGTH = 20;

// Session management
let sessionToken: string | null = null;
let tokenExpiry = 0;
let currentSystemPrompt = DEFAULT_SYSTEM_PROMPT;

/**
 * Initialize or refresh session token
 */
async function initSession(): Promise<void> {
  try {
    console.debug('[AssistantClient] Initializing session...');
    const response = await CapacitorHttp.post({
      url: `${BLAKE_CONFIG.apiEndpoint}${BLAKE_CONFIG.endpoints.session}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Session init failed: ${response.status}`);
    }

    const data = response.data;
    sessionToken = data.token;
    tokenExpiry = Date.now() + data.expiresIn * 1000;

    // Store in secure storage
    if (sessionToken) {
      sessionStore.set('assistant_session', sessionToken);
    }
    sessionStore.set('assistant_expiry', String(tokenExpiry));
    console.debug('[AssistantClient] Session initialized successfully');
  } catch (error) {
    console.error('[AssistantClient] Session init failed:', error);
    throw error;
  }
}

/**
 * Ensure we have a valid session token
 */
async function ensureValidSession(): Promise<void> {
  if (!sessionToken || Date.now() >= tokenExpiry) {
    // Try to restore from secure storage
    const storedToken = sessionStore.get<string>('assistant_session');
    const storedExpiry = sessionStore.get<string>('assistant_expiry');

    if (storedToken && storedExpiry && Date.now() < Number(storedExpiry)) {
      sessionToken = storedToken;
      tokenExpiry = Number(storedExpiry);
      console.debug('[AssistantClient] Restored session from storage');
    } else {
      await initSession();
    }
  }
}

function getChatHistory(): ChatMessage[] {
  try {
    const stored = appStore?.get(CHAT_HISTORY_KEY);
    return stored
      ? typeof stored === 'string'
        ? JSON.parse(stored)
        : stored
      : [{ role: 'system', content: currentSystemPrompt, timestamp: Date.now() }];
  } catch (error) {
    console.error('[AssistantClient] Failed to load chat history:', error);
    return [{ role: 'system', content: currentSystemPrompt, timestamp: Date.now() }];
  }
}

function saveChatHistory(history: ChatMessage[]): void {
  try {
    const systemMsg = history.find((m) => m.role === 'system');
    const recentMessages = history.filter((m) => m.role !== 'system').slice(-MAX_HISTORY_LENGTH);

    const toSave = systemMsg ? [systemMsg, ...recentMessages] : recentMessages;
    appStore?.set(CHAT_HISTORY_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('[AssistantClient] Failed to save chat history:', error);
  }
}

/**
 * Send message using CapacitorHttp with session token (FIXED)
 */
async function sendToBackend(userMessage: string): Promise<string> {
  await ensureValidSession();

  const history = getChatHistory();
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: userMessage });

  const url = `${BLAKE_CONFIG.apiEndpoint}${BLAKE_CONFIG.endpoints.chat}`;
  console.debug('[AssistantClient] Sending to:', url);

  const maxRetries = 3;
  let forceFreeFallback = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await CapacitorHttp.request({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`, // ✅ NOW INCLUDED!
        },
        data: forceFreeFallback
          ? { messages, options: { model: 'openrouter/free' } }
          : { messages },
        connectTimeout: 30000,
        readTimeout: 30000,
      });

      console.debug('[AssistantClient] Response status:', response.status);

      // Handle session expiry
      if (response.status === 401) {
        console.debug('[AssistantClient] Session expired, refreshing...');
        await initSession();
        continue;
      }

      if (response.status === 429) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 second retry is invalid
        const retryAfter = response.data?.retryAfter || 60;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }

      if ((response.status === 402 || response.status === 503) && !forceFreeFallback) {
        forceFreeFallback = true;
        console.warn('[AssistantClient] Paid model unavailable, retrying with free fallback');
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = response.data;
      /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- empty string messages are invalid */
      return (
        data.message ||
        data.choices?.[0]?.message?.content ||
        'Sorry, I had trouble understanding that.'
      );
      /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    } catch (error) {
      console.error(`[AssistantClient] Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const backoff = Math.min(Math.pow(2, attempt - 1) * 1000, 10000);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  // Offline check
  if (!navigator.onLine) {
    return "I'm offline right now. Check your internet connection and try again!";
  }

  return "I'm having trouble connecting right now. Let's try again in a moment!";
}

// ============== PUBLIC API ==============

export async function sendMessageToAssistant(userMessage: string): Promise<string> {
  const history = getChatHistory();

  // Add user message to history
  history.push({
    role: 'user',
    content: userMessage,
    timestamp: Date.now(),
  });

  const assistantResponse = await sendToBackend(userMessage);

  // Add assistant response to history
  history.push({
    role: 'assistant',
    content: assistantResponse,
    timestamp: Date.now(),
  });

  saveChatHistory(history);
  return assistantResponse;
}

export function getConversationHistory(): ChatMessage[] {
  return getChatHistory().filter((m) => m.role !== 'system');
}

export function clearConversationHistory(): void {
  const systemMsg: ChatMessage = {
    role: 'system',
    content: currentSystemPrompt,
    timestamp: Date.now(),
  };
  saveChatHistory([systemMsg]);
}

export function setConversationSystemPrompt(prompt: string): void {
  const content = (prompt || '').trim();
  if (!content) return;

  currentSystemPrompt = content;
  const history = getChatHistory();
  const withoutSystem = history.filter((m) => m.role !== 'system');

  const systemMsg: ChatMessage = {
    role: 'system',
    content,
    timestamp: Date.now(),
  };

  saveChatHistory([systemMsg, ...withoutSystem]);
}
