/**
 * Convert app `Diagnostic[]` into Monaco marker data for
 * `monaco.editor.setModelMarkers(model, 'lsp', …)`. Kept pure (no monaco value
 * import) by using Monaco's numeric `MarkerSeverity` values directly:
 * Error=8, Warning=4, Info=2.
 */

import type { Diagnostic, DiagnosticSeverity } from '../tasks/types';

/** Owner string for LSP markers — distinct from ErrorDetector/AutoFix owners. */
export const LSP_MARKER_OWNER = 'lsp';

const SEVERITY_TO_MARKER: Record<DiagnosticSeverity, number> = {
  error: 8,
  warning: 4,
  info: 2,
};

export interface LspMarker {
  severity: number;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  code?: string;
  source: string;
}

/** Map diagnostics to Monaco `IMarkerData`-compatible objects. */
export function toMarkers(diagnostics: Diagnostic[]): LspMarker[] {
  return diagnostics.map(diagnostic => ({
    severity: SEVERITY_TO_MARKER[diagnostic.severity],
    message: diagnostic.message,
    startLineNumber: diagnostic.line,
    startColumn: diagnostic.column,
    endLineNumber: diagnostic.line,
    endColumn: diagnostic.column + 1,
    code: diagnostic.code,
    source: diagnostic.source,
  }));
}
