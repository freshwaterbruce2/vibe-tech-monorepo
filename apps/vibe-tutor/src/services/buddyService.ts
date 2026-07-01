import { AI_FRIEND_PROMPT } from '../constants';
import type { ChatMessage } from '../types';
import { detectCrisis, getCrisisResponse } from './crisisDetection';
import { classifyMessageSafety } from './safetyClassifier';
import { learningAnalytics } from './learningAnalytics';
import { createChatCompletion, type DeepSeekMessage } from './secureClient';
import { MODELS } from './openrouter';
import { usageMonitor } from './usageMonitor';
import { logger } from '../utils/logger';

// Maximum conversation history size to prevent memory bloat
// Keeps system message + last MAX_HISTORY_SIZE messages
const MAX_HISTORY_SIZE = 20;
// How many old messages to hydrate from storage (leave room for new conversation)
const HYDRATE_LIMIT = 10;

const conversationHistory: DeepSeekMessage[] = [{ role: 'system', content: AI_FRIEND_PROMPT }];

/**
 * Hydrate the AI's conversation history from persisted chat messages.
 * Called by ChatWindow after loading from dataStore so the AI remembers context.
 */
export function hydrateBuddyHistory(savedMessages: ChatMessage[]): void {
  conversationHistory.length = 0;
  conversationHistory.push({ role: 'system', content: AI_FRIEND_PROMPT });

  if (!savedMessages || savedMessages.length === 0) return;

  const recent = savedMessages.slice(-HYDRATE_LIMIT);
  for (const msg of recent) {
    conversationHistory.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
}

/** Reset AI history to fresh state (system prompt only). */
export function clearBuddyHistory(): void {
  conversationHistory.length = 0;
  conversationHistory.push({ role: 'system', content: AI_FRIEND_PROMPT });
}

/**
 * Add message to history with automatic size limiting
 * Prevents indefinite memory growth by keeping only recent messages
 */
function addToHistory(role: 'user' | 'assistant', content: string): void {
  conversationHistory.push({ role, content });

  // Keep only system message + recent history to prevent memory bloat
  if (conversationHistory.length > MAX_HISTORY_SIZE + 1) {
    const systemMessage = conversationHistory[0];
    const recentMessages = conversationHistory.slice(-MAX_HISTORY_SIZE);
    conversationHistory.length = 0;
    if (systemMessage) conversationHistory.push(systemMessage, ...recentMessages);
  }
}

const BUDDY_FALLBACK =
  "Sorry, I'm having a little trouble connecting right now. Let's talk later.";

/** Record a detected crisis in history and return the fixed supportive reply. */
function crisisReplyToHistory(message: string, category: 'self-harm' | 'abuse'): string {
  addToHistory('user', message);
  const crisisReply = getCrisisResponse(category);
  addToHistory('assistant', crisisReply);
  return crisisReply;
}

/**
 * Over-cap path: safety still runs (a child in distress must never be gated by a
 * usage limit — safety overrides commercial caps). Returns the crisis reply if
 * the online classifier flags, otherwise the usage-limit reason.
 */
async function overCapReply(message: string, reason: string): Promise<string> {
  const flagged = await classifyMessageSafety(message);
  return flagged ? crisisReplyToHistory(message, flagged) : reason;
}

/** Normal online path: classifier runs concurrently with the answer. */
async function answerAsBuddy(message: string, useReasoning: boolean): Promise<string> {
  addToHistory('user', message);

  const startTime = Date.now();
  // Run the safety classifier alongside the answer (no added latency); if it
  // flags, discard the answer and surface supportive crisis resources instead.
  const [flagged, response] = await Promise.all([
    classifyMessageSafety(message),
    createChatCompletion(conversationHistory, {
      model: MODELS.PRIMARY_PAID,
      temperature: 0.8,
      top_p: 0.95,
      useReasoning, // Enable DeepSeek V3.2 reasoning mode when needed
    }),
  ]);

  if (flagged) {
    const crisisReply = getCrisisResponse(flagged);
    addToHistory('assistant', crisisReply);
    return crisisReply;
  }

  const duration = Date.now() - startTime;
  const assistantMessage = response ?? BUDDY_FALLBACK;

  if (response) {
    const inputTokens = conversationHistory.reduce(
      (acc, msg) => acc + (msg.content?.length ?? 0),
      0,
    );
    void learningAnalytics.logAICall(
      MODELS.PRIMARY_PAID,
      inputTokens,
      assistantMessage.length,
      duration,
    );
  }

  addToHistory('assistant', assistantMessage);
  usageMonitor.recordRequest();

  return assistantMessage;
}

export const sendMessageToBuddy = async (
  message: string,
  useReasoning: boolean = false,
): Promise<string> => {
  // Safety backstop FIRST: the regex floor is deterministic and offline-safe
  // (the LLM could be a weaker fallback model, an ignored prompt, or offline).
  const crisis = detectCrisis(message);
  if (crisis) {
    return crisisReplyToHistory(message, crisis);
  }

  try {
    const canRequest = usageMonitor.canMakeRequest();
    if (!canRequest.allowed) {
      return await overCapReply(
        message,
        canRequest.reason ?? 'Usage limit reached. Please try again later.',
      );
    }
    return await answerAsBuddy(message, useReasoning);
  } catch (error) {
    logger.error('Error sending message to buddy:', error);
    return BUDDY_FALLBACK;
  }
};

export const getMoodAnalysis = async (mood: string, note?: string): Promise<string> => {
  const prompt = `A user has logged their mood as "${mood}". ${note ? `They added this note: "${note}".` : ''}
    Provide a short (2-3 sentences), gentle, and supportive reflection. Acknowledge their feeling and offer a word of encouragement.
    Do not give medical advice. Keep it brief and kind.`;

  try {
    const startTime = Date.now();
    const response = await createChatCompletion(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        model: MODELS.PRIMARY_PAID,
        temperature: 0.7,
        max_tokens: 100,
      },
    );

    const duration = Date.now() - startTime;
    if (response) {
      void learningAnalytics.logAICall(MODELS.PRIMARY_PAID, prompt.length, response.length, duration);
    }

    return response ?? "It's okay to feel your feelings. Be kind to yourself today.";
  } catch (error) {
    logger.error('Error getting mood analysis:', error);
    return "It's okay to feel your feelings. Be kind to yourself today.";
  }
};
