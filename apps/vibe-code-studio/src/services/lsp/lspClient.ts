/**
 * Hand-rolled thin LSP client (spec 07). Speaks LSP JSON-RPC over an injected
 * WebSocket-like transport (the backend relay frames it to the real server),
 * routes `publishDiagnostics` into injected callbacks, and never imports the
 * store directly (mirrors `taskRunnerIntegration.ts` for testability).
 *
 * Deliberately NOT `monaco-languageclient`: its v10+ requires
 * `@codingame/monaco-vscode-editor-api` to replace `monaco-editor`, which
 * collides with the eager `loader.config`, `@monaco-editor/react`, shiki,
 * monacopilot and y-monaco already in this app.
 */

import type { Diagnostic } from '../tasks/types';
import { adaptDiagnostics, type PublishDiagnosticsParams } from './diagnosticsAdapter';
import { extractCapabilities } from './lspCapabilities';
import { createJsonRpc } from './jsonRpc';
import { wsUrl } from './languageServerRegistry';
import { filePathToUri, uriToFilePath } from './uri';

export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  onopen: ((ev?: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export interface LspClientCallbacks {
  onDiagnostics: (sourceKey: string, diagnostics: Diagnostic[]) => void;
  clearDiagnostics: (sourceKey: string) => void;
  onFallback?: () => void;
}

export interface DocumentInfo {
  path: string;
  text: string;
  version?: number;
}

export interface LspClient {
  didOpen: (doc: DocumentInfo) => void;
  didChange: (doc: DocumentInfo) => void;
  didClose: (path: string) => void;
  /** Send an LSP request; resolves after `initialize`, rejects if the relay dies. */
  request: (method: string, params?: unknown) => Promise<unknown>;
  /** Server capabilities from the `initialize` result (null until the handshake). */
  getCapabilities: () => unknown;
  dispose: () => void;
}

export interface LspClientOptions {
  languageId: string;
  workspaceRoot: string | null;
  callbacks: LspClientCallbacks;
  createSocket: WebSocketFactory;
  port?: number;
}

/** Diagnostics store key for a file (per-file so replacement is isolated). */
export function diagnosticsKey(filePath: string): string {
  return `lsp:${filePath}`;
}

/** LSP `initialize` params carrying the workspace root (needed for cross-file). */
export function buildInitializeParams(workspaceRoot: string | null): Record<string, unknown> {
  const rootUri = workspaceRoot ? filePathToUri(workspaceRoot) : null;
  return {
    processId: null,
    rootUri,
    capabilities: { textDocument: { publishDiagnostics: {} } },
    workspaceFolders: rootUri ? [{ uri: rootUri, name: 'workspace' }] : null,
  };
}

function routeNotification(method: string, params: unknown, callbacks: LspClientCallbacks): void {
  if (method !== 'textDocument/publishDiagnostics') return;
  const payload = params as PublishDiagnosticsParams;
  const key = diagnosticsKey(uriToFilePath(payload.uri));
  const diagnostics = adaptDiagnostics(payload);
  if (diagnostics.length > 0) callbacks.onDiagnostics(key, diagnostics);
  else callbacks.clearDiagnostics(key);
}

export function createLspClient(options: LspClientOptions): LspClient {
  const { languageId, workspaceRoot, callbacks, createSocket, port } = options;
  const socket = createSocket(wsUrl(languageId, port));
  const rpc = createJsonRpc({ send: data => socket.send(data) }, (method, params) =>
    routeNotification(method, params, callbacks)
  );

  const lifecycle = wireLifecycle(socket, rpc, workspaceRoot, callbacks);

  return {
    ...createDocumentMethods(rpc, languageId, lifecycle.enqueue, callbacks),
    request: (method, params) => lifecycle.ready.then(() => rpc.sendRequest(method, params)),
    getCapabilities: lifecycle.getCapabilities,
    dispose: () => socket.close(),
  };
}

/**
 * Wire the socket lifecycle. Returns a `ready` promise (resolves after the
 * initialize handshake, rejects if the socket closes/errors first), an
 * `enqueue` that defers document notifications until ready, and the server
 * capabilities captured from the `initialize` result.
 */
function wireLifecycle(
  socket: WebSocketLike,
  rpc: ReturnType<typeof createJsonRpc>,
  workspaceRoot: string | null,
  callbacks: LspClientCallbacks
): {
  ready: Promise<void>;
  enqueue: (fn: () => void) => void;
  getCapabilities: () => unknown;
} {
  let isReady = false;
  let capabilities: unknown = null;
  const queue: Array<() => void> = [];
  const enqueue = (fn: () => void): void => {
    if (isReady) fn();
    else queue.push(fn);
  };

  let resolveReady!: () => void;
  let rejectReady!: (reason: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {}); // no-op: prevents an unhandled rejection when no request awaits

  socket.onopen = () => {
    void rpc.sendRequest('initialize', buildInitializeParams(workspaceRoot)).then(result => {
      capabilities = extractCapabilities(result);
      rpc.sendNotification('initialized', {});
      isReady = true;
      for (const fn of queue.splice(0)) fn();
      resolveReady();
    });
  };
  socket.onmessage = ev => rpc.handleMessage(ev.data);
  socket.onclose = () => {
    rejectReady(new Error('lsp socket closed'));
    callbacks.onFallback?.();
  };
  socket.onerror = () => {
    rejectReady(new Error('lsp socket error'));
    callbacks.onFallback?.();
  };

  return { ready, enqueue, getCapabilities: () => capabilities };
}

/** The document-lifecycle notification methods (`didOpen`/`didChange`/`didClose`). */
function createDocumentMethods(
  rpc: ReturnType<typeof createJsonRpc>,
  languageId: string,
  enqueue: (fn: () => void) => void,
  callbacks: LspClientCallbacks
): Pick<LspClient, 'didOpen' | 'didChange' | 'didClose'> {
  return {
    didOpen: doc =>
      enqueue(() =>
        rpc.sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: filePathToUri(doc.path),
            languageId,
            version: doc.version ?? 1,
            text: doc.text,
          },
        })
      ),
    didChange: doc =>
      enqueue(() =>
        rpc.sendNotification('textDocument/didChange', {
          textDocument: { uri: filePathToUri(doc.path), version: doc.version ?? 1 },
          contentChanges: [{ text: doc.text }],
        })
      ),
    didClose: path => {
      enqueue(() =>
        rpc.sendNotification('textDocument/didClose', {
          textDocument: { uri: filePathToUri(path) },
        })
      );
      callbacks.clearDiagnostics(diagnosticsKey(path));
    },
  };
}
