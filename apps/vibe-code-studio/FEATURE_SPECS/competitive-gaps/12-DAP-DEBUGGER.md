# Feature Spec: DAP Debugger (Breakpoints, Call Stack, Variables, Watch)

**Status**: 📋 PLANNED (MISSING — `ProactiveDebugger.ts`/`StackTraceParser.ts` are AI-driven stack-trace analysis tools, not a real interactive breakpoint debugger; no Debug Adapter Protocol client exists)
**Priority**: HIGH (sequence after spec 07 LSP)
**Effort**: L–XL — the DAP protocol itself is a straightforward JSON-over-stdio wire format; the entire cost is the UI (breakpoint gutter, call-stack/scopes/variables trees, watch panel, debug console) because there is no mature "monaco-debugger" library to lean on
**Competitor parity**: VS Code's built-in Run & Debug — breakpoints, stepping, call stack, scopes/variables, watch, debug console, `launch.json`
**Dependencies**: hand-rolled DAP TS client (no mature off-the-shelf Monaco-integrated one exists); `vscode-js-debug` (Node/JS adapter), `debugpy` (Python adapter), CodeLLDB (Rust/C++ adapter); existing `TerminalPanel.tsx`/`TerminalService.ts`, Tauri sidecar infra, spec 02's Task Runner config UI (for `launch.json`-equivalent)

---

> **⚠️ Existing infra to reuse — dependency audit 2026-07-04:** The monorepo **already ships `backend/dap-proxy/`** — a working WebSocket↔stdio DAP bridge (default port 5003) wired for `node` and `python` (debugpy), with `Content-Length` framing. **Phase 1 should extend that proxy rather than build a fresh adapter host.** Caveat: its Node path uses raw `node --inspect-brk`, which is _not_ a real DAP adapter — genuine breakpoint / variable / call-stack fidelity still needs **`vscode-js-debug`** (as this spec's Architecture already specifies). Same standalone-Node-service vs. Tauri-sidecar decision as spec 07 — resolve them together.

## User Story

As a developer debugging a failing test or a runtime crash, I want to set breakpoints, step through code, inspect the call stack and live variable values, and evaluate watch expressions, so that I don't have to leave VCS and open VS Code just to debug.

## Why VCS lacks this today

`src/services/ProactiveDebugger.ts` and `src/services/StackTraceParser.ts` are AI-assisted tools: they parse a stack trace or exception text and ask the AI to explain/suggest a fix. They do not spawn a process, do not attach a debug adapter, and have no concept of a breakpoint, a paused execution frame, or a live variable. VCS currently has zero interactive debugging — no gutter click-to-break, no stepping, no variable inspection. Because VCS is not a VS Code fork, it also did not inherit VS Code's Debug Adapter Protocol client or its Run & Debug UI; both must be built from scratch.

## Acceptance Criteria

1. ⬜ Clicking the Monaco glyph-margin on a line toggles a breakpoint, rendered as a persistent red-dot decoration that survives file close/reopen.
2. ⬜ Conditional breakpoints (expression) and logpoints (message, no pause) are settable via right-click on the glyph margin.
3. ⬜ Run & Debug panel shows a live call-stack tree; selecting a frame updates the editor's highlighted line and the scopes/variables tree to that frame's context.
4. ⬜ Scopes/variables tree lazily expands nested objects/arrays on demand (DAP `variables` request per `variablesReference`), not eagerly flattened.
5. ⬜ Watch expressions panel: user-added expressions re-evaluate on every stop event and show current value or an error state.
6. ⬜ Step over / step into / step out / continue / pause / stop controls work and reflect correct enabled/disabled state per DAP capabilities of the active adapter.
7. ⬜ Debug console accepts REPL input (evaluate expression in the current paused frame) and displays adapter `output` events, reusing the existing terminal rendering surface.
8. ⬜ A `launch.json`-equivalent configuration (name, type, request, program/module, args, env, cwd) is editable via a config UI and persisted per-workspace.
9. ⬜ Node/JS (`vscode-js-debug`) and Python (`debugpy`) debugging both work end-to-end for Phase 1/2 scope; Rust (CodeLLDB) is Phase 3.
10. ⬜ If the debug adapter process crashes or fails to attach, the UI shows a clear error state and does not leave the editor in a stuck "debugging" mode (stop button always recoverable).

## Architecture / Solution

DAP is JSON-over-stdio (same shape as LSP's JSON-RPC framing, different message schema: `Request`/`Response`/`Event`). The adapters themselves are external processes — must run as Tauri sidecars, mirroring spec 07's LSP bridge pattern exactly (this spec should reuse that bridge's transport code, not reinvent it):

```
┌────────────── Tauri Rust backend ──────────────┐
│  sidecar: js-debug (Node.js/Chrome)              │
│  sidecar: debugpy (adapter mode, --listen)       │
│  sidecar: codelldb (Phase 3)                     │
│         │ stdio, spawned via tauri-plugin-shell  │
│         ▼                                        │
│  local WebSocket bridge (127.0.0.1:<port>)        │
└─────────────────────┬──────────────────────────┘
                       │ ws://127.0.0.1:<port>
┌──────────────────────▼─────────────────────────┐
│  React webview                                   │
│  hand-rolled DapClient (TS) — request/response/   │
│  event correlation over the WS transport          │
│  → useDebugStore (zustand)                        │
│  → DebugPanel components (call stack, vars, watch)│
└────────────────────────────────────────────────────┘
```

```ts
// src/services/debug/DapClient.ts (new)
export class DapClient {
  private seq = 0;
  private pending = new Map<
    number,
    { resolve: (r: DapResponse) => void; reject: (e: Error) => void }
  >();
  private socket: WebSocket;

  constructor(
    wsUrl: string,
    private onEvent: (e: DapEvent) => void
  ) {
    this.socket = new WebSocket(wsUrl);
    this.socket.onmessage = msg => this.handleMessage(JSON.parse(msg.data));
  }

  async request<T>(command: string, args?: unknown): Promise<T> {
    const seq = ++this.seq;
    this.socket.send(JSON.stringify({ seq, type: 'request', command, arguments: args }));
    return new Promise((resolve, reject) =>
      this.pending.set(seq, { resolve: resolve as never, reject })
    );
  }

  private handleMessage(msg: DapResponse | DapEvent) {
    if (msg.type === 'response') {
      const p = this.pending.get(msg.request_seq);
      p?.[msg.success ? 'resolve' : 'reject'](msg as never);
      this.pending.delete(msg.request_seq);
    } else if (msg.type === 'event') {
      this.onEvent(msg); // 'stopped' | 'continued' | 'output' | 'terminated' | 'thread' ...
    }
  }
}
```

```ts
// src/stores/useDebugStore.ts (new, mirrors useEditorStore.ts's zustand pattern)
interface DebugState {
  session: 'inactive' | 'starting' | 'running' | 'paused' | 'terminated';
  callStack: DapStackFrame[];
  scopes: Map<number, DapScope[]>; // keyed by frameId
  variables: Map<number, DapVariable[]>; // keyed by variablesReference
  watches: Array<{ expr: string; value?: string; error?: string }>;
  breakpoints: Map<string, DapBreakpoint[]>; // keyed by file path
  actions: {
    /* setBreakpoint, stepOver, continue, evaluateWatch, ... */
  };
}
```

DAP events → UI state mapping: `stopped` → `session: 'paused'` + fetch `stackTrace` → fetch `scopes` for top frame → lazy-fetch `variables` on tree expand; `output` → append to debug console (reusing `TerminalPanel.tsx`'s render surface, fed non-PTY text rather than PTY bytes); `terminated` → `session: 'terminated'`, clear call stack.

## Implementation (phased)

### Phase 1 — Node breakpoints + step + variables

- `src-tauri/src/debug.rs` (new, sibling to spec 07's `src-tauri/src/lsp.rs`, reuse its stdio↔WebSocket bridge helper): spawn `vscode-js-debug` sidecar.
- `src/services/debug/DapClient.ts`, `src/services/debug/DapAdapterRegistry.ts` (new): Node adapter definition only.
- `src/stores/useDebugStore.ts` (new).
- `src/components/DebugPanel/` (new): `BreakpointGutter.ts` (Monaco glyph-margin decoration logic, hooked into `LazyMonaco.tsx`), `CallStackTree.tsx`, `VariablesTree.tsx` (lazy-expand), `DebugToolbar.tsx` (step/continue/stop controls).

### Phase 2 — Python + watch + conditional breakpoints

- Add `debugpy` adapter to `DapAdapterRegistry.ts`; `src-tauri/tauri.conf.json` `bundle.externalBin` gains the debugpy sidecar entry.
- `src/components/DebugPanel/WatchPanel.tsx` (new): user-managed expression list, re-evaluated on every `stopped` event via `evaluate` DAP request.
- Conditional breakpoint / logpoint UI: extend `BreakpointGutter.ts`'s right-click context menu.
- `src/components/DebugPanel/DebugConsole.tsx` (new): reuses `TerminalPanel.tsx`'s xterm rendering, feeds it adapter `output` events + accepts REPL input routed to DAP `evaluate` with `context: 'repl'`.

### Phase 3 — launch.json + compound/multi-target + debug-test hook

- `src/components/DebugPanel/LaunchConfigEditor.tsx` (new): reuses the Task Runner config-editing UI/patterns from spec 02 for a consistent "JSON config with form overlay" UX.
- CodeLLDB adapter for Rust/C++ added to the registry.
- Compound configs (launch multiple adapters, e.g. backend + frontend, in one session).
- Hook into spec 08 (Test Explorer): "Debug Test" action spawns a debug session scoped to a single test's run command.

## Integration points (existing code to hook into)

- `src/components/Editor/` — glyph-margin decorations for the breakpoint gutter attach to the same Monaco model lifecycle spec 07's LSP client attach/detach uses; share that file-open/close hook rather than adding a second one.
- `src/components/TerminalPanel.tsx` + `src/services/TerminalService.ts` — debug console reuses this rendering surface; `TerminalService.ts` already has a `_isTauri` detection branch and a `startShellTauri` path to model the debug adapter's sidecar-spawn code after.
- `src-tauri/tauri.conf.json` — existing `bundle.externalBin` array (currently `["binaries/vcs-backend"]`) extends with each debug adapter binary, same as spec 07's language servers.
- Reuse spec 07's stdio↔WebSocket bridge Rust helper (`src-tauri/src/lsp.rs`) rather than duplicating transport code in `src-tauri/src/debug.rs` — factor the shared bridging logic into a common module if both specs ship close together.
- Shared Problems panel — DAP `stopped` (reason: `exception`) events should also surface in the same Problems panel spec 07 and spec 02 populate, not a separate error list.

## Test Scenarios

**Vitest unit**

- `DapClient.request()` correlates response to the correct pending promise by `request_seq`.
- `useDebugStore` variables map correctly nests lazy-expanded children under the parent `variablesReference`.
- Breakpoint gutter decoration model: toggling twice returns to no-breakpoint state; conditional breakpoint stores its expression string correctly.

**Playwright e2e**

- Set a breakpoint in a Node script, start debugging, assert execution pauses on that line and the call stack shows the correct frame.
- Step over 3 times, assert the highlighted line advances correctly each time.
- Expand a variable in the Variables tree, assert nested properties lazy-load (network/IPC call only fires on expand, not on initial stop).
- Add a watch expression referencing an out-of-scope variable, assert it shows an error state rather than crashing the panel.
- Kill the debug adapter sidecar process externally mid-session, assert the UI transitions to a recoverable "terminated" state (stop button clears state, no stuck spinner).

## Success Metrics

- Breakpoint-hit-to-paused-UI-update latency <500ms p95.
- Zero cases of a stuck/unrecoverable debug session state over a 1-week dogfood period.
- Variables tree lazy-expand keeps initial `stopped`-event payload under a fixed size budget (no eager full-object serialization) even on objects with 1000+ properties.

---

**Risks / Open questions**: There is genuinely no mature "Monaco debugger UI" library — VS Code's own Run & Debug view is not extractable as a standalone package, so every tree/panel component here is bespoke; budget the UI work, not the protocol work, as the XL-end driver. `vscode-js-debug` expects to be driven the way VS Code drives it (a specific handshake/capabilities negotiation) — needs an early spike to confirm it works headless outside VS Code before committing to Phase 1 scope. Debug console REPL evaluation semantics (how `context: 'repl'` behaves per-adapter) vary enough between adapters that Phase 2's `DebugConsole.tsx` may need per-adapter quirks handling.
**Sequencing**: Wave 3 (heavy/strategic). Hard-sequence after spec 07 (LSP) — accurate source navigation and the shared diagnostics/Problems infrastructure are assumed inputs. Blocks spec 08 (Test Explorer)'s "Debug Test" action (Phase 3 hook). Reuses spec 02 (Task Runner)'s config-editor UI pattern for `launch.json`.
