# Feature Spec: Jupyter Notebooks (`.ipynb`)

**Status**: 📋 PLANNED (MISSING — no `.ipynb` support of any kind: no serializer, no cell-based view, no kernel execution)
**Priority**: LOW–MEDIUM — niche unless data/ML workflows become an explicit VCS target audience
**Effort**: L — serializer + static view is manageable; kernel execution + Jupyter messaging protocol is the bulk of the cost
**Competitor parity**: VS Code Jupyter extension (native `.ipynb` editing + kernel execution + rich outputs)
**Dependencies**: `@jupyterlab/services` (Jupyter messaging protocol client), a Jupyter server binary as a Tauri sidecar, Monaco (per-cell instances), existing AI completion stack

---

## User Story

As a developer working on a data/ML task, I want to open, edit, and run `.ipynb` notebooks directly in VCS with the same AI completion and Cmd-K editing I get in regular files, so that I don't need to switch to JupyterLab or VS Code for notebook work.

## Why VCS lacks this today

VCS has no notebook document type at all — `FileSystemService` treats `.ipynb` as an opaque JSON blob (or doesn't recognize it), there's no cell-based editing surface, and there's no kernel process management. This is a from-scratch build, unlike VS Code forks which inherit the Jupyter extension for free.

Opening a `.ipynb` in VCS today either shows raw JSON in the text editor or fails to associate a viewer at all — there's no cell boundary awareness, no output rendering, and certainly no way to execute a cell against a live Python kernel.

## Acceptance Criteria

1. ⬜ Opening a `.ipynb` file renders a notebook document view, not raw JSON — ordered cells (markdown/code), each with its own editing surface
2. ⬜ Each code cell is a small Monaco instance (language mode set from the notebook's kernelspec, typically Python) sharing VCS's existing completion provider and Cmd-K inline edit
3. ⬜ Markdown cells render with live preview toggle (edit source ↔ rendered output), consistent with any existing markdown preview VCS has elsewhere
4. ⬜ Adding/deleting/reordering/splitting/merging cells works via toolbar buttons and keyboard shortcuts matching common notebook conventions (`A`/`B` insert above/below, `Shift+Enter` run-and-advance)
5. ⬜ Saving writes valid nbformat v4 JSON back to disk — round-tripping a notebook opened elsewhere (VS Code, JupyterLab, Colab) must not corrupt its structure or metadata
6. ⬜ A kernel can be started, selected (from available kernelspecs), and shown as connected/disconnected/busy in the notebook toolbar
7. ⬜ Running a code cell sends it to the kernel via the Jupyter messaging protocol and streams `execute_result`/`stream`/`error` outputs back into that cell in order
8. ⬜ Outputs render for at least: `text/plain` (stream/error), `text/html`, `image/png` — matching the standard nbformat output MIME types
9. ⬜ "Restart Kernel" and "Run All Cells" commands exist and correctly reset/replay execution state (including clearing `execution_count` numbering)
10. ⬜ Kernel process lifecycle is tied to the notebook tab — closing the last notebook using a kernel shuts it down; the Jupyter server sidecar itself persists across multiple notebook tabs to avoid per-notebook server spin-up cost

## Architecture / Solution

Two mostly-independent halves: a document model (no execution needed) and a kernel execution layer (needs a running Jupyter server).

**Document model** — nbformat v4 JSON ↔ an internal `NotebookDocument { cells: NotebookCell[] }` model, where `NotebookCell = { id, cellType: 'code'|'markdown', source: string, outputs: CellOutput[], executionCount: number | null, metadata }`. This is pure serialization, no process involved — Phase 1 ships without any kernel.

**Kernel execution** — a Jupyter server (the reference `jupyter_server` Python package, or `jupyter kernel` for a bare kernel without the full notebook server HTTP surface) runs as a **Tauri sidecar process**, launched and lifecycle-managed by the Rust backend exactly like other external processes in this stack. VCS's webview talks to it over WebSocket using the Jupyter messaging protocol — rather than hand-rolling that protocol, use **`@jupyterlab/services`**, the official JupyterLab client library that already implements kernel/session/message handling against a running Jupyter server's REST+WebSocket API.

```
Tauri sidecar: jupyter server (or jupyter-kernel-gateway)  ── spawned via Rust Command, port on localhost
                          │ WebSocket (Jupyter messaging protocol)
                          ▼
        @jupyterlab/services (KernelManager, KernelConnection)
                          │
        NotebookExecutionService (new) ── maps VCS NotebookCell.execute() to kernel.requestExecute()
                          │
        streams execute_result / stream / error / display_data messages
                          ▼
        NotebookCell.outputs updates → React re-render of that cell's output area
```

The sidecar requires a Python environment with `jupyter` installed reachable on the host — VCS does not bundle a Python distribution in v1; it detects/uses the user's existing Python + Jupyter install (similar posture to how VS Code's Jupyter extension defers to a detected interpreter) and surfaces a clear error/setup prompt if none is found.

Internal `NotebookCell` shape, the bridge between nbformat JSON and the React cell components:

```ts
interface NotebookCell {
  id: string;
  cellType: 'code' | 'markdown' | 'raw';
  source: string;
  outputs: CellOutput[];
  executionCount: number | null;
  metadata: Record<string, unknown>;
}

interface CellOutput {
  outputType: 'execute_result' | 'stream' | 'display_data' | 'error';
  data?: Record<string, string>; // MIME type → content, e.g. { 'text/plain': '...', 'image/png': 'base64...' }
  text?: string[]; // for 'stream' outputs
  ename?: string;
  evalue?: string;
  traceback?: string[]; // for 'error' outputs
}
```

## Implementation (phased)

### Phase 1 — Open/render/edit/save (no execution)

- `src/services/notebooks/NotebookSerializer.ts`: nbformat v4 JSON ↔ `NotebookDocument` model, round-trip tested against real-world `.ipynb` fixtures
- `src/components/NotebookEditor/NotebookEditor.tsx`, `NotebookCell.tsx`, `MarkdownCell.tsx`, `CodeCell.tsx`: cell list UI, add/delete/reorder/split/merge
- Code cells embed a Monaco instance reused from `src/components/Editor/` (same completion provider wiring as regular files, language forced to the kernelspec language)
- Save path writes back through `FileSystemService.ts`, validated against nbformat schema before write to prevent corrupting the file on a serialization bug

### Phase 2 — Kernel management + execute + basic outputs

- `src-tauri/`: sidecar process spawn for a Jupyter server/kernel gateway (Rust `Command`, similar pattern to any other external-process sidecar in this stack), port allocation, health check, graceful shutdown on last-notebook-close
- `src/services/notebooks/KernelService.ts`: wraps `@jupyterlab/services` `KernelManager`/`SessionManager`, exposes `startKernel()`, `interrupt()`, `restart()`, `shutdown()`
- `src/services/notebooks/NotebookExecutionService.ts`: `executeCell(cell)` → `kernel.requestExecute(code)`, streams `IOPub` messages into `CellOutput[]`
- Output rendering for `text/plain`, `text/html`, `image/png` (base64 `<img>`), `stream` (stdout/stderr), `error` (traceback)
- Toolbar: kernel picker (from `KernelManager.specs`), connection status indicator, Run/Run-All/Restart/Interrupt buttons

### Phase 3 — Rich outputs + variable explorer + ipywidgets

- Extend output renderer for `application/json`, SVG, LaTeX (`text/latex` via a math renderer)
- Variable explorer panel: query kernel namespace via a lightweight introspection call (e.g. `%whos`-equivalent or a custom introspection snippet) after each execution
- ipywidgets support (Comm messages) — explicitly the highest-risk, most-deferred item; only attempt after Phase 2 is stable, since it requires bidirectional Comm channel handling beyond simple request/reply execution

## Integration points (existing code to hook into)

- New `src/components/NotebookEditor/` (editor, cell components, toolbar)
- `src/services/FileSystemService.ts` — `.ipynb` open/save routes through the new serializer instead of generic text-file handling
- Monaco cell reuse from `src/components/Editor/` — code cells are not a new editor implementation, they're additional Monaco instances configured the same way as the main editor
- Existing AI completion (monacopilot) and Cmd-K — attached to each code cell's Monaco instance identically to how they attach to the main editor, no separate AI integration needed
- `src-tauri/` — new sidecar spawn/lifecycle for the Jupyter server process, following the same sidecar pattern used elsewhere in the Tauri backend for external processes

## Test Scenarios

- Vitest: `NotebookSerializer.test.ts` — round-trip a real nbformat v4 fixture (cells, outputs, metadata) and assert byte-for-byte-equivalent-enough JSON (ignoring key ordering)
- Vitest: `NotebookExecutionService.test.ts` — mock `@jupyterlab/services` `KernelConnection`, assert `execute_result`/`stream`/`error` IOPub messages map to the correct `CellOutput` shapes in order
- Vitest: `KernelService.test.ts` — mock sidecar WebSocket, assert `restart()` clears all cells' `executionCount` in the associated document
- Playwright (E2E): open a fixture `.ipynb` → assert cell count and types match the source file → edit a markdown cell → toggle preview → assert rendered output
- Playwright (E2E, requires a real Jupyter sidecar in CI): start kernel → run a cell with `print("hello")` → assert `stream` output "hello" appears in that cell within a bounded timeout

## Success Metrics

- Round-trip fidelity: 0 structural diffs (cell order, types, metadata) across a corpus of 20+ real-world `.ipynb` fixtures pulled from open-source repos
- Cell execution latency (Shift+Enter → first output token) within the kernel's own responsiveness, target < 1s overhead added by VCS's message-plumbing layer
- Kernel sidecar startup < 3s on a machine with Jupyter already installed (excludes any Python/Jupyter install-from-scratch flow, which is out of scope)
- Output rendering handles cells with 1MB+ of base64 image data without blocking the main render thread (virtualized/lazy-rendered output area)
- AI completion latency inside a code cell matches the main editor's existing completion latency baseline — no measurable regression from the extra Monaco-instance-per-cell architecture

## Windows-specific notes

- Jupyter/Python detection on Windows checks `py.exe` (the Python launcher) and `python.exe`/`jupyter.exe` on PATH, plus common install locations (`%LOCALAPPDATA%\Programs\Python\`, conda/miniconda default install paths) — a plain `which jupyter`-style POSIX check is insufficient
- The Tauri sidecar process for the Jupyter server must be spawned with `CREATE_NO_WINDOW` on Windows to avoid a flashing console window, consistent with how other background sidecars in this stack should behave
- WebSocket connections from the webview to `localhost:<port>` for the Jupyter messaging protocol need the sidecar bound explicitly to `127.0.0.1`, not `0.0.0.0`, to avoid Windows Firewall prompts on first launch

---

**Risks / Open questions**: VCS does not bundle Python/Jupyter — this is a hard dependency on the user's environment, and the "no Jupyter found" onboarding flow needs real design attention (detect `python`/`jupyter` on PATH, offer a `pip install jupyter` one-click via `TerminalService`, or point to manual setup). ipywidgets (Phase 3) is high-risk/high-effort relative to its value and should be explicitly re-scoped or dropped if Phase 2 usage data doesn't justify it. `@jupyterlab/services` is a substantial dependency (pulls in JupyterLab's client stack) — validate bundle size impact before committing, since VCS is otherwise a lean from-scratch build.
**Sequencing**: Wave 3. No hard dependency on other specs in this plan; can ship independently, but should be deprioritized behind Wave 1/2 items unless data/ML becomes an explicit product-market target.
