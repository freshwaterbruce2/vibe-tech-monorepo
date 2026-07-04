import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  buildInitializeParams,
  createLspClient,
  diagnosticsKey,
  type LspClientCallbacks,
} from '../../../services/lsp/lspClient';
import { MockWebSocket } from '../../utils/MockWebSocket';

function makeCallbacks(): LspClientCallbacks & {
  onDiagnostics: ReturnType<typeof vi.fn>;
  clearDiagnostics: ReturnType<typeof vi.fn>;
  onFallback: ReturnType<typeof vi.fn>;
} {
  return {
    onDiagnostics: vi.fn(),
    clearDiagnostics: vi.fn(),
    onFallback: vi.fn(),
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

/** Create a client, drive the initialize handshake, return {client, ws, callbacks}. */
async function connected(workspaceRoot: string | null = 'C:\\ws') {
  const callbacks = makeCallbacks();
  const client = createLspClient({
    languageId: 'typescript',
    workspaceRoot,
    callbacks,
    createSocket: url => new MockWebSocket(url),
  });
  const ws = MockWebSocket.last();
  ws.open();
  ws.receive({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
  await flush();
  return { client, ws, callbacks };
}

describe('buildInitializeParams', () => {
  it('carries a rootUri + workspaceFolders when a workspace root is set', () => {
    const params = buildInitializeParams('C:\\ws');
    expect(params.rootUri).toBe('file:///C:/ws');
    expect(params.workspaceFolders).toEqual([{ uri: 'file:///C:/ws', name: 'workspace' }]);
  });

  it('uses null root when no workspace is open', () => {
    const params = buildInitializeParams(null);
    expect(params.rootUri).toBeNull();
    expect(params.workspaceFolders).toBeNull();
  });
});

describe('diagnosticsKey', () => {
  it('namespaces per file', () => {
    expect(diagnosticsKey('C:\\ws\\a.ts')).toBe('lsp:C:\\ws\\a.ts');
  });
});

describe('createLspClient', () => {
  beforeEach(() => MockWebSocket.reset());

  it('connects to the language relay url', () => {
    createLspClient({
      languageId: 'python',
      workspaceRoot: null,
      callbacks: makeCallbacks(),
      createSocket: url => new MockWebSocket(url),
    });
    expect(MockWebSocket.last().url).toBe('ws://localhost:5004/lsp/python');
  });

  it('sends initialize then initialized on open, and flushes queued didOpen', async () => {
    const { ws } = await connected();
    // didOpen issued before ready should have been queued and flushed.
    MockWebSocket.reset();
    const { ws: ws2, client } = await connected();
    client.didOpen({ path: 'C:\\ws\\a.ts', text: 'const x=1' });
    const methods = ws2.sentMethods();
    expect(ws.sentMethods()).toContain('initialize');
    expect(methods).toContain('initialized');
    expect(methods).toContain('textDocument/didOpen');
  });

  it('queues didOpen issued before initialize completes, then flushes it', async () => {
    const callbacks = makeCallbacks();
    const client = createLspClient({
      languageId: 'typescript',
      workspaceRoot: 'C:\\ws',
      callbacks,
      createSocket: url => new MockWebSocket(url),
    });
    const ws = MockWebSocket.last();
    client.didOpen({ path: 'C:\\ws\\a.ts', text: 'x' }); // queued (not ready)
    expect(ws.sentMethods()).not.toContain('textDocument/didOpen');
    ws.open();
    ws.receive({ jsonrpc: '2.0', id: 1, result: {} });
    await flush();
    expect(ws.sentMethods()).toContain('textDocument/didOpen');
  });

  it('routes publishDiagnostics to onDiagnostics with mapped data', async () => {
    const { ws, callbacks } = await connected();
    ws.receive({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: {
        uri: 'file:///C:/ws/a.ts',
        diagnostics: [
          {
            range: { start: { line: 0, character: 2 }, end: { line: 0, character: 5 } },
            severity: 1,
            message: 'bad',
          },
        ],
      },
    });
    expect(callbacks.onDiagnostics).toHaveBeenCalledWith('lsp:C:\\ws\\a.ts', [
      expect.objectContaining({ file: 'C:\\ws\\a.ts', line: 1, column: 3, severity: 'error' }),
    ]);
  });

  it('clears the source on an empty publishDiagnostics', async () => {
    const { ws, callbacks } = await connected();
    ws.receive({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri: 'file:///C:/ws/a.ts', diagnostics: [] },
    });
    expect(callbacks.clearDiagnostics).toHaveBeenCalledWith('lsp:C:\\ws\\a.ts');
  });

  it('ignores non-diagnostics notifications', async () => {
    const { ws, callbacks } = await connected();
    ws.receive({ jsonrpc: '2.0', method: 'window/logMessage', params: {} });
    expect(callbacks.onDiagnostics).not.toHaveBeenCalled();
    expect(callbacks.clearDiagnostics).not.toHaveBeenCalled();
  });

  it('sends didChange with the provided version', async () => {
    const { ws, client } = await connected();
    client.didChange({ path: 'C:\\ws\\a.ts', text: 'y', version: 7 });
    const change = ws.sentMessages().find(m => m.method === 'textDocument/didChange');
    expect(change?.params).toMatchObject({
      textDocument: { uri: 'file:///C:/ws/a.ts', version: 7 },
      contentChanges: [{ text: 'y' }],
    });
  });

  it('didClose sends the notification and clears diagnostics', async () => {
    const { ws, client, callbacks } = await connected();
    client.didClose('C:\\ws\\a.ts');
    expect(ws.sentMethods()).toContain('textDocument/didClose');
    expect(callbacks.clearDiagnostics).toHaveBeenCalledWith('lsp:C:\\ws\\a.ts');
  });

  it('fires the fallback on socket close and error', async () => {
    const { ws, callbacks } = await connected();
    ws.fireError();
    ws.close();
    expect(callbacks.onFallback).toHaveBeenCalledTimes(2);
  });

  it('tolerates a missing onFallback callback', () => {
    const client = createLspClient({
      languageId: 'typescript',
      workspaceRoot: null,
      callbacks: { onDiagnostics: vi.fn(), clearDiagnostics: vi.fn() },
      createSocket: url => new MockWebSocket(url),
    });
    expect(() => MockWebSocket.last().close()).not.toThrow();
    client.dispose();
  });

  it('dispose closes the socket', async () => {
    const { ws, client } = await connected();
    client.dispose();
    expect(ws.closed).toBe(true);
  });

  it('request resolves after initialize with the server result', async () => {
    const { ws, client } = await connected();
    const pending = client.request('textDocument/hover', { x: 1 });
    await flush();
    const req = ws.sentMessages().find(m => m.method === 'textDocument/hover');
    expect(req).toBeDefined();
    ws.receive({ jsonrpc: '2.0', id: req?.id, result: { contents: 'hi' } });
    await expect(pending).resolves.toEqual({ contents: 'hi' });
  });

  it('request rejects when the relay closes before ready', async () => {
    const client = createLspClient({
      languageId: 'typescript',
      workspaceRoot: null,
      callbacks: makeCallbacks(),
      createSocket: url => new MockWebSocket(url),
    });
    const pending = client.request('textDocument/hover', {});
    MockWebSocket.last().close();
    await expect(pending).rejects.toThrow('lsp socket closed');
  });
});
