# Feature Spec: Task Runner

**Status**: 📋 PLANNED (MISSING — `EnhancedAgentMode/stores/agentTaskRunner.ts` runs AI agent tasks, not build/lint/test tasks)
**Priority**: MEDIUM
**Effort**: S–M — parser + terminal reuse is small; problem matchers + Problems panel push it past S
**Competitor parity**: VS Code `tasks.json` (`Terminal: Run Task`, problem matchers, background/watch tasks)
**Dependencies**: `src/services/TerminalService.ts` (existing PTY), `@tauri-apps/plugin-shell`, zustand, no new native deps

---

## User Story

As a developer, I want to define reusable shell tasks (build, lint, test, watch) in a `tasks.json` file and run them from the Command Palette with keybindings, so that I don't have to retype terminal commands and I get build errors surfaced as clickable diagnostics instead of raw log text.

## Why VCS lacks this today

VCS has a terminal (`TerminalService` + xterm) and a Command Palette, but no declarative task definition format, no way to bind a saved command to a shortcut, and no mechanism that turns compiler/linter stdout into structured diagnostics. `agentTaskRunner.ts` is unrelated — it schedules AI agent work items, not OS processes.

Today, running `pnpm build` or `pnpm lint` means opening a terminal tab, typing the command, and manually scanning scrollback for the file:line of any error. Multiply that by NX's 28-app monorepo surface and the friction compounds — there's no saved, one-click way to say "build this app" the way `Ctrl+Shift+B` does in VS Code.

## Acceptance Criteria

1. ⬜ `.vcs/tasks.json` (VS Code `tasks.json` schema subset) is parsed and validated on workspace load; schema errors surface as a toast, not a crash
2. ⬜ Each task has `label`, `type` (`shell` | `process`), `command`, `args[]`, `group` (`build`|`test`|`none`), `presentation` (reveal/panel/clear)
3. ⬜ `Ctrl+Shift+P` → "Run Task" lists all tasks, runs the selected one in a dedicated `TerminalService` session tagged with the task label
4. ⬜ "Run Build Task" (`Ctrl+Shift+B`) runs the task marked `"group": {"kind": "build", "isDefault": true}` directly, no picker
5. ⬜ A `problemMatcher` (named built-in or inline regex with `file`/`line`/`column`/`severity`/`message` capture groups) converts terminal output lines into diagnostics
6. ⬜ Diagnostics populate a shared **Problems panel** (dock panel, filterable by error/warning, click-to-jump to file:line:col in Monaco)
7. ⬜ `dependsOn` (single task or array) runs prerequisite tasks first, sequentially or with `"dependsOrder": "parallel"`
8. ⬜ Background/watch tasks support `isBackground: true` with `beginsPattern`/`endsPattern` to track "compiling…" vs "compiled" state without blocking the picker
9. ⬜ A cancel-running-task command exists and kills the underlying `TerminalService` session cleanly (no orphaned `pwsh.exe`)
10. ⬜ Tasks persist per-workspace (`.vcs/tasks.json` committed to repo, like VS Code's `.vscode/tasks.json`)

## Architecture / Solution

Pure TypeScript + existing Tauri sidecar path — no new Rust code needed since `TerminalService.startShellTauri` already spawns via the `pty_spawn` Tauri command and streams `terminal:data` events. The task runner is a thin orchestration layer on top:

```
tasks.json (parsed) → TaskRunnerService
                         ├─ resolves dependsOn graph (topological order)
                         ├─ opens a TerminalService session per task
                         ├─ writes `command args.join(' ')` via writeInput()
                         ├─ pipes onData() through ProblemMatcherEngine
                         └─ ProblemMatcherEngine.match(line) → Diagnostic[] → problemsStore
```

`ProblemMatcherEngine` is stateless: regex in, `Diagnostic { file, line, column, severity, message, source: taskLabel }` out. Built-in matchers (`$tsc`, `$eslint-stylish`, `$msCompile`) ship as static regex tables; custom matchers come straight from the task's `problemMatcher` field, same shape.

The Problems panel is a **new shared component** — this spec builds it, but it's a shared dependency also consumed by spec 07 (LSP diagnostics) and spec 12 (Debugger runtime errors). All three write into the same `problemsStore` (zustand) keyed by `source` so panel entries can be filtered/grouped by origin.

Sample `tasks.json` shape this parser targets (VS Code schema subset only — no `inputs`/`variables` interpolation in v1):

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "pnpm",
      "args": ["build"],
      "group": { "kind": "build", "isDefault": true },
      "problemMatcher": "$tsc",
      "presentation": { "reveal": "always", "panel": "shared" }
    },
    {
      "label": "test:watch",
      "type": "shell",
      "command": "pnpm",
      "args": ["test", "--watch"],
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(error|warning):\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "message": 5
        },
        "background": { "beginsPattern": "^Watching for", "endsPattern": "^Test run complete" }
      }
    }
  ]
}
```

## Implementation (phased)

### Phase 1 — Shell tasks → terminal

- `src/services/tasks/TaskParser.ts`: JSON schema validation (zod) for the `tasks.json` subset
- `src/services/tasks/TaskRunnerService.ts`: resolve task by label, open `TerminalService` session, write command
- `src/stores/tasksStore.ts` (zustand): task list, running-task state, last exit code
- Command Palette entries: "Run Task", "Run Build Task", "Run Test Task"
- Keybinding: `Ctrl+Shift+B` → default build task

### Phase 2 — Problem matchers → Problems panel

- `src/services/tasks/ProblemMatcherEngine.ts`: regex matcher + built-in table (`$tsc`, `$eslint-stylish`, `$eslint-compact`)
- `src/stores/problemsStore.ts` (zustand): `Diagnostic[]`, keyed by `source`
- `src/components/ProblemsPanel/` (new): dock panel, list grouped by file, severity icons, click → `EditorService.revealLine(file, line, column)`
- Wire `TaskRunnerService` output stream through the matcher live (not just on exit)

### Phase 3 — dependsOn / compound + background tasks

- Topological sort for `dependsOn` arrays; `dependsOrder: "sequence" | "parallel"`
- `isBackground` state machine: `beginsPattern` → "running" badge, `endsPattern` → "idle" badge, panel doesn't auto-focus on background tasks
- Compound "test all" style tasks that chain build → lint → test

## Integration points (existing code to hook into)

- `src/services/TerminalService.ts` — reuse `createSession`/`startShell`/`writeInput`/`closeSession` verbatim; tasks are just named, orchestrated terminal sessions
- `src/components/TerminalPanel.tsx` — task-spawned sessions appear as additional tabs, tagged with the task label instead of "Terminal N"
- New `src/services/tasks/` (`TaskParser.ts`, `TaskRunnerService.ts`, `ProblemMatcherEngine.ts`)
- New Problems panel component (`src/components/ProblemsPanel/`) — shared with specs 07 and 12
- `src/components/CommandPalette.tsx` — register "Run Task" / "Run Build Task" commands

## Test Scenarios

- Vitest: `TaskParser.test.ts` — valid schema parses, malformed JSON produces a typed error not a throw
- Vitest: `ProblemMatcherEngine.test.ts` — feed sample `tsc --noEmit` output through `$tsc` matcher, assert exact `Diagnostic[]` (file/line/col/message)
- Vitest: `TaskRunnerService.test.ts` — mock `TerminalService`, assert `dependsOn: ["build"]` runs `build` before the dependent task
- Playwright: open Command Palette → "Run Task" → select → assert terminal tab appears with task label and expected output
- Playwright: run a task with an injected `tsc` error → assert Problems panel shows one entry, clicking it moves editor cursor to the reported line

## Success Metrics

- Task start-to-first-output latency < 300ms (matches raw terminal spawn, no runner overhead)
- Problem matcher false-negative rate 0% on `$tsc`/`$eslint-stylish` against VCS's own build output (dogfood test)
- Zero orphaned shell processes after 50 consecutive task cancellations (verified via `dc_list_processes`-style check in CI)
- 100% of `.vcs/tasks.json` schema errors produce an actionable toast message (file + line of the offending JSON) rather than a silent no-op
- Problems panel click-to-jump lands on the exact reported line/column in Monaco for 100% of matched diagnostics in the fixture corpus

## Windows-specific notes

- Default `type: "shell"` tasks spawn through `pwsh.exe -NoLogo -NoProfile`, matching `TerminalService.getDefaultShell()`'s existing win32 branch — no separate Windows task-shell config needed
- Path separators in `problemMatcher` file captures must normalize backslash-vs-forward-slash before matching against open editor tabs, since compiler output (tsc, eslint) on Windows can emit either depending on invocation
- `dependsOn` process kill on cancel must terminate the full `pwsh.exe` process tree (child processes of `pnpm`/`nx`), not just the top-level handle, to avoid orphaned Node processes lingering after a cancelled build

---

**Risks / Open questions**: Should `.vcs/tasks.json` also read a legacy `.vscode/tasks.json` for zero-friction import from VS Code users? (Recommend yes, read-only fallback, Phase 1.) Multi-root workspace task scoping deferred until VCS has multi-root workspace support at all.
**Sequencing**: Wave 1. The Problems panel it introduces is a **blocking dependency for spec 07** (LSP diagnostics) and **spec 12** (Debugger) — build this first among the three.
