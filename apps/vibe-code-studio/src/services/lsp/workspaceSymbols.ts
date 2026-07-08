/**
 * Pure mappers for `workspace/symbol` (spec 07 AC #6). Results are surfaced in
 * the command palette's `#` symbol-search mode (Ctrl+T); these helpers map LSP
 * `SymbolInformation[]` / `WorkspaceSymbol[]` into plain display entries and
 * recognize the palette's symbol-query prefix.
 */

import { lspRangeToMonaco, type LspRange, type MonacoRange } from './lspNavigation';
import { uriToFilePath } from './uri';

/** Palette prefix that switches the command palette into symbol-search mode. */
export const SYMBOL_QUERY_PREFIX = '#';

/** True when a palette search string is a workspace-symbol query (`#…`). */
export function isSymbolQuery(search: string): boolean {
  return search.startsWith(SYMBOL_QUERY_PREFIX);
}

/** The symbol text of a palette symbol query (`'#foo '` → `'foo'`). */
export function symbolQueryText(search: string): string {
  return isSymbolQuery(search) ? search.slice(SYMBOL_QUERY_PREFIX.length).trim() : search.trim();
}

/** A workspace symbol ready for display: Windows path + 1-based Monaco range. */
export interface WorkspaceSymbolEntry {
  name: string;
  kindLabel: string;
  containerName: string;
  path: string;
  range: MonacoRange;
}

// LSP SymbolKind (1-based) → human label.
const SYMBOL_KIND_LABELS: Record<number, string> = {
  1: 'File',
  2: 'Module',
  3: 'Namespace',
  4: 'Package',
  5: 'Class',
  6: 'Method',
  7: 'Property',
  8: 'Field',
  9: 'Constructor',
  10: 'Enum',
  11: 'Interface',
  12: 'Function',
  13: 'Variable',
  14: 'Constant',
  15: 'String',
  16: 'Number',
  17: 'Boolean',
  18: 'Array',
  19: 'Object',
  20: 'Key',
  21: 'Null',
  22: 'EnumMember',
  23: 'Struct',
  24: 'Event',
  25: 'Operator',
  26: 'TypeParameter',
};

/** Human label for an LSP `SymbolKind`; unknown kinds read as `Symbol`. */
export function symbolKindLabel(kind: number | undefined): string {
  return (kind !== undefined && SYMBOL_KIND_LABELS[kind]) || 'Symbol';
}

const FALLBACK_RANGE: MonacoRange = {
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 1,
};

function mapEntry(item: unknown): WorkspaceSymbolEntry | null {
  if (!item || typeof item !== 'object') return null;
  const symbol = item as {
    name?: unknown;
    kind?: number;
    containerName?: unknown;
    location?: { uri?: unknown; range?: LspRange };
  };
  if (typeof symbol.name !== 'string' || typeof symbol.location?.uri !== 'string') return null;
  return {
    name: symbol.name,
    kindLabel: symbolKindLabel(symbol.kind),
    containerName: typeof symbol.containerName === 'string' ? symbol.containerName : '',
    path: uriToFilePath(symbol.location.uri),
    // WorkspaceSymbol may carry a location without a range (resolve deferred).
    range: symbol.location.range ? lspRangeToMonaco(symbol.location.range) : FALLBACK_RANGE,
  };
}

/** LSP `workspace/symbol` result → display entries (malformed items skipped). */
export function workspaceSymbolsToEntries(result: unknown): WorkspaceSymbolEntry[] {
  if (!Array.isArray(result)) return [];
  return result.map(mapEntry).filter((entry): entry is WorkspaceSymbolEntry => entry !== null);
}
