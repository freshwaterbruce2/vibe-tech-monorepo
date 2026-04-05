import { AI_TUTOR_PROMPT } from '../constants';
import type { ChatMessage } from '../types';
import { learningAnalytics } from './learningAnalytics';
import { personalization } from './personalizationService';
import { createChatCompletion, type DeepSeekMessage } from './secureClient';
import { usageMonitor } from './usageMonitor';

/** Patterns that indicate the student wants re-explanation (signals unsuccessful interaction) */
const RE_EXPLAIN_PATTERNS =
  /\b(don'?t understand|confused|not clear|explain again|what do you mean|huh\?|lost me|try again|simpler|can you re-?explain)\b/i;

// Maximum conversation history size to prevent memory bloat
// Keeps system message + last MAX_HISTORY_SIZE messages
const MAX_HISTORY_SIZE = 20;
// How many old messages to hydrate from storage (leave room for new conversation)
const HYDRATE_LIMIT = 10;

const tutorHistory: DeepSeekMessage[] = [{ role: 'system', content: AI_TUTOR_PROMPT }];

/**
 * Hydrate the AI's conversation history from persisted chat messages.
 * Called by ChatWindow after loading from dataStore so the AI remembers context.
 * Caps at HYDRATE_LIMIT messages to leave room for new conversation.
 */
export function hydrateTutorHistory(savedMessages: ChatMessage[]): void {
  // Reset to just system prompt
  tutorHistory.length = 0;
  tutorHistory.push({ role: 'system', content: AI_TUTOR_PROMPT });

  if (!savedMessages || savedMessages.length === 0) return;

  // Take only the most recent messages within limit
  const recent = savedMessages.slice(-HYDRATE_LIMIT);
  for (const msg of recent) {
    tutorHistory.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
}

/** Reset AI history to fresh state (system prompt only). */
export function clearTutorHistory(): void {
  tutorHistory.length = 0;
  tutorHistory.push({ role: 'system', content: AI_TUTOR_PROMPT });
}

/**
 * Add message to history with automatic size limiting
 * Prevents indefinite memory growth by keeping only recent messages
 */
function addToHistory(role: 'user' | 'assistant', content: string): void {
  tutorHistory.push({ role, content });

  // Keep only system message + recent history to prevent memory bloat
  if (tutorHistory.length > MAX_HISTORY_SIZE + 1) {
    const systemMessage = tutorHistory[0] ?? { role: 'system' as const, content: AI_TUTOR_PROMPT };
    const recentMessages = tutorHistory.slice(-MAX_HISTORY_SIZE);
    tutorHistory.length = 0;
    tutorHistory.push(systemMessage, ...recentMessages);
  }
}

export const sendMessageToTutor = async (message: string): Promise<string> => {
  try {
    // Check usage limits before making request
    const canRequest = usageMonitor.canMakeRequest();
    if (!canRequest.allowed) {
      return canRequest.reason ?? 'Usage limit reached. Please try again later.';
    }

    // Select learning style via epsilon-greedy bandit
    const style = personalization.selectStyle();
    const stylePrompt = personalization.getStylePrompt(style);

    // Record user message in history (without the style prompt so history stays clean)
    addToHistory('user', message);

    // Build messages for this request: inject style into a fresh system entry
    const messagesWithStyle: DeepSeekMessage[] = [
      { role: 'system', content: AI_TUTOR_PROMPT + '\n' + stylePrompt },
      ...tutorHistory.slice(1), // skip original system message; keep conversation history
    ];

    const fallbackResponses = [
      "I'm experiencing some technical difficulties right now. Let me try to help you again.",
      "Sorry, I'm having connection issues. Please try asking your question again.",
      "I'm having trouble processing that request. Could you rephrase your question?",
      "There seems to be a temporary issue. Let's give it another try.",
    ];

    const startTime = Date.now();
    const response = await createChatCompletion(messagesWithStyle, {
      model: 'deepseek-chat',
      temperature: 0.7,
      top_p: 0.95,
      retryCount: 3,
      fallbackMessage: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
    });

    const duration = Date.now() - startTime;
    const assistantMessage: string =
      response ?? fallbackResponses[0] ?? 'I had trouble responding. Please try again.';

    // Log AI call for analytics
    if (response && assistantMessage) {
      const inputTokens = messagesWithStyle.reduce(
        (acc, msg) => acc + (msg.content?.length ?? 0),
        0,
      );
      void learningAnalytics.logAICall(
        'deepseek-chat',
        inputTokens,
        assistantMessage.length,
        duration,
      );
    }

    addToHistory('assistant', assistantMessage);

    // Record outcome: student asking for re-explanation signals the style didn't land
    const success = !RE_EXPLAIN_PATTERNS.test(message);
    const timeSpent = (Date.now() - startTime) / 1000;
    personalization.recordFeedback(success, timeSpent);

    // Record successful request
    usageMonitor.recordRequest();

    return assistantMessage;
  } catch (error) {
    console.error('Error in sendMessageToTutor:', error);
    return "I'm having some technical difficulties right now. Please try again in a moment.";
  }
};
