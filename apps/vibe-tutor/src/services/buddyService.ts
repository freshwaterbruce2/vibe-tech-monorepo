import type { ChatMessage } from '../types';
import { detectCrisis, getCrisisResponse } from './crisisDetection';
import { classifyMessageSafety } from './safetyClassifier';
import { learningAnalytics } from './learningAnalytics';
import { createChatCompletion, type DeepSeekMessage } from './secureClient';
import { usageMonitor } from './usageMonitor';

// Maximum conversation history size to prevent memory bloat
// Keeps system message + last MAX_HISTORY_SIZE messages
const MAX_HISTORY_SIZE = 20;
// How many old messages to hydrate from storage (leave room for new conversation)
const HYDRATE_LIMIT = 10;

const conversationHistory: DeepSeekMessage[] = [];

/**
 * Hydrate the AI's conversation history from persisted chat messages.
 * Called by ChatWindow after loading from dataStore so the AI remembers context.
 */
export function hydrateBuddyHistory(savedMessages: ChatMessage[]): void {
  conversationHistory.length = 0;

  if (!savedMessages || savedMessages.length === 0) return;

  const recent = savedMessages.slice(-HYDRATE_LIMIT);
  for (const msg of recent) {
    conversationHistory.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
}

/** Reset the local Buddy context without touching Tutor context. */
export function clearBuddyHistory(): void {
  conversationHistory.length = 0;
}

/**
 * Add message to history with automatic size limiting
 * Prevents indefinite memory growth by keeping only recent messages
 */
function addToHistory(role: 'user' | 'assistant', content: string): void {
  conversationHistory.push({ role, content });

  if (conversationHistory.length > MAX_HISTORY_SIZE) {
    const recentMessages = conversationHistory.slice(-MAX_HISTORY_SIZE);
    conversationHistory.length = 0;
    conversationHistory.push(...recentMessages);
  }
}

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
  const flagged = await classifyMessageSafety(message).catch(() => null);
  return flagged ? crisisReplyToHistory(message, flagged) : reason;
}

function removeFailedUserTurn(message: string): void {
  const latest = conversationHistory.at(-1);
  if (latest?.role === 'user' && latest.content === message) conversationHistory.pop();
}

/** Normal online path: classifier runs concurrently with the answer. */
async function answerAsBuddy(message: string, reservationId: string): Promise<string> {
  let retainReservation = false;
  try {
    addToHistory('user', message);
    const messagesForCompletion: DeepSeekMessage[] = [...conversationHistory];

  const startTime = Date.now();
  // Run the safety classifier alongside the answer (no added latency); if it
  // flags, discard the answer and surface supportive crisis resources instead.
  const [classifier, completion] = await Promise.allSettled([
    classifyMessageSafety(message, 'friend'),
    createChatCompletion(messagesForCompletion, { chatType: 'friend' }),
  ]);

  if (classifier.status === 'fulfilled' && classifier.value) {
    const crisisReply = getCrisisResponse(classifier.value);
    addToHistory('assistant', crisisReply);
    return crisisReply;
  }

  if (completion.status === 'rejected') {
    removeFailedUserTurn(message);
    throw completion.reason;
  }

  const duration = Date.now() - startTime;
  const assistantMessage = completion.value;
  const inputTokens = messagesForCompletion.reduce((acc, msg) => acc + (msg.content?.length ?? 0), 0);
  void learningAnalytics.logAICall('server-selected', inputTokens, assistantMessage.length, duration);

  addToHistory('assistant', assistantMessage);
    retainReservation = !(await usageMonitor.commitRequest(reservationId));
    return assistantMessage;
  } finally {
    if (!retainReservation) usageMonitor.releaseRequest(reservationId);
  }
}

export const sendMessageToBuddy = async (
  message: string,
): Promise<string> => {
  // Safety backstop FIRST: the regex floor is deterministic and offline-safe
  // (the LLM could be a weaker fallback model, an ignored prompt, or offline).
  const crisis = detectCrisis(message);
  if (crisis) {
    return crisisReplyToHistory(message, crisis);
  }

  const reservation = usageMonitor.reserveRequest();
  if (!reservation.allowed) {
    return await overCapReply(
      message,
      reservation.reason,
    );
  }
  return answerAsBuddy(message, reservation.reservationId);
};
