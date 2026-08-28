/** Pure helpers for the ProblemsPanel (separate file for react-refresh compliance) */
import type { Diagnostic } from '../../services/tasks/types';

export type SeverityFilter = 'all' | 'error' | 'warning';

export function filterDiagnostics(diagnostics: Diagnostic[], filter: SeverityFilter): Diagnostic[] {
  if (filter === 'all') return diagnostics;
  return diagnostics.filter(diagnostic => diagnostic.severity === filter);
}
