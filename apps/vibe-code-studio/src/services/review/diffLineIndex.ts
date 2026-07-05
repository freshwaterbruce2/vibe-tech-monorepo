/**
 * Commentable-line index — GitHub inline review comments 422 unless the line
 * exists on the RIGHT side of the diff. Only 'add' and 'context' lines carry
 * valid new-file numbers in AICodeReviewer.parseDiff output ('remove' lines
 * hold the current new-file number WITHOUT incrementing — never anchorable).
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import type { ParsedDiff } from '../AICodeReviewer';

export type CommentableLineIndex = Map<string, Set<number>>;

/** Per file path, the set of RIGHT-side line numbers a comment may anchor to */
export function buildCommentableLineIndex(parsed: ParsedDiff): CommentableLineIndex {
  const index: CommentableLineIndex = new Map();
  for (const file of parsed.files) {
    const lines = index.get(file.path) ?? new Set<number>();
    for (const chunk of file.chunks) {
      for (const line of chunk.lines) {
        if (line.type === 'add' || line.type === 'context') {
          lines.add(line.lineNumber);
        }
      }
    }
    index.set(file.path, lines);
  }
  return index;
}

/**
 * Exact anchor when valid, else the nearest anchorable line within ±window;
 * null when the file has no anchorable line in range (fold into summary).
 */
export function nearestAnchor(
  index: CommentableLineIndex,
  file: string,
  line: number,
  window = 3
): number | null {
  const lines = index.get(file);
  if (!lines || lines.size === 0) return null;
  if (lines.has(line)) return line;
  for (let distance = 1; distance <= window; distance++) {
    if (lines.has(line + distance)) return line + distance;
    if (lines.has(line - distance)) return line - distance;
  }
  return null;
}
