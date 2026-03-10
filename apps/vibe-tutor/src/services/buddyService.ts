import { AI_FRIEND_PROMPT } from '../constants';
import type { ChatMessage } from '../types';
import { learningAnalytics } from './learningAnalytics';
import { createChatCompletion, type DeepSeekMessage } from './secureClient';
import { usageMonitor } from './usageMonitor';

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

export const sendMessageToBuddy = async (
  message: string,
  useReasoning: boolean = false,
): Promise<string> => {
  try {
    // Check usage limits before making request
    const canRequest = usageMonitor.canMakeRequest();
    if (!canRequest.allowed) {
      return canRequest.reason ?? 'Usage limit reached. Please try again later.';
    }

    addToHistory('user', message);

    const startTime = Date.now();
    // Use reasoning mode for complex homework questions
    const response = await createChatCompletion(conversationHistory, {
      model: 'deepseek-chat',
      temperature: 0.8,
      top_p: 0.95,
      useReasoning: useReasoning, // Enable DeepSeek V3.2 reasoning mode when needed
    });

    const duration = Date.now() - startTime;
    const assistantMessage =
      response ?? "Sorry, I'm having a little trouble connecting right now. Let's talk later.";

    // Log AI call for analytics
    if (response) {
      const inputTokens = conversationHistory.reduce(
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

    // Record successful request
    usageMonitor.recordRequest();

    return assistantMessage;
  } catch (error) {
    console.error('Error sending message to buddy:', error);
    return "Sorry, I'm having a little trouble connecting right now. Let's talk later.";
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
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 100,
      },
    );

    const duration = Date.now() - startTime;
    if (response) {
      void learningAnalytics.logAICall('deepseek-chat', prompt.length, response.length, duration);
    }

    return response ?? "It's okay to feel your feelings. Be kind to yourself today.";
  } catch (error) {
    console.error('Error getting mood analysis:', error);
    return "It's okay to feel your feelings. Be kind to yourself today.";
  }
};
