/**
 * Convert an LSP `textDocument/publishDiagnostics` payload into the app's
 * `Diagnostic[]` (the shape the Problems panel + markers consume).
 */

import type { Diagnostic } from '../tasks/types';
import { mapSeverity, toOneBased } from './severityMap';
import { uriToFilePath } from './uri';

export interface LspPosition {
  line: number;
  character: number;
}

export interface LspDiagnostic {
  range: { start: LspPosition; end: LspPosition };
  severity?: number;
  message: string;
  code?: string | number;
}

export interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: LspDiagnostic[];
}

/** LSP diagnostics for one document → app `Diagnostic[]` (source `'lsp'`). */
export function adaptDiagnostics(params: PublishDiagnosticsParams): Diagnostic[] {
  const file = uriToFilePath(params.uri);
  return params.diagnostics.map(diagnostic => {
    const { line, column } = toOneBased(diagnostic.range.start);
    return {
      file,
      line,
      column,
      severity: mapSeverity(diagnostic.severity),
      message: diagnostic.message,
      code: diagnostic.code === undefined ? undefined : String(diagnostic.code),
      source: 'lsp',
    };
  });
}
