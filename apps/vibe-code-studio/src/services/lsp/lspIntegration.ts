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
import { useEditorStore } from '../../stores/useEditorStore';
import { isSupportedLanguage } from './languageServerRegistry';
import {
  createLspClient,
  type LspClient,
  type LspClientCallbacks,
  type WebSocketFactory,
} from './lspClient';
import type { MonacoRange } from './lspNavigation';
import {
  registerLspProviders,
  type LspMonaco,
  type LspProviderDeps,
  type MonacoDisposable,
} from './lspProviders';

const clients = new Map<string, LspClient>();
const openDocs = new Map<string, Set<string>>();
const providerDisposables = new Map<string, MonacoDisposable>();
let socketFactory: WebSocketFactory | null = null;
let openLocationFn: ((path: string, range: MonacoRange) => void) | null = null;

/**
 * Install the cross-file opener (the app's open-file-at-position handler) once
 * at startup. Definition/reference providers use it to jump to other files.
 */
export function initLspOpenLocation(fn: (path: string, range: MonacoRange) => void): void {
  openLocationFn = fn;
}

/** deps.openLocation — forwards to the installed opener (no-op until installed). */
export function invokeOpenLocation(path: string, range: MonacoRange): void {
  openLocationFn?.(path, range);
}

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

/** Path of the file backing the active model (single-editor app → currentFile). */
export function activeDocumentPath(): string | null {
  return useEditorStore.getState().currentFile?.path ?? null;
}

/**
 * Register Phase 1b navigation providers (hover / definition / documentSymbol)
 * once per language. No-op if already registered or if no client is available
 * (LSP off / unsupported language) — leaving Monaco's built-ins in place.
 */
export function ensureLspProviders(
  monaco: LspMonaco,
  languageId: string,
  workspaceRoot: string | null
): void {
  if (providerDisposables.has(languageId)) return;
  const client = getLspClient(languageId, workspaceRoot);
  if (!client) return;
  const deps: LspProviderDeps = {
    getActivePath: activeDocumentPath,
    openLocation: invokeOpenLocation,
  };
  providerDisposables.set(languageId, registerLspProviders(monaco, languageId, client, deps));
}

/** Dispose every live client + provider (e.g. on workspace change / teardown). */
export function disposeLspClients(): void {
  for (const client of clients.values()) client.dispose();
  for (const disposable of providerDisposables.values()) disposable.dispose();
  clients.clear();
  openDocs.clear();
  providerDisposables.clear();
}

/** Test seam: reset the singleton maps + factory. */
export function resetLspForTests(): void {
  clients.clear();
  openDocs.clear();
  providerDisposables.clear();
  socketFactory = null;
  openLocationFn = null;
}
