/**
 * Dedup — on `synchronize` re-runs, findings whose fingerprint already exists
 * in a posted bot comment are skipped (spec AC #5). Fingerprints ride inside
 * invisible HTML-comment markers in each posted body.
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import { extractFingerprints } from './fingerprint';
import type { AnchoredComment } from './types';

/** Drop candidates already present in existing bot comment bodies */
export function filterDuplicates(
  candidates: AnchoredComment[],
  existingBodies: Array<string | undefined>
): AnchoredComment[] {
  const seen = extractFingerprints(existingBodies);
  if (seen.size === 0) return candidates;
  return candidates.filter(candidate => !seen.has(candidate.fingerprint));
}
