# Feature Spec: LSP Client + Language Intelligence

**Status**: 📋 PLANNED (PARTIAL — Monaco provides single-file, heuristic IntelliSense only; no real Language Server Protocol connection exists anywhere in VCS)
**Priority**: HIGH
**Effort**: M–L — 1–2 weeks for Phase 1 (TS/Python/Rust wired via one server each), L for the generic registry + auto-download in Phase 2
**Competitor parity**: VS Code's built-in LSP client — the single biggest capability a VS Code fork inherits for free; VCS must build it deliberately since it is not a fork
**Dependencies**: `monaco-languageclient` (TypeFox, v10.x), `vscode-ws-jsonrpc`, `typescript-language-server`, `pyright`, `rust-analyzer`; existing `LazyMonaco.tsx`, `useEditorStore.ts`, Tauri sidecar infra (`tauri.conf.json` `externalBin`)

---

## User Story

As a developer working across a multi-file TypeScript/Python/Rust codebase, I want accurate cross-file go-to-definition, find-all-references, rename, hover, signature help, and live diagnostics, so that I get VS Code-grade navigation instead of Monaco's single-buffer guesswork.

## Why VCS lacks this today

Monaco's built-in TS/JS worker (and its Monarch tokenizers for other languages) only sees the buffers currently open in the editor and has no concept of a project — no `tsconfig.json`/`Cargo.toml`/`pyproject.toml` resolution, no cross-file symbol graph, no real diagnostics beyond syntax errors. Because VCS is a from-scratch Monaco integration and not a VS Code fork, it never inherited VS Code's LSP client; every capability listed above (definition, references, rename, hover, signatureHelp, documentSymbol, workspaceSymbol, publishDiagnostics) is currently absent for every language except what Monaco's bundled TS worker fakes for single files.

## Acceptance Criteria

1. ⬜ Go-to-definition (`Ctrl+Click` / `F12`) resolves across files in the open workspace for TS/JS, Python, and Rust.
2. ⬜ Find-all-references returns results from every file in the workspace, not just open tabs.
3. ⬜ Rename symbol performs a workspace-wide rename with a preview/apply step (reusing the existing multi-file diff/apply UI already shipped for AI multi-file edits).
4. ⬜ Hover shows type info + doc comments sourced from the real language server, not Monaco's heuristic hover.
5. ⬜ Signature help triggers on `(` and `,` with parameter highlighting for the active argument.
6. ⬜ Document symbols (outline) and workspace symbol search (`Ctrl+T`-style) are populated from `textDocument/documentSymbol` and `workspace/symbol`.
7. ⬜ `textDocument/publishDiagnostics` from each language server populates a shared Problems panel (co-owned with spec 02 Task Runner and spec 12 Debugger) with file/line/column/severity.
8. ⬜ Language servers run as Tauri sidecar processes (not in the webview, not via WASM) with stdio bridged to the browser-side language client.
9. ⬜ A language-server registry maps `languageId` → server command/args and is user-configurable via Settings (server path override, extra args).
10. ⬜ If a language server fails to start or crashes, the affected language falls back to Monaco's existing built-in worker/Monarch behavior rather than breaking the editor.

## Architecture / Solution

LSP is a stdio (or socket) JSON-RPC protocol; the servers themselves (`typescript-language-server`, `pyright`, `rust-analyzer`) are external processes that cannot run inside a browser webview. The bridge:

```
┌─────────────── Tauri Rust backend ───────────────┐
│  sidecar: typescript-language-server --stdio      │
│  sidecar: pyright-langserver --stdio               │
│  sidecar: rust-analyzer                            │
│         │ (stdio, spawned via tauri-plugin-shell)  │
│         ▼                                          │
│  local WebSocket bridge (127.0.0.1:<port>, 1/server)│
└─────────────────────┬───────────────────────────┘
                       │ ws://127.0.0.1:<port>
┌──────────────────────▼──────────────────────────┐
│  React webview                                    │
│  vscode-ws-jsonrpc  →  monaco-languageclient       │
│  registers capabilities on the Monaco model        │
└────────────────────────────────────────────────────┘
```

Rust side spawns each server via `@tauri-apps/plugin-shell`'s `Command.sidecar()` (or a raw `Command.create()` for system-installed servers like `rust-analyzer`), pipes stdio, and exposes a lightweight WebSocket relay per server so `vscode-ws-jsonrpc`'s `toSocket()`/`WebSocketMessageReader`/`WebSocketMessageWriter` can attach from the webview side — this avoids doing raw stdio bridging across the Tauri IPC boundary, which is not designed for the volume/latency profile of LSP traffic.

```ts
// src/services/lsp/LspClientFactory.ts (new)
import { MonacoLanguageClient } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { CloseAction, ErrorAction } from 'vscode-languageclient';

export async function createLanguageClient(languageId: string, wsPort: number) {
  const socket = new WebSocket(`ws://127.0.0.1:${wsPort}/${languageId}`);
  await new Promise(res => (socket.onopen = res));
  const wsSocket = toSocket(socket);
  const reader = new WebSocketMessageReader(wsSocket);
  const writer = new WebSocketMessageWriter(wsSocket);

  return new MonacoLanguageClient({
    name: `${languageId} Language Client`,
    clientOptions: {
      documentSelector: [languageId],
      errorHandler: {
        error: () => ({ action: ErrorAction.Continue }),
        closed: () => ({ action: CloseAction.DoNotRestart }), // fall back to Monaco worker
      },
    },
    messageTransports: { reader, writer },
  });
}
```

```rust
// src-tauri/src/lsp.rs (new)
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn start_language_server(app: tauri::AppHandle, language_id: String) -> Result<u16, String> {
    let (rx, child) = app
        .shell()
        .sidecar("typescript-language-server") // registry-resolved per language_id
        .map_err(|e| e.to_string())?
        .args(["--stdio"])
        .spawn()
        .map_err(|e| e.to_string())?;
    // spawn a local ws relay task bridging rx/child.stdin to a bound port; return that port
    Ok(bridge_stdio_to_websocket(rx, child).await?)
}
```

Diagnostics fan-in: each `MonacoLanguageClient` instance forwards `publishDiagnostics` notifications to a shared `useDiagnosticsStore` (zustand, same middleware stack as `useEditorStore`), which spec 02's Problems panel and spec 12's debugger both read from — one diagnostics source of truth, not per-feature duplication.

## Implementation (phased)

### Phase 1 — TS/JS + Python + Rust

- `src-tauri/src/lsp.rs`: sidecar spawn + stdio→WebSocket bridge commands.
- `src-tauri/tauri.conf.json`: extend `bundle.externalBin` with `binaries/typescript-language-server`, `binaries/pyright-langserver` (rust-analyzer typically resolved from system/rustup toolchain, not bundled).
- `src/services/lsp/LspClientFactory.ts`, `src/services/lsp/LanguageServerRegistry.ts` (new): the 3 hardcoded server definitions.
- `src/components/Editor/LazyMonaco.tsx`: after Monaco loads, for each open model call into the registry to attach/detach language clients as files open/close.
- `src/stores/useDiagnosticsStore.ts` (new, same pattern as `useEditorStore.ts`): `Map<filePath, Diagnostic[]>`.

### Phase 2 — Generic registry + on-demand download

- `src/services/lsp/LanguageServerRegistry.ts`: externalize the 3 hardcoded entries into a user-editable JSON (Settings → Language Servers), matching `languageId` → `{ command, args, downloadUrl }`.
- `src-tauri/src/lsp_installer.rs` (new): download + extract a server binary into the app's data dir on first use per language, with checksum verification.
- Settings UI section (`src/components/Settings/LanguageServersSection.tsx`, following the `ThemeSection.tsx` pattern from spec 01) to view/add/override entries.

### Phase 3 — Multi-root workspace + semantic tokens

- Multi-root: registry keys become `(languageId, workspaceRootId)` pairs; one server instance per root, not per file.
- Semantic tokens (`textDocument/semanticTokens/full`) layered on top of spec 01's TextMate tokenization for LSP-aware languages — semantic tokens override TextMate scopes where both apply (VS Code's own precedence rule).

## Integration points (existing code to hook into)

- `src/components/Editor/LazyMonaco.tsx` — Monaco lifecycle hook point (model creation/disposal) where language clients attach/detach.
- `src/components/Editor.tsx` — top-level editor component owning file-open/close events that must trigger client attach/detach.
- `src/stores/useEditorStore.ts` — `openFiles`/`currentFile` state that drives which language clients need to be live; follow its existing zustand + immer + persist + devtools pattern for the new `useDiagnosticsStore`.
- `src-tauri/tauri.conf.json` — existing `bundle.externalBin` sidecar declaration pattern (already used for `binaries/vcs-backend`) and `plugins.shell` config to extend for language-server binaries.
- Shared Problems panel — co-owned with spec 02 (Task Runner) and spec 12 (DAP Debugger); this spec is the primary diagnostics _producer_, not the panel's owner.

## Test Scenarios

**Vitest unit**

- `LanguageServerRegistry.resolve('typescript')` returns the correct command/args tuple.
- `LspClientFactory` error handler triggers Monaco-worker fallback (`CloseAction.DoNotRestart`) when the WebSocket closes unexpectedly — assert no unhandled rejection.
- Diagnostics reducer correctly merges/replaces per-file diagnostic arrays on repeated `publishDiagnostics` events.

**Playwright e2e**

- Open a 2-file TS project, `Ctrl+Click` a symbol defined in the other file, assert cursor jumps to correct file/line.
- Trigger rename on a symbol used in 3 files, assert preview diff shows all 3 files, apply, assert all 3 saved correctly.
- Introduce a type error, assert it appears in the Problems panel within 2s of keystroke debounce.
- Kill the language-server sidecar process externally, assert editor continues functioning with degraded (Monaco-only) hover instead of crashing.

## Success Metrics

- Go-to-definition p95 latency <300ms on a ~500-file TS project.
- Zero editor crashes attributable to language-server sidecar failure over a 1-week dogfood period (fallback path holds).
- Diagnostics latency (keystroke → Problems panel update) <2s p95.

---

**Risks / Open questions**: `monaco-languageclient` v10.x tracks Monaco's own release cadence closely — version pinning against VCS's `@monaco-editor/react` version needs verification before Phase 1 starts. rust-analyzer is large (~150MB+) and slow to index on first open; needs a visible "indexing" progress state (can reuse `useEditorStore`'s existing `isIndexing`/`indexingProgress` fields, already used for workspace semantic search indexing). Bundling vs. system-resolving each server is a per-language tradeoff to finalize in Phase 1 (TS server is small enough to bundle; rust-analyzer is not).
**Sequencing**: Wave 2, first item — sequence LSP before spec 12 (DAP Debugger) since debugging UX assumes accurate source navigation exists; also unblocks spec 08 (Test Explorer)'s "jump to failing assertion" and spec 02 (Task Runner)'s Problems panel becomes meaningfully populated only once this ships.
