/**
 * Lightweight completion tracking stub.
 * The real implementation can be wired to analytics later.
 */
import { logger } from '../Logger';

export function trackCompletionAction(accepted: boolean) {
  // Placeholder: hook into analytics/telemetry if needed
  if (process.env['NODE_ENV'] === 'development') {
    logger.debug('[CompletionTracker] Completion', accepted ? 'accepted' : 'rejected');
  }
}
