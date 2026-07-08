import { describe, it, expect } from 'vitest';

import { filePathToUri, uriToFilePath } from '../../../services/lsp/uri';
import { mapSeverity, toOneBased } from '../../../services/lsp/severityMap';
import {
  isSupportedLanguage,
  wsUrl,
  LSP_BACKEND_PORT,
} from '../../../services/lsp/languageServerRegistry';
import { adaptDiagnostics } from '../../../services/lsp/diagnosticsAdapter';
import { toMarkers, LSP_MARKER_OWNER } from '../../../services/lsp/lspMarkers';

describe('uri', () => {
  it('converts a Windows path to a file URI (drive colon preserved, spaces encoded)', () => {
    expect(filePathToUri('C:\\Users\\x a.ts')).toBe('file:///C:/Users/x%20a.ts');
  });

  it('converts a file URI back to a Windows path', () => {
    expect(uriToFilePath('file:///C:/Users/x%20a.ts')).toBe('C:\\Users\\x a.ts');
  });

  it('round-trips', () => {
    const p = 'D:\\repo\\src\\index.ts';
    expect(uriToFilePath(filePathToUri(p))).toBe(p);
  });

  it('handles a non-drive absolute path', () => {
    expect(filePathToUri('/home/u/a.ts')).toBe('file:///home/u/a.ts');
    expect(uriToFilePath('file:///home/u/a.ts')).toBe('\\home\\u\\a.ts');
  });
});

describe('severityMap', () => {
  it('maps all LSP severities (Hint→info, omitted→error)', () => {
    expect(mapSeverity(1)).toBe('error');
    expect(mapSeverity(2)).toBe('warning');
    expect(mapSeverity(3)).toBe('info');
    expect(mapSeverity(4)).toBe('info');
    expect(mapSeverity(undefined)).toBe('error');
  });

  it('converts 0-based positions to 1-based', () => {
    expect(toOneBased({ line: 0, character: 0 })).toEqual({ line: 1, column: 1 });
    expect(toOneBased({ line: 4, character: 2 })).toEqual({ line: 5, column: 3 });
  });
});

describe('languageServerRegistry', () => {
  it('reports supported languages', () => {
    expect(isSupportedLanguage('typescript')).toBe(true);
    expect(isSupportedLanguage('rust')).toBe(true);
    expect(isSupportedLanguage('cobol')).toBe(false);
  });

  it('builds the relay ws url on the default and a custom port', () => {
    expect(wsUrl('typescript')).toBe(`ws://localhost:${LSP_BACKEND_PORT}/lsp/typescript`);
    expect(wsUrl('python', 6000)).toBe('ws://localhost:6000/lsp/python');
  });
});

describe('adaptDiagnostics', () => {
  it('maps LSP diagnostics to app Diagnostics with source lsp', () => {
    const result = adaptDiagnostics({
      uri: 'file:///C:/ws/a.ts',
      diagnostics: [
        {
          range: { start: { line: 2, character: 4 }, end: { line: 2, character: 9 } },
          severity: 1,
          message: 'Type error',
          code: 2345,
        },
      ],
    });
    expect(result).toEqual([
      {
        file: 'C:\\ws\\a.ts',
        line: 3,
        column: 5,
        severity: 'error',
        message: 'Type error',
        code: '2345',
        source: 'lsp',
      },
    ]);
  });

  it('leaves code undefined when absent and handles empty lists', () => {
    const [d] = adaptDiagnostics({
      uri: 'file:///C:/ws/b.ts',
      diagnostics: [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
          message: 'x',
        },
      ],
    });
    expect(d?.code).toBeUndefined();
    expect(adaptDiagnostics({ uri: 'file:///C:/ws/c.ts', diagnostics: [] })).toEqual([]);
  });
});

describe('toMarkers', () => {
  it('maps severities to Monaco marker severities (8/4/2)', () => {
    const markers = toMarkers([
      { file: 'a', line: 3, column: 5, severity: 'error', message: 'e', source: 'lsp' },
      { file: 'a', line: 1, column: 1, severity: 'warning', message: 'w', source: 'lsp' },
      { file: 'a', line: 2, column: 2, severity: 'info', message: 'i', source: 'lsp', code: 'C1' },
    ]);
    expect(markers.map(m => m.severity)).toEqual([8, 4, 2]);
    expect(markers[0]).toMatchObject({
      startLineNumber: 3,
      startColumn: 5,
      endLineNumber: 3,
      endColumn: 6,
      message: 'e',
    });
    expect(markers[2]?.code).toBe('C1');
  });

  it('exposes the lsp marker owner', () => {
    expect(LSP_MARKER_OWNER).toBe('lsp');
  });
});
