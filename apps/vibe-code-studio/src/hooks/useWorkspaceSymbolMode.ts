/**
 * useWorkspaceSymbolMode — the command palette's `#` workspace-symbol mode
 * (spec 07 AC #6). Owns the Ctrl+T self-open state (so no host wiring is
 * needed to reach symbol search), and runs the live `workspace/symbol` query
 * while the palette search starts with `#`.
 */
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import {
  queryWorkspaceSymbolCommands,
  type SymbolPaletteCommand,
} from '../services/lsp/workspaceSymbolCommands';
import { isSymbolQuery, symbolQueryText } from '../services/lsp/workspaceSymbols';

export interface WorkspaceSymbolModeOptions {
  /** Host-controlled palette visibility (the classic commandPaletteOpen flag). */
  isOpen: boolean;
  /** Current palette search text. */
  search: string;
  /** Put the palette into symbol mode: seed `#`, reset selection, focus input. */
  enterSymbolMode: () => void;
  /** Live symbol provider; defaults to the LSP-backed workspace search. */
  onSymbolQuery?: (query: string) => Promise<SymbolPaletteCommand[]>;
}

export interface WorkspaceSymbolModeState {
  /** Palette visibility including the Ctrl+T self-open path. */
  open: boolean;
  /** True while the search text is a `#` symbol query. */
  symbolMode: boolean;
  /** Latest symbol results (empty outside symbol mode / on errors). */
  symbolResults: SymbolPaletteCommand[];
  /** True when the palette was opened via Ctrl+T (drives the `#` seed). */
  selfOpen: boolean;
  /** Clear the Ctrl+T self-open state (call from the palette's close path). */
  closeSelf: () => void;
}

/** The command fields the palette's client-side filter/grouping reads. */
export interface PaletteCommandLike {
  title: string;
  description?: string;
  category?: string;
  keywords?: string[];
}

/** The palette's classic substring filter (title/description/category/keywords). */
export function filterPaletteCommands<T extends PaletteCommandLike>(
  commands: T[],
  search: string
): T[] {
  const searchLower = search.toLowerCase();
  return commands.filter(
    cmd =>
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.category?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower))
  );
}

/** Group palette commands by category (insertion order, default `General`). */
export function groupPaletteCommands<T extends PaletteCommandLike>(
  commands: T[]
): Record<string, T[]> {
  return commands.reduce(
    (acc, cmd) => {
      const category = cmd.category ?? 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(cmd);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

const NO_RESULTS: SymbolPaletteCommand[] = [];

export function useWorkspaceSymbolMode(
  options: WorkspaceSymbolModeOptions
): WorkspaceSymbolModeState {
  const { isOpen, search, enterSymbolMode, onSymbolQuery = queryWorkspaceSymbolCommands } = options;
  const [selfOpen, setSelfOpen] = useState(false);
  const [queryResults, setQueryResults] = useState<SymbolPaletteCommand[]>(NO_RESULTS);
  const open = isOpen || selfOpen;
  const symbolMode = isSymbolQuery(search);

  // Ctrl+T: open straight into workspace-symbol mode (VS Code's Go to Symbol
  // in Workspace). enableOnFormTags lets it fire from Monaco's textarea.
  useHotkeys(
    'ctrl+t',
    e => {
      e.preventDefault();
      setSelfOpen(true);
      enterSymbolMode();
    },
    { enableOnFormTags: true },
    []
  );

  // Live workspace-symbol search while in `#` mode (stale responses dropped).
  // Outside symbol mode the results are DERIVED empty (no setState-in-effect).
  useEffect(() => {
    if (!open || !isSymbolQuery(search)) return;
    let stale = false;
    void onSymbolQuery(symbolQueryText(search))
      .then(results => {
        if (!stale) setQueryResults(results);
      })
      .catch(() => {
        if (!stale) setQueryResults(NO_RESULTS);
      });
    return () => {
      stale = true;
    };
  }, [open, search, onSymbolQuery]);

  return {
    open,
    symbolMode,
    symbolResults: open && symbolMode ? queryResults : NO_RESULTS,
    selfOpen,
    closeSelf: () => setSelfOpen(false),
  };
}
