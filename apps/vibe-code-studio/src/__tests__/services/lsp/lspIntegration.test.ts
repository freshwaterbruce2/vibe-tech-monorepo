import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  activeDocumentPath,
  disposeLspClients,
  ensureLspProviders,
  getLspClient,
  initLspOpenLocation,
  initLspSocketFactory,
  invokeOpenLocation,
  notifyDocumentOpen,
  resetLspForTests,
} from '../../../services/lsp/lspIntegration';
import type { LspMonaco } from '../../../services/lsp/lspProviders';
import { useProblemsStore } from '../../../stores/problemsStore';
import { useEditorStore } from '../../../stores/useEditorStore';
import { MockWebSocket } from '../../utils/MockWebSocket';

function mockMonaco(): LspMonaco {
  return {
    Uri: { file: (path: string) => ({ __file: path }) },
    languages: {
      registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDocumentSymbolProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerReferenceProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };
}

const aRange = { startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 4 };

beforeEach(() => {
  resetLspForTests();
  MockWebSocket.reset();
  useProblemsStore.getState().actions.clearAll();
});

describe('lspIntegration', () => {
  it('returns null before the socket factory is initialized', () => {
    expect(getLspClient('typescript', 'C:\\ws')).toBeNull();
  });

  it('returns null for an unsupported language', () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    expect(getLspClient('cobol', null)).toBeNull();
  });

  it('creates and caches one client per languageId', () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    const first = getLspClient('typescript', 'C:\\ws');
    const second = getLspClient('typescript', 'C:\\ws');
    expect(first).toBe(second);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('routes diagnostics into the problems store (setSource / clearSource)', () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    getLspClient('typescript', 'C:\\ws');
    const ws = MockWebSocket.last();

    ws.receive({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: {
        uri: 'file:///C:/ws/a.ts',
        diagnostics: [
          {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            severity: 1,
            message: 'x',
          },
        ],
      },
    });
    expect(useProblemsStore.getState().bySource['lsp:C:\\ws\\a.ts']).toHaveLength(1);

    ws.receive({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri: 'file:///C:/ws/a.ts', diagnostics: [] },
    });
    expect(useProblemsStore.getState().bySource['lsp:C:\\ws\\a.ts']).toBeUndefined();
  });

  it('notifyDocumentOpen sends didOpen first, then didChange on re-activation', () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    notifyDocumentOpen('typescript', 'C:\\ws', { path: 'C:\\ws\\a.ts', text: 'v1' });
    const ws = MockWebSocket.last();
    ws.open();
    ws.receive({ jsonrpc: '2.0', id: 1, result: {} });
    // Flush the queued didOpen synchronously enough for assertions below.
    return Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => {
        notifyDocumentOpen('typescript', 'C:\\ws', { path: 'C:\\ws\\a.ts', text: 'v2' });
        expect(ws.sentMethods()).toContain('textDocument/didOpen');
        expect(ws.sentMethods()).toContain('textDocument/didChange');
      });
  });

  it('notifyDocumentOpen is a no-op for an unsupported language', () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    notifyDocumentOpen('cobol', null, { path: 'C:\\ws\\a.cbl', text: 'x' });
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('activeDocumentPath reflects the editor store currentFile', () => {
    expect(activeDocumentPath()).toBeNull();
    useEditorStore.setState({
      currentFile: {
        id: '1',
        name: 'a.ts',
        path: 'C:\\ws\\a.ts',
        content: '',
        language: 'typescript',
        isModified: false,
      },
    });
    expect(activeDocumentPath()).toBe('C:\\ws\\a.ts');
    useEditorStore.setState({ currentFile: null });
  });

  it('ensureLspProviders registers once per language and no-ops without a client', () => {
    const monaco = mockMonaco();
    // No factory yet → no client → no registration.
    ensureLspProviders(monaco, 'typescript', 'C:\\ws');
    expect(monaco.languages.registerHoverProvider).not.toHaveBeenCalled();

    initLspSocketFactory(url => new MockWebSocket(url));
    ensureLspProviders(monaco, 'typescript', 'C:\\ws');
    ensureLspProviders(monaco, 'typescript', 'C:\\ws'); // idempotent
    expect(monaco.languages.registerHoverProvider).toHaveBeenCalledTimes(1);
    expect(monaco.languages.registerDefinitionProvider).toHaveBeenCalledTimes(1);
    expect(monaco.languages.registerDocumentSymbolProvider).toHaveBeenCalledTimes(1);
  });

  it('invokeOpenLocation forwards to the installed opener and no-ops when unset', () => {
    const opener = vi.fn();
    initLspOpenLocation(opener);
    invokeOpenLocation('C:\\ws\\b.ts', aRange);
    expect(opener).toHaveBeenCalledWith('C:\\ws\\b.ts', aRange);
    resetLspForTests(); // clears the opener
    expect(() => invokeOpenLocation('C:\\ws\\c.ts', aRange)).not.toThrow();
  });

  it('disposeLspClients also disposes registered providers', () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    const monaco = mockMonaco();
    const disposeSpy = vi.fn();
    monaco.languages.registerHoverProvider = vi.fn(() => ({ dispose: disposeSpy }));
    ensureLspProviders(monaco, 'typescript', 'C:\\ws');
    disposeLspClients();
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('disposes clients and clears the cache', () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    getLspClient('typescript', null);
    const ws = MockWebSocket.last();
    disposeLspClients();
    expect(ws.closed).toBe(true);
    getLspClient('typescript', null);
    expect(MockWebSocket.instances).toHaveLength(2); // fresh client after dispose
  });
});
