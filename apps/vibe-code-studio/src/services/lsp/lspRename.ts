/**
 * Pure mappers from an LSP `WorkspaceEdit` (the `textDocument/rename` result)
 * to the app's multi-file edit shape (spec 07 Phase 1d). The rename provider
 * routes results through the existing MultiFileEditApprovalPanel preview/apply
 * flow, so this module never writes files itself. No Monaco/DOM imports —
 * fully unit-testable (same contract as `lspNavigation.ts`).
 */

import type { FileChange, MultiFileEditPlan } from '@vibetech/types';

import type { LspPosition, LspRange } from './lspNavigation';
import { uriToFilePath } from './uri';

export interface LspTextEdit {
  range: LspRange;
  newText: string;
}

/** All text edits a rename produces for one file (paths are Windows paths). */
export interface RenameFileEdits {
  path: string;
  edits: LspTextEdit[];
}

function isLspPosition(value: unknown): value is LspPosition {
  if (!value || typeof value !== 'object') return false;
  const position = value as { line?: unknown; character?: unknown };
  return typeof position.line === 'number' && typeof position.character === 'number';
}

function isTextEdit(value: unknown): value is LspTextEdit {
  if (!value || typeof value !== 'object') return false;
  const edit = value as { range?: { start?: unknown; end?: unknown }; newText?: unknown };
  return (
    typeof edit.newText === 'string' &&
    isLspPosition(edit.range?.start) &&
    isLspPosition(edit.range?.end)
  );
}

/**
 * Normalize an LSP `WorkspaceEdit` (`changes` map or `documentChanges` list)
 * into per-file edit groups. `documentChanges` wins when both are present (LSP
 * spec preference); resource operations (`kind`: create/rename/delete file) and
 * malformed entries are skipped — a symbol rename only produces text edits.
 */
export function workspaceEditToFileEdits(result: unknown): RenameFileEdits[] {
  if (!result || typeof result !== 'object') return [];
  const workspaceEdit = result as { changes?: unknown; documentChanges?: unknown };
  const byPath = new Map<string, LspTextEdit[]>();
  const add = (uri: string, edits: unknown): void => {
    if (!Array.isArray(edits)) return;
    const valid = edits.filter(isTextEdit);
    if (valid.length === 0) return;
    const path = uriToFilePath(uri);
    const existing = byPath.get(path);
    if (existing) existing.push(...valid);
    else byPath.set(path, [...valid]);
  };
  if (Array.isArray(workspaceEdit.documentChanges)) {
    for (const item of workspaceEdit.documentChanges) {
      if (!item || typeof item !== 'object') continue;
      const docEdit = item as { kind?: string; textDocument?: { uri?: unknown }; edits?: unknown };
      if (docEdit.kind || typeof docEdit.textDocument?.uri !== 'string') continue;
      add(docEdit.textDocument.uri, docEdit.edits);
    }
  } else if (workspaceEdit.changes && typeof workspaceEdit.changes === 'object') {
    for (const [uri, edits] of Object.entries(workspaceEdit.changes)) add(uri, edits);
  }
  return [...byPath.entries()].map(([path, edits]) => ({ path, edits }));
}

/**
 * Apply LSP text edits (0-based line/character ranges) to a document string.
 * Edits are applied bottom-up so earlier offsets stay valid; out-of-range
 * positions clamp to the line/document end and inverted ranges are skipped.
 */
export function applyTextEdits(content: string, edits: LspTextEdit[]): string {
  if (edits.length === 0) return content;
  const lineStarts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') lineStarts.push(i + 1);
  }
  const toOffset = (position: LspPosition): number => {
    if (position.line < 0) return 0;
    if (position.line >= lineStarts.length) return content.length;
    const lineStart = lineStarts[position.line]!;
    const nextStart = lineStarts[position.line + 1];
    let lineEnd = nextStart === undefined ? content.length : nextStart - 1;
    if (lineEnd > lineStart && content[lineEnd - 1] === '\r') lineEnd -= 1;
    return Math.min(lineStart + Math.max(0, position.character), lineEnd);
  };
  const ordered = edits
    .map(edit => ({
      start: toOffset(edit.range.start),
      end: toOffset(edit.range.end),
      newText: edit.newText,
    }))
    .sort((a, b) => b.start - a.start || b.end - a.end);
  let result = content;
  for (const { start, end, newText } of ordered) {
    if (end < start) continue;
    result = result.slice(0, start) + newText + result.slice(end);
  }
  return result;
}

/** Minimal line-by-line diff string (the approval panel derives +/- stats from it). */
function lineDiff(original: string, modified: string): string {
  const before = original.split('\n');
  const after = modified.split('\n');
  const max = Math.max(before.length, after.length);
  let diff = '';
  for (let i = 0; i < max; i++) {
    const oldLine = before[i];
    const newLine = after[i];
    if (oldLine === newLine) continue;
    if (oldLine !== undefined) diff += `- ${oldLine}\n`;
    if (newLine !== undefined) diff += `+ ${newLine}\n`;
  }
  return diff;
}

/**
 * Read each affected file and turn its rename edits into the app's
 * `FileChange[]` + `MultiFileEditPlan` (the MultiFileEditApprovalPanel input).
 * Throws when a file cannot be read (a partial rename would corrupt the
 * workspace); returns null when the rename is a no-op everywhere.
 */
export async function renameEditsToPlan(
  newName: string,
  fileEdits: RenameFileEdits[],
  readFile: (path: string) => Promise<string | undefined>
): Promise<{ plan: MultiFileEditPlan; changes: FileChange[] } | null> {
  const changes: FileChange[] = [];
  for (const { path, edits } of fileEdits) {
    const originalContent = await readFile(path);
    if (originalContent === undefined) throw new Error(`Cannot read ${path}`);
    const newContent = applyTextEdits(originalContent, edits);
    if (newContent === originalContent) continue;
    changes.push({
      path,
      originalContent,
      newContent,
      diff: lineDiff(originalContent, newContent),
      changeType: 'modify',
      reason: `Rename to '${newName}'`,
    });
  }
  if (changes.length === 0) return null;
  const plan: MultiFileEditPlan = {
    id: `lsp-rename-${Date.now()}`,
    description: `Rename symbol to '${newName}' across ${changes.length} file(s)`,
    files: changes,
    dependencies: [],
    estimatedImpact: changes.length <= 2 ? 'low' : changes.length <= 5 ? 'medium' : 'high',
    createdAt: new Date(),
  };
  return { plan, changes };
}
