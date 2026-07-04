import { describe, it, expect, beforeEach } from 'vitest';

import {
  disposeLspClients,
  getLspClient,
  initLspSocketFactory,
  notifyDocumentOpen,
  resetLspForTests,
} from '../../../services/lsp/lspIntegration';
import { useProblemsStore } from '../../../stores/problemsStore';
import { MockWebSocket } from '../../utils/MockWebSocket';

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
