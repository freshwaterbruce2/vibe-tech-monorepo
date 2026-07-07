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
  diagnosticsKey,
  type LspClient,
  type LspClientCallbacks,
  type WebSocketFactory,
} from './lspClient';
import { LSP_MARKER_OWNER, toMarkers, type LspMarker } from './lspMarkers';
import type { MonacoRange } from './lspNavigation';
import type { RenameFileEdits } from './lspRename';
import {
  registerLspProviders,
  type LspMonaco,
  type LspProviderDeps,
  type MonacoDisposable,
} from './lspProviders';
import { workspaceSymbolsToEntries, type WorkspaceSymbolEntry } from './workspaceSymbols';

/** The Monaco namespace slice the marker sync needs (injected at editor mount). */
export interface LspMarkerMonaco {
  editor: {
    setModelMarkers: (model: unknown, owner: string, markers: LspMarker[]) => void;
  };
}

interface LspMarkerTarget {
  setModelMarkers: (model: unknown, owner: string, markers: LspMarker[]) => void;
  getModel: () => unknown;
}

const clients = new Map<string, LspClient>();
const openDocs = new Map<string, Set<string>>();
const providerDisposables = new Map<string, MonacoDisposable>();
let socketFactory: WebSocketFactory | null = null;
let openLocationFn: ((path: string, range: MonacoRange) => void) | null = null;
let renameRequestFn: ((newName: string, fileEdits: RenameFileEdits[]) => void) | null = null;
let readFileFn: ((path: string) => Promise<string | undefined>) | null = null;
let markerTarget: LspMarkerTarget | null = null;
let unsubscribeMarkers: (() => void) | null = null;

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

/**
 * Install the rename sink (spec 07 Phase 1d) once at startup: the app handler
 * that previews a rename WorkspaceEdit in the multi-file approval panel.
 */
export function initLspRenameRequest(
  fn: (newName: string, fileEdits: RenameFileEdits[]) => void
): void {
  renameRequestFn = fn;
}

/** deps.requestRename — forwards to the installed sink (no-op until installed). */
export function invokeRenameRequest(newName: string, fileEdits: RenameFileEdits[]): void {
  renameRequestFn?.(newName, fileEdits);
}

/** Install the socket factory (real `new WebSocket(url)`) once at startup. */
export function initLspSocketFactory(factory: WebSocketFactory): void {
  socketFactory = factory;
}

/**
 * Install the file reader (the app's FileSystemService) once at startup. The
 * reference provider uses it to build peek preview models for cross-file hits.
 */
export function initLspReadFile(fn: (path: string) => Promise<string | undefined>): void {
  readFileFn = fn;
}

/** deps.readFile — forwards to the installed reader (undefined until installed). */
export function invokeReadFile(path: string): Promise<string | undefined> {
  return readFileFn ? readFileFn(path) : Promise.resolve(undefined);
}

/**
 * Recompute Monaco markers (squiggles) for the active file from the problems
 * store and push them onto the mounted editor model. No-op until the editor
 * mount installs a marker target. Publishing an empty set clears markers, so
 * close/re-publish stay in sync with the diagnostics stream.
 */
export function refreshLspMarkers(): void {
  if (!markerTarget) return;
  const path = activeDocumentPath();
  const model = markerTarget.getModel();
  if (!path || !model) return;
  const diagnostics = useProblemsStore.getState().bySource[diagnosticsKey(path)] ?? [];
  markerTarget.setModelMarkers(model, LSP_MARKER_OWNER, toMarkers(diagnostics));
}

/**
 * Attach the Monaco marker sync (spec 07 polish, AC #7 squiggles). Called from
 * the editor mount with the live monaco instance + a getter for the mounted
 * model; the editor remounts per file switch, so each call replaces the model
 * getter and re-applies the current diagnostics. The problems-store
 * subscription is created once and re-renders markers on every LSP
 * publish/clear.
 */
export function attachLspMarkers(monaco: LspMarkerMonaco, getModel: () => unknown): void {
  markerTarget = {
    setModelMarkers: (model, owner, markers) =>
      monaco.editor.setModelMarkers(model, owner, markers),
    getModel,
  };
  unsubscribeMarkers ??= useProblemsStore.subscribe(
    state => state.bySource,
    () => refreshLspMarkers()
  );
  refreshLspMarkers();
}

/**
 * Query `workspace/symbol` across every live language client and merge the
 * results (spec 07 AC #6, the palette's `#` symbol search). A client whose
 * relay is down contributes nothing instead of failing the whole search.
 */
export async function searchWorkspaceSymbols(query: string): Promise<WorkspaceSymbolEntry[]> {
  const live = [...clients.values()];
  const results = await Promise.all(
    live.map(client => client.request('workspace/symbol', { query }).catch(() => null))
  );
  return results.flatMap(result => workspaceSymbolsToEntries(result));
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
    requestRename: invokeRenameRequest,
    readFile: invokeReadFile,
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
  renameRequestFn = null;
  readFileFn = null;
  markerTarget = null;
  unsubscribeMarkers?.();
  unsubscribeMarkers = null;
}
