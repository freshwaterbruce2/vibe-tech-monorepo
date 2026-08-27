import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  activeDocumentPath,
  attachLspMarkers,
  disposeLspClients,
  ensureLspProviders,
  getLspClient,
  initLspOpenLocation,
  initLspReadFile,
  initLspRenameRequest,
  initLspSocketFactory,
  invokeOpenLocation,
  invokeReadFile,
  invokeRenameRequest,
  notifyDocumentOpen,
  refreshLspMarkers,
  resetLspForTests,
  searchWorkspaceSymbols,
} from '../../../services/lsp/lspIntegration';
import type { LspMonaco } from '../../../services/lsp/lspProviders';
import { useProblemsStore } from '../../../stores/problemsStore';
import { useEditorStore } from '../../../stores/useEditorStore';
import { MockWebSocket } from '../../utils/MockWebSocket';

function mockMonaco(): LspMonaco {
  return {
    Uri: { file: (path: string) => ({ __file: path }) },
    editor: {
      getModel: vi.fn(() => null),
      createModel: vi.fn(),
    },
    languages: {
      registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDocumentSymbolProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerReferenceProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerRenameProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerSignatureHelpProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };
}

const A_FILE = {
  id: '1',
  name: 'a.ts',
  path: 'C:\\ws\\a.ts',
  content: '',
  language: 'typescript',
  isModified: false,
};

function publishDiagnostic(ws: MockWebSocket, message = 'x'): void {
  ws.receive({
    jsonrpc: '2.0',
    method: 'textDocument/publishDiagnostics',
    params: {
      uri: 'file:///C:/ws/a.ts',
      diagnostics: [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
          severity: 1,
          message,
        },
      ],
    },
  });
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

  it('invokeRenameRequest forwards to the installed sink and no-ops when unset', () => {
    const fileEdits = [
      {
        path: 'C:\\ws\\b.ts',
        edits: [
          {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
            newText: 'bar',
          },
        ],
      },
    ];
    const sink = vi.fn();
    initLspRenameRequest(sink);
    invokeRenameRequest('bar', fileEdits);
    expect(sink).toHaveBeenCalledWith('bar', fileEdits);
    resetLspForTests(); // clears the sink
    expect(() => invokeRenameRequest('bar', fileEdits)).not.toThrow();
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

  it('invokeReadFile forwards to the installed reader and resolves undefined when unset', async () => {
    await expect(invokeReadFile('C:\\ws\\a.ts')).resolves.toBeUndefined();
    initLspReadFile(path => Promise.resolve(`content of ${path}`));
    await expect(invokeReadFile('C:\\ws\\a.ts')).resolves.toBe('content of C:\\ws\\a.ts');
  });
});

describe('lspIntegration — Monaco marker sync', () => {
  const editorModel = { uri: { __model: true } };

  afterEach(() => {
    useEditorStore.setState({ currentFile: null });
  });

  function attach() {
    const setModelMarkers = vi.fn();
    attachLspMarkers({ editor: { setModelMarkers } }, () => editorModel);
    return setModelMarkers;
  }

  it('pushes markers for the active file when diagnostics publish, and clears on re-publish', () => {
    useEditorStore.setState({ currentFile: A_FILE });
    initLspSocketFactory(url => new MockWebSocket(url));
    getLspClient('typescript', 'C:\\ws');
    const ws = MockWebSocket.last();
    const setModelMarkers = attach();
    setModelMarkers.mockClear(); // drop the attach-time refresh

    publishDiagnostic(ws, 'bad');
    expect(setModelMarkers).toHaveBeenCalledWith(editorModel, 'lsp', [
      expect.objectContaining({
        severity: 8,
        message: 'bad',
        startLineNumber: 1,
        startColumn: 1,
      }),
    ]);

    ws.receive({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri: 'file:///C:/ws/a.ts', diagnostics: [] },
    });
    expect(setModelMarkers).toHaveBeenLastCalledWith(editorModel, 'lsp', []);
  });

  it('applies existing diagnostics immediately on attach (file switch remount)', () => {
    useEditorStore.setState({ currentFile: A_FILE });
    useProblemsStore.getState().actions.setSource('lsp:C:\\ws\\a.ts', [
      {
        file: 'C:\\ws\\a.ts',
        line: 2,
        column: 3,
        severity: 'warning',
        message: 'w',
        source: 'lsp',
      },
    ]);
    const setModelMarkers = attach();
    expect(setModelMarkers).toHaveBeenCalledWith(editorModel, 'lsp', [
      expect.objectContaining({ severity: 4, startLineNumber: 2, startColumn: 3 }),
    ]);
  });

  it('no-ops without an attached target, an active file, or a mounted model', () => {
    expect(() => refreshLspMarkers()).not.toThrow(); // no target

    const setModelMarkers = vi.fn();
    attachLspMarkers({ editor: { setModelMarkers } }, () => editorModel);
    expect(setModelMarkers).not.toHaveBeenCalled(); // no active file at attach

    useEditorStore.setState({ currentFile: A_FILE });
    attachLspMarkers({ editor: { setModelMarkers } }, () => null);
    refreshLspMarkers();
    expect(setModelMarkers).not.toHaveBeenCalled(); // model not mounted
  });

  it('subscribes to the problems store once across re-attaches', () => {
    useEditorStore.setState({ currentFile: A_FILE });
    const first = vi.fn();
    const second = vi.fn();
    attachLspMarkers({ editor: { setModelMarkers: first } }, () => editorModel);
    attachLspMarkers({ editor: { setModelMarkers: second } }, () => editorModel);
    first.mockClear();
    second.mockClear();
    useProblemsStore
      .getState()
      .actions.setSource('lsp:C:\\ws\\a.ts', [
        { file: 'C:\\ws\\a.ts', line: 1, column: 1, severity: 'info', message: 'i', source: 'lsp' },
      ]);
    expect(first).not.toHaveBeenCalled(); // replaced by the second attach
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('lspIntegration — workspace symbol search', () => {
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  async function connectedClient(): Promise<MockWebSocket> {
    initLspSocketFactory(url => new MockWebSocket(url));
    getLspClient('typescript', 'C:\\ws');
    const ws = MockWebSocket.last();
    ws.open();
    ws.receive({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
    await flush();
    return ws;
  }

  it('returns [] when no clients are live', async () => {
    await expect(searchWorkspaceSymbols('foo')).resolves.toEqual([]);
  });

  it('queries live clients and maps the merged results', async () => {
    const ws = await connectedClient();
    const pending = searchWorkspaceSymbols('foo');
    await flush();
    const request = ws.sentMessages().find(message => message.method === 'workspace/symbol');
    expect(request?.params).toEqual({ query: 'foo' });
    ws.receive({
      jsonrpc: '2.0',
      id: request?.id,
      result: [
        {
          name: 'fooBar',
          kind: 12,
          location: {
            uri: 'file:///C:/ws/b.ts',
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } },
          },
        },
      ],
    });
    await expect(pending).resolves.toEqual([
      expect.objectContaining({ name: 'fooBar', kindLabel: 'Function', path: 'C:\\ws\\b.ts' }),
    ]);
  });

  it('a dead relay contributes nothing instead of failing the search', async () => {
    initLspSocketFactory(url => new MockWebSocket(url));
    getLspClient('typescript', 'C:\\ws');
    const pending = searchWorkspaceSymbols('foo');
    MockWebSocket.last().close(); // request rejects (socket closed before ready)
    await expect(pending).resolves.toEqual([]);
  });
});
