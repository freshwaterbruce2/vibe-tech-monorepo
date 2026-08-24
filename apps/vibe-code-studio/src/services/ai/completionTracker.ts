/**
 * Completion + message-feedback tracking.
 *
 * Feedback is persisted locally (keyed by message id) so thumbs-up/down
 * survive reloads, and is also forwarded to the telemetry pipeline for
 * aggregate analytics.
 */
import { logger } from '../Logger';
import { telemetry } from '../TelemetryService';

export type MessageFeedback = 'positive' | 'negative';

const FEEDBACK_STORAGE_KEY = 'vibe-code-studio-message-feedback';

export function trackCompletionAction(accepted: boolean) {
  // Placeholder: hook into analytics/telemetry if needed
  if (process.env['NODE_ENV'] === 'development') {
    logger.debug('[CompletionTracker] Completion', accepted ? 'accepted' : 'rejected');
  }
}

function readFeedbackStore(): Record<string, MessageFeedback> {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, MessageFeedback>;
    }
    return {};
  } catch (error) {
    logger.warn('[CompletionTracker] Failed to read message feedback', error);
    return {};
  }
}

/**
 * Persist a thumbs-up/down rating for an assistant message and report it to
 * telemetry. Repeated calls for the same message overwrite the prior rating.
 */
export function recordMessageFeedback(messageId: string, feedback: MessageFeedback): void {
  if (!messageId) {
    return;
  }

  try {
    const store = readFeedbackStore();
    store[messageId] = feedback;
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    logger.warn('[CompletionTracker] Failed to persist message feedback', error);
  }

  telemetry.trackEvent('ai_message_feedback', { rating: feedback });
}

/**
 * Read a previously stored rating for a message, or null when none exists.
 */
export function getMessageFeedback(messageId: string): MessageFeedback | null {
  if (!messageId) {
    return null;
  }
  return readFeedbackStore()[messageId] ?? null;
}
