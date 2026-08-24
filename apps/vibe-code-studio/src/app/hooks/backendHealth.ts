/**
 * Backend health polling for AI sidecar readiness (proxy mode boot gate).
 */

import { logger } from '../../services/Logger';

/**
 * Pure health-response interpreter (unit-tested). Separated from
 * waitForBackendReady because that function short-circuits under Vitest.
 */
export async function isBackendHealthReady(
  res: Response,
  isLastAttempt: boolean
): Promise<boolean> {
  if (!res.ok) return false;
  try {
    const data = (await res.json()) as { configured?: Record<string, boolean> };
    const configured = data?.configured ?? {};
    // Prefer waiting until at least one server key is visible so factory
    // validation does not mark every proxy provider unavailable.
    if (Object.values(configured).some(Boolean)) return true;
    // Backend up but keys not loaded yet — keep polling unless last attempt.
    return isLastAttempt;
  } catch {
    // Non-JSON health: treat reachable as ready.
    return true;
  }
}

/** Poll loop (unit-testable). Separated so Vitest can cover it without a sidecar. */
export async function pollBackendHealth(
  maxAttempts = 10,
  delayMs = 1500,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetchImpl('http://localhost:5004/api/ai/health', {
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (await isBackendHealthReady(res, attempt === maxAttempts - 1)) {
        return true;
      }
    } catch {
      // not up yet
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  logger.warn(
    '[useAIProviderInit] Backend not reachable after wait — initializing providers anyway'
  );
  return false;
}

/** Production uses full poll; under Vitest one fast failed poll (no sidecar). */
export async function waitForBackendReady(maxAttempts = 10, delayMs = 1500): Promise<boolean> {
  const isVitest = Boolean(import.meta.env['VITEST']);
  const attempts = isVitest ? 1 : maxAttempts;
  const delay = isVitest ? 0 : delayMs;
  const fetchImpl = isVitest
    ? async () => {
        throw new Error('vitest: no AI sidecar');
      }
    : fetch;
  return pollBackendHealth(attempts, delay, fetchImpl as typeof fetch);
}
