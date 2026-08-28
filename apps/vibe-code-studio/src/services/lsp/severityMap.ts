/**
 * Map LSP diagnostic severity + position onto the app's 3-value severity and
 * 1-based line/column convention (the task-runner `Diagnostic` shape).
 */

import type { DiagnosticSeverity } from '../tasks/types';

/**
 * LSP `DiagnosticSeverity`: 1=Error 2=Warning 3=Information 4=Hint. The app has
 * no Hint tier, so Hint collapses to `info`. An omitted severity defaults to
 * `error` (matching the LSP/VS Code default).
 */
export function mapSeverity(lspSeverity: number | undefined): DiagnosticSeverity {
  switch (lspSeverity) {
    case 2:
      return 'warning';
    case 3:
    case 4:
      return 'info';
    default:
      return 'error';
  }
}

/** LSP 0-based `Position` → app 1-based line/column. */
export function toOneBased(position: { line: number; character: number }): {
  line: number;
  column: number;
} {
  return { line: position.line + 1, column: position.character + 1 };
}
