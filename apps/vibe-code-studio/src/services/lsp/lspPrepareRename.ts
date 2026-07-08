/**
 * Pure mappers for `textDocument/prepareRename` (spec 07 polish). The rename
 * provider calls prepareRename before opening the rename box when the server
 * advertises support; these helpers interpret the server's answer and derive
 * the Monaco `RenameLocation` (range + placeholder text), falling back to the
 * word under the cursor when the server can't help.
 */

import { lspRangeToMonaco, type LspRange, type MonacoRange } from './lspNavigation';

/** Monaco `languages.RenameLocation` (plus the optional rejection channel). */
export interface MonacoRenameLocation {
  range: MonacoRange;
  text: string;
  rejectReason?: string;
}

export type PrepareRenameOutcome =
  | { kind: 'location'; range: MonacoRange; placeholder: string | null }
  | { kind: 'default' }
  | { kind: 'rejected' };

function isLspRange(value: unknown): value is LspRange {
  if (!value || typeof value !== 'object') return false;
  const range = value as { start?: { line?: unknown }; end?: { line?: unknown } };
  return typeof range.start?.line === 'number' && typeof range.end?.line === 'number';
}

/**
 * Interpret an LSP prepareRename result: `null` → the symbol cannot be renamed
 * here; `{ defaultBehavior: true }` → use the client-side word; a bare `Range`
 * → rename that range (placeholder read from the document); `{ range,
 * placeholder }` → both provided. Unrecognized shapes fall back to default.
 */
export function interpretPrepareRename(result: unknown): PrepareRenameOutcome {
  if (result === null || result === undefined) return { kind: 'rejected' };
  if (typeof result !== 'object') return { kind: 'default' };
  const value = result as { defaultBehavior?: unknown; range?: unknown; placeholder?: unknown };
  if (value.defaultBehavior === true) return { kind: 'default' };
  if (isLspRange(result)) {
    return { kind: 'location', range: lspRangeToMonaco(result), placeholder: null };
  }
  if (isLspRange(value.range)) {
    return {
      kind: 'location',
      range: lspRangeToMonaco(value.range),
      placeholder: typeof value.placeholder === 'string' ? value.placeholder : null,
    };
  }
  return { kind: 'default' };
}

/** Zero-width range at a Monaco position (used when there is no word to fall back on). */
export function cursorRange(position: { lineNumber: number; column: number }): MonacoRange {
  return {
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  };
}

/**
 * Combine a prepareRename outcome with the client-side word fallback into the
 * final Monaco `RenameLocation`. `readRange` reads document text for a range
 * (used when the server returned a bare Range without a placeholder).
 */
export function resolveRenameLocation(
  outcome: PrepareRenameOutcome,
  fallback: MonacoRenameLocation | null,
  readRange: (range: MonacoRange) => string | undefined,
  position: { lineNumber: number; column: number }
): MonacoRenameLocation {
  if (outcome.kind === 'rejected') {
    return {
      range: fallback?.range ?? cursorRange(position),
      text: fallback?.text ?? '',
      rejectReason: 'This element cannot be renamed.',
    };
  }
  if (outcome.kind === 'location') {
    const text = outcome.placeholder ?? readRange(outcome.range) ?? fallback?.text ?? '';
    return { range: outcome.range, text };
  }
  if (fallback) return fallback;
  return {
    range: cursorRange(position),
    text: '',
    rejectReason: 'No renameable symbol at the cursor.',
  };
}
