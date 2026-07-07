/**
 * Pure mappers between Monaco provider shapes and LSP request params/results for
 * navigation (hover / definition / documentSymbol). No Monaco value import —
 * returns plain objects matching Monaco's interfaces so the module stays
 * dependency-free and 100% unit-testable.
 */

export interface LspPosition {
  line: number;
  character: number;
}

export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

/** Monaco `Position` (1-based). */
export interface MonacoPosition {
  lineNumber: number;
  column: number;
}

/** Monaco `IRange` (1-based). */
export interface MonacoRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface MonacoMarkdownString {
  value: string;
}

export interface MonacoHover {
  contents: MonacoMarkdownString[];
  range?: MonacoRange;
}

export interface DefinitionTarget {
  uri: string;
  range: LspRange;
}

export interface MonacoDocumentSymbol {
  name: string;
  detail: string;
  kind: number;
  tags: never[];
  range: MonacoRange;
  selectionRange: MonacoRange;
  children?: MonacoDocumentSymbol[];
}

/** Monaco 1-based position → LSP 0-based position. */
export function toLspPosition(position: MonacoPosition): LspPosition {
  return { line: position.lineNumber - 1, character: position.column - 1 };
}

/** Build `textDocument/*` request params for a position. */
export function positionParams(
  uri: string,
  position: MonacoPosition
): { textDocument: { uri: string }; position: LspPosition } {
  return { textDocument: { uri }, position: toLspPosition(position) };
}

/** LSP range (0-based) → Monaco `IRange` (1-based). */
export function lspRangeToMonaco(range: LspRange): MonacoRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

function normalizeHoverContents(contents: unknown): MonacoMarkdownString[] {
  if (contents == null) return [];
  if (typeof contents === 'string') return contents ? [{ value: contents }] : [];
  if (Array.isArray(contents)) return contents.flatMap(entry => normalizeHoverContents(entry));
  const marked = contents as { value?: string; language?: string };
  if (typeof marked.value === 'string' && marked.value) {
    // MarkedString `{language,value}` → fenced code; MarkupContent `{kind,value}` → as-is.
    const value = marked.language
      ? `\`\`\`${marked.language}\n${marked.value}\n\`\`\``
      : marked.value;
    return [{ value }];
  }
  return [];
}

/** LSP `Hover` → Monaco `Hover` (null when there is nothing to show). */
export function hoverToMonaco(result: unknown): MonacoHover | null {
  if (!result || typeof result !== 'object') return null;
  const hover = result as { contents?: unknown; range?: LspRange };
  const contents = normalizeHoverContents(hover.contents);
  if (contents.length === 0) return null;
  const monaco: MonacoHover = { contents };
  if (hover.range) monaco.range = lspRangeToMonaco(hover.range);
  return monaco;
}

/** Normalize an LSP definition result (Location | Location[] | LocationLink[]). */
export function definitionTargets(result: unknown): DefinitionTarget[] {
  if (!result) return [];
  const items = Array.isArray(result) ? result : [result];
  const targets: DefinitionTarget[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const loc = item as {
      uri?: string;
      range?: LspRange;
      targetUri?: string;
      targetRange?: LspRange;
      targetSelectionRange?: LspRange;
    };
    if (typeof loc.uri === 'string' && loc.range) {
      targets.push({ uri: loc.uri, range: loc.range });
    } else if (typeof loc.targetUri === 'string') {
      const range = loc.targetSelectionRange ?? loc.targetRange;
      if (range) targets.push({ uri: loc.targetUri, range });
    }
  }
  return targets;
}

function mapSymbol(item: unknown): MonacoDocumentSymbol | null {
  if (!item || typeof item !== 'object') return null;
  const symbol = item as {
    name?: string;
    detail?: string;
    kind?: number;
    range?: LspRange;
    selectionRange?: LspRange;
    location?: { range: LspRange };
    children?: unknown[];
  };
  if (typeof symbol.name !== 'string' || typeof symbol.kind !== 'number') return null;
  const range = symbol.range ?? symbol.location?.range;
  if (!range) return null;
  const monaco: MonacoDocumentSymbol = {
    name: symbol.name,
    detail: symbol.detail ?? '',
    kind: Math.max(0, symbol.kind - 1), // LSP SymbolKind (1-based) → Monaco (0-based)
    tags: [],
    range: lspRangeToMonaco(range),
    selectionRange: lspRangeToMonaco(symbol.selectionRange ?? range),
  };
  if (Array.isArray(symbol.children) && symbol.children.length > 0) {
    monaco.children = symbol.children
      .map(mapSymbol)
      .filter((child): child is MonacoDocumentSymbol => child !== null);
  }
  return monaco;
}

/** LSP `DocumentSymbol[]` (hierarchical) or `SymbolInformation[]` (flat) → Monaco. */
export function documentSymbolsToMonaco(result: unknown): MonacoDocumentSymbol[] {
  if (!Array.isArray(result)) return [];
  return result.map(mapSymbol).filter((symbol): symbol is MonacoDocumentSymbol => symbol !== null);
}

export interface MonacoCompletionItem {
  label: string;
  kind: number;
  insertText: string;
  detail?: string;
  documentation?: string;
  range: MonacoRange;
}

export interface MonacoCompletionList {
  suggestions: MonacoCompletionItem[];
}

interface LspCompletionItem {
  label?: string;
  kind?: number;
  insertText?: string;
  detail?: string;
  documentation?: string | { value?: string };
  textEdit?: { range?: LspRange; newText?: string };
}

// LSP CompletionItemKind (1-based, its own ordering) → Monaco CompletionItemKind.
const COMPLETION_KIND: Record<number, number> = {
  1: 18,
  2: 0,
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 7,
  9: 8,
  10: 9,
  11: 12,
  12: 13,
  13: 15,
  14: 17,
  15: 25,
  16: 19,
  17: 20,
  18: 21,
  19: 23,
  20: 16,
  21: 14,
  22: 6,
  23: 10,
  24: 11,
  25: 24,
};

function completionKind(kind: number | undefined): number {
  // Unknown/absent kind → Monaco Text (18).
  return kind !== undefined && kind in COMPLETION_KIND ? COMPLETION_KIND[kind]! : 18;
}

/** LSP documentation (`string` or `MarkupContent`) → plain string (shared with signatureHelp). */
export function documentationString(
  doc: string | { value?: string } | undefined
): string | undefined {
  if (typeof doc === 'string') return doc || undefined;
  if (doc && typeof doc.value === 'string') return doc.value || undefined;
  return undefined;
}

function mapCompletionItem(item: unknown, defaultRange: MonacoRange): MonacoCompletionItem | null {
  if (!item || typeof item !== 'object') return null;
  const entry = item as LspCompletionItem;
  if (typeof entry.label !== 'string') return null;
  const range = entry.textEdit?.range ? lspRangeToMonaco(entry.textEdit.range) : defaultRange;
  const insertText = entry.textEdit?.newText ?? entry.insertText ?? entry.label;
  const suggestion: MonacoCompletionItem = {
    label: entry.label,
    kind: completionKind(entry.kind),
    insertText,
    range,
  };
  if (entry.detail) suggestion.detail = entry.detail;
  const documentation = documentationString(entry.documentation);
  if (documentation) suggestion.documentation = documentation;
  return suggestion;
}

/**
 * LSP `CompletionItem[]` or `CompletionList` → Monaco `CompletionList`. `defaultRange`
 * (the word range at the cursor) is used for items without an explicit textEdit.
 */
export function completionToMonaco(
  result: unknown,
  defaultRange: MonacoRange
): MonacoCompletionList {
  let items: unknown[] = [];
  if (Array.isArray(result)) items = result;
  else if (
    result &&
    typeof result === 'object' &&
    Array.isArray((result as { items?: unknown[] }).items)
  ) {
    items = (result as { items: unknown[] }).items;
  }
  const suggestions = items
    .map(item => mapCompletionItem(item, defaultRange))
    .filter((item): item is MonacoCompletionItem => item !== null);
  return { suggestions };
}
