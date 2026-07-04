/**
 * LSP integration — wires the hand-rolled LSP client to the app's problems
 * store, mirroring `taskRunnerIntegration.ts`. Clients are keyed by languageId
 * and persist across file switches (the editor remounts per file via
 * `key={file.path}`, but the client/providers are global and created once).
 *
 * The browser `WebSocket` factory is injected via `initLspSocketFactory` (called
 * once from the editor-mount wiring) so this module stays free of DOM globals
 * and fully unit-testable.
 */

import { useProblemsStore } from '../../stores/problemsStore';
import { isSupportedLanguage } from './languageServerRegistry';
import {
  createLspClient,
  type LspClient,
  type LspClientCallbacks,
  type WebSocketFactory,
} from './lspClient';

const clients = new Map<string, LspClient>();
const openDocs = new Map<string, Set<string>>();
let socketFactory: WebSocketFactory | null = null;

/** Install the socket factory (real `new WebSocket(url)`) once at startup. */
export function initLspSocketFactory(factory: WebSocketFactory): void {
  socketFactory = factory;
}

function storeCallbacks(): LspClientCallbacks {
  const actions = () => useProblemsStore.getState().actions;
  return {
    onDiagnostics: (key, diagnostics) => actions().setSource(key, diagnostics),
    clearDiagnostics: key => actions().clearSource(key),
  };
}

/**
 * Get (or lazily create) the language client for a languageId. Returns null when
 * LSP is not initialized yet or the language has no server — callers then leave
 * the editor on Monaco's built-in behavior.
 */
export function getLspClient(languageId: string, workspaceRoot: string | null): LspClient | null {
  if (!socketFactory || !isSupportedLanguage(languageId)) return null;
  let client = clients.get(languageId);
  if (!client) {
    client = createLspClient({
      languageId,
      workspaceRoot,
      callbacks: storeCallbacks(),
      createSocket: socketFactory,
    });
    clients.set(languageId, client);
  }
  return client;
}

/**
 * Tell the language server a document is active: `didOpen` the first time a path
 * is seen for its language, `didChange` on subsequent activations (the editor
 * remounts per file switch). No-op when the language has no server / LSP is off.
 */
export function notifyDocumentOpen(
  languageId: string,
  workspaceRoot: string | null,
  doc: { path: string; text: string }
): void {
  const client = getLspClient(languageId, workspaceRoot);
  if (!client) return;
  let opened = openDocs.get(languageId);
  if (!opened) {
    opened = new Set();
    openDocs.set(languageId, opened);
  }
  if (opened.has(doc.path)) {
    client.didChange({ path: doc.path, text: doc.text });
  } else {
    opened.add(doc.path);
    client.didOpen({ path: doc.path, text: doc.text });
  }
}

/** Dispose every live client (e.g. on workspace change / teardown). */
export function disposeLspClients(): void {
  for (const client of clients.values()) client.dispose();
  clients.clear();
  openDocs.clear();
}

/** Test seam: reset the singleton map + factory. */
export function resetLspForTests(): void {
  clients.clear();
  openDocs.clear();
  socketFactory = null;
}
