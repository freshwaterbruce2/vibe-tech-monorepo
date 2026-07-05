/**
 * Problems store — shared diagnostics sink keyed by source (task label; later:
 * LSP per spec 07, debugger per spec 12). Read by the ProblemsPanel.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Diagnostic, DiagnosticSeverity } from '../services/tasks/types';

export interface ProblemsState {
  bySource: Record<string, Diagnostic[]>;
  panelOpen: boolean;
  actions: {
    append: (source: string, diagnostics: Diagnostic[]) => void;
    clearSource: (source: string) => void;
    clearAll: () => void;
    setPanelOpen: (open: boolean) => void;
    togglePanel: () => void;
  };
}

type SetState = (fn: (state: ProblemsState) => void) => void;

const createActions = (set: SetState): ProblemsState['actions'] => ({
  append: (source, diagnostics) =>
    set(state => {
      const existing = state.bySource[source] ?? [];
      state.bySource[source] = [...existing, ...diagnostics];
    }),
  clearSource: source =>
    set(state => {
      delete state.bySource[source];
    }),
  clearAll: () =>
    set(state => {
      state.bySource = {};
    }),
  setPanelOpen: open =>
    set(state => {
      state.panelOpen = open;
    }),
  togglePanel: () =>
    set(state => {
      state.panelOpen = !state.panelOpen;
    }),
});

export const useProblemsStore = create<ProblemsState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        bySource: {},
        panelOpen: false,
        actions: createActions(set),
      }))
    ),
    { name: 'problems-store' }
  )
);

/** Flattens all sources into one list (pure; call inside useMemo in components) */
export function flattenDiagnostics(bySource: Record<string, Diagnostic[]>): Diagnostic[] {
  return Object.values(bySource).flat();
}

/** Groups diagnostics by file path, preserving insertion order */
export function groupByFile(diagnostics: Diagnostic[]): Map<string, Diagnostic[]> {
  const groups = new Map<string, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const existing = groups.get(diagnostic.file);
    if (existing) {
      existing.push(diagnostic);
    } else {
      groups.set(diagnostic.file, [diagnostic]);
    }
  }
  return groups;
}

/** Per-severity counts for badges/filters */
export function countBySeverity(diagnostics: Diagnostic[]): Record<DiagnosticSeverity, number> {
  const counts: Record<DiagnosticSeverity, number> = { error: 0, warning: 0, info: 0 };
  for (const diagnostic of diagnostics) counts[diagnostic.severity]++;
  return counts;
}

export const useProblemsActions = (): ProblemsState['actions'] =>
  useProblemsStore(state => state.actions);
