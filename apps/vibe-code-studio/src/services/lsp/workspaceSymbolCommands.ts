/**
 * Workspace-symbol palette commands (spec 07 AC #6). The command palette's `#`
 * symbol mode (Ctrl+T) calls `queryWorkspaceSymbolCommands` on each keystroke;
 * results become palette entries whose action jumps to the symbol via the
 * app's installed open-location handler (same path as go-to-definition).
 */

import { invokeOpenLocation, searchWorkspaceSymbols } from './lspIntegration';
import type { WorkspaceSymbolEntry } from './workspaceSymbols';

/** The palette command shape (structural subset of CommandPalette's Command). */
export interface SymbolPaletteCommand {
  id: string;
  title: string;
  description?: string;
  category?: string;
  action: () => void;
}

/** Cap the palette list — servers can return thousands of matches. */
export const MAX_SYMBOL_RESULTS = 50;

/** One palette entry for a workspace symbol. */
export function symbolToCommand(entry: WorkspaceSymbolEntry, index: number): SymbolPaletteCommand {
  return {
    id: `lsp-symbol-${index}-${entry.name}`,
    title: entry.containerName ? `${entry.name} — ${entry.containerName}` : entry.name,
    description: `${entry.kindLabel} · ${entry.path}:${entry.range.startLineNumber}`,
    category: 'Workspace Symbols',
    action: () => invokeOpenLocation(entry.path, entry.range),
  };
}

/**
 * Run a workspace-symbol search and map the hits to palette commands. An empty
 * query returns no entries (LSP servers treat '' as "everything" — too noisy
 * for a live palette).
 */
export async function queryWorkspaceSymbolCommands(query: string): Promise<SymbolPaletteCommand[]> {
  if (!query) return [];
  const entries = await searchWorkspaceSymbols(query);
  return entries.slice(0, MAX_SYMBOL_RESULTS).map(symbolToCommand);
}
