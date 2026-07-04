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

  let ready = false;
  const queue: Array<() => void> = [];
  const enqueue = (fn: () => void): void => {
    if (ready) fn();
    else queue.push(fn);
  };

  socket.onopen = () => {
    void rpc.sendRequest('initialize', buildInitializeParams(workspaceRoot)).then(() => {
      rpc.sendNotification('initialized', {});
      ready = true;
      for (const fn of queue.splice(0)) fn();
    });
  };
  socket.onmessage = ev => rpc.handleMessage(ev.data);
  socket.onclose = () => callbacks.onFallback?.();
  socket.onerror = () => callbacks.onFallback?.();

  return {
    ...createDocumentMethods(rpc, languageId, enqueue, callbacks),
    dispose: () => socket.close(),
  };
}

/** The document-lifecycle notification methods (`didOpen`/`didChange`/`didClose`). */
function createDocumentMethods(
  rpc: ReturnType<typeof createJsonRpc>,
  languageId: string,
  enqueue: (fn: () => void) => void,
  callbacks: LspClientCallbacks
): Omit<LspClient, 'dispose'> {
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
