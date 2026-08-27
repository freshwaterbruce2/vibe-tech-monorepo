/**
 * Fingerprints + body markers for the PR review bot. GitHub is the only
 * store: every bot-authored body carries an invisible HTML-comment marker so
 * later passes can dedup findings and count review passes with no database.
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */

export const SUMMARY_MARKER = '<!-- vcs-review-bot:summary:v1 -->';
export const BUDGET_MARKER = '<!-- vcs-review-bot:budget:v1 -->';

const FP_MARKER_PATTERN = /<!-- vcs-review-bot:fp:([0-9a-f]+) -->/g;

/** Trim, lowercase, collapse whitespace — so cosmetic edits don't re-post */
export function normalizeMessage(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** FNV-1a 32-bit hex hash — pure TS, no node:crypto, environment-free */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Stable identity of a finding: path + line + normalized message */
export function commentFingerprint(path: string, line: number, message: string): string {
  return fnv1a(`${path}|${line}|${normalizeMessage(message)}`);
}

/** Invisible marker embedded at the end of each inline comment body */
export function fpMarker(fingerprint: string): string {
  return `<!-- vcs-review-bot:fp:${fingerprint} -->`;
}

/** Collect every fingerprint marker present in a set of comment bodies */
export function extractFingerprints(bodies: Array<string | undefined>): Set<string> {
  const found = new Set<string>();
  for (const body of bodies) {
    if (!body) continue;
    for (const match of body.matchAll(FP_MARKER_PATTERN)) {
      if (match[1]) found.add(match[1]);
    }
  }
  return found;
}
