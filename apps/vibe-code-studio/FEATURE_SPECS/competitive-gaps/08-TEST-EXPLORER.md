# Feature Spec: Test Explorer

**Status**: 📋 PLANNED (PARTIAL — `src/services/testing/` has `TestRunner.ts`, `TestDiscovery.ts`, `OutputParser.ts`, `FrameworkDetector.ts`, `TestGenerator.ts` as backend building blocks, but no tree UI, no inline decorations, no unified controller)
**Priority**: MEDIUM
**Effort**: M — discovery/run/parse plumbing already exists; the UI tree + decorations + adapter coverage is the remaining work
**Competitor parity**: VS Code Testing API (`TestController`/`TestItem`) + built-in Test Explorer view
**Dependencies**: existing `src/services/testing/*`, `src/services/TerminalService.ts`, Monaco decorations API, spec 12 (DAP) for "debug test"

---

## User Story

As a developer, I want a tree view of every test in my workspace with live pass/fail status, the ability to run or debug a single test, and inline gutter marks in the editor, so that I don't have to scroll terminal output to find which of 400 tests failed.

## Why VCS lacks this today

The building blocks exist — `FrameworkDetector.ts` identifies vitest/jest/mocha/cypress/playwright, `TestDiscovery.ts` can enumerate test files, `TestRunner.ts` executes them, `OutputParser.ts` parses results into the `TestResult`/`TestSuite` shapes already defined in `src/services/testing/types.ts`. What's missing is the layer that turns those into a live, navigable UI: no `TestController`-style aggregation across runs, no tree component, no Monaco gutter decorations, and no per-test run/debug affordance.

Today, running tests means opening a terminal and typing `pnpm vitest run`, then scrolling through interleaved pass/fail text to find what broke. On a monorepo with 28 apps and 26 packages, there's no way to see "what's red right now" across a workspace without running everything and reading raw output.

## Acceptance Criteria

1. ⬜ A `TestController` model aggregates `TestDiscoveryResult` + `TestSuite`/`TestResult` from existing services into a stable tree: workspace → file → describe block → test
2. ⬜ Test Explorer panel (new dock panel) renders that tree with status icons: not-run (gray), running (spinner), passed (green check), failed (red x), skipped (yellow)
3. ⬜ Clicking a tree node's "run" affordance runs just that test (or suite) via `TerminalService`, not the full suite
4. ⬜ "Run all tests" and "Re-run failed tests" commands exist in the panel toolbar and Command Palette
5. ⬜ Inline Monaco gutter decorations mark each `it()`/`test()` line with the same pass/fail/not-run icon, clickable to run that single test
6. ⬜ Failed test nodes show the assertion diff/error message inline (expandable), sourced from `TestResult.error` and `.output`
7. ⬜ Vitest and Jest adapters parse their native JSON reporters (`--reporter=json` / `jest --json`) for structured, non-regex results
8. ⬜ Playwright adapter parses its JSON reporter or JUnit XML output; pytest adapter parses JUnit XML (`--junit-xml`)
9. ⬜ "Debug Test" action on any tree node launches the test under the DAP debugger (spec 12) with the correct framework-specific launch config, not a plain run
10. ⬜ Coverage results (when available from `CoverageInfo`) render as a percentage badge per file in the tree, with a "Show Coverage" toggle for inline covered/uncovered line highlighting

## Architecture / Solution

The controller is a thin aggregation layer — it does not reimplement discovery, execution, or parsing, all of which already exist:

```
FrameworkDetector.detect(workspace) → TestFrameworkInfo
TestDiscovery.discover(framework)   → TestDiscoveryResult (testFiles[])
                                          │
                        TestController (new) ── builds TestItem tree from testFiles
                                          │        (static: file/describe/test hierarchy
                                          │         parsed via lightweight AST scan, not exec)
                          run(testItem) ──┤
                                          ▼
                        TestRunner.run(options) → spawns via TerminalService
                                          │
                        OutputParser.parse(reporterOutput) → TestSuite/TestResult[]
                                          │
                        TestController.applyResults() → updates TestItem status
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                                ▼
                  TestExplorer tree (React)      Monaco gutter decorations
```

`TestController` holds a zustand store (`testExplorerStore`) mapping `testId → TestItem { status, location, lastResult }`. Discovery builds the tree structure (static); running a test updates only the affected subtree's status, so a full suite re-run isn't required to reflect a single-test re-run.

Reporter-based parsing (vitest/jest JSON, JUnit XML for playwright/pytest) replaces regex-scraping stdout — `OutputParser.ts` already has the shape to extend with per-framework parse methods rather than a single format assumption.

`TestItem` shape (new, sits alongside the existing `TestResult`/`TestSuite` types rather than replacing them):

```ts
interface TestItem {
  id: string; // stable across runs: `${file}::${describePath}::${testName}`
  label: string;
  kind: 'file' | 'describe' | 'test';
  location: { file: string; line?: number; column?: number };
  children: TestItem[];
  status: 'not-run' | 'running' | 'passed' | 'failed' | 'skipped';
  lastResult?: TestResult; // populated from OutputParser output
}
```

Static discovery (Phase 1) builds the tree once per file-open/save via a lightweight regex/AST scan for `describe(`/`it(`/`test(` call expressions — this is intentionally not a full TypeScript AST walk to keep discovery fast on large files; a full-fidelity parse is a documented future upgrade if the regex approach proves too lossy in practice.

## Implementation (phased)

### Phase 1 — Vitest discovery + run + tree

- `src/services/testing/TestController.ts`: builds `TestItem` tree from `TestDiscovery` output, exposes `runTest(id)`, `runAll()`, `runFailed()`
- `src/stores/testExplorerStore.ts` (zustand): `TestItem` map, subscribes to `TestController` events
- `src/components/TestExplorer/TestExplorerPanel.tsx`, `TestTree.tsx`, `TestNode.tsx`: tree UI with status icons and run buttons
- Wire vitest JSON reporter output through `OutputParser` into `TestController.applyResults()`

### Phase 2 — Inline decorations + re-run failed

- Monaco gutter decoration provider in `src/components/Editor/` reading `testExplorerStore` for the active file, mapped by `TestResult.location`
- Click-gutter-icon → `TestController.runTest(id)` for that single test
- "Re-run failed tests" toolbar command filters `testExplorerStore` for `status === 'failed'` and batches a run

### Phase 3 — jest/playwright/pytest adapters + debug-test

- Extend `OutputParser.ts` with `parseJestJson()`, `parseJUnitXml()` (shared by playwright + pytest)
- `FrameworkDetector.ts` already detects framework; wire its result to select the correct parser + reporter CLI flag combination in `TestRunner.ts`
- "Debug Test" command builds a framework-specific DAP launch config (e.g. vitest: `node --inspect-brk ./node_modules/.bin/vitest run <file> -t <name>`) and hands off to spec 12's debugger session start

## Integration points (existing code to hook into)

- `src/services/testing/FrameworkDetector.ts`, `TestDiscovery.ts`, `TestRunner.ts`, `OutputParser.ts`, `types.ts` — reused as-is, extended with per-framework reporter parsing, not replaced
- `src/services/TerminalService.ts` — `TestRunner` already shells out through it; Test Explorer just triggers `TestRunner` with scoped options (single test vs. full suite)
- New `src/components/TestExplorer/` (panel, tree, node components)
- Monaco decorations in `src/components/Editor/` — new gutter decoration layer alongside any existing diagnostic/breakpoint gutters
- Spec 12 (DAP Debugger) — "Debug Test" hands off a launch config; Test Explorer does not implement DAP itself

## Test Scenarios

- Vitest: `TestController.test.ts` — given a mocked `TestDiscoveryResult`, assert tree shape (file → describe → test) matches expected nesting
- Vitest: `OutputParser.parseVitestJson.test.ts` — feed a captured vitest `--reporter=json` sample, assert exact `TestSuite`/`TestResult[]` output including failed-assertion messages
- Vitest: `testExplorerStore.test.ts` — `runTest(id)` updates only that node's status, siblings remain `not-run`
- Playwright (E2E): open Test Explorer panel on a fixture workspace with 3 vitest files → assert tree renders 3 file nodes with correct test counts
- Playwright (E2E): click a failing test's gutter icon → run → assert red X appears in both gutter and tree within reporter-output latency

## Success Metrics

- Discovery-to-first-render for a 200-test workspace completes in < 1.5s (static AST scan, no execution)
- Single-test re-run latency (click → status update) within reporter process spawn + parse time, target < 2s for vitest
- Zero misattributed results — 100% of parsed `TestResult.location` entries map to the correct gutter line across the vitest/jest fixture suite
- Tree memory footprint stays under 5MB for a 2,000-test workspace (monorepo-scale), verified via a synthetic fixture generator
- Coverage badge accuracy: percentage shown in the tree matches `CoverageInfo` computed values to within rounding, 0 stale badges after a re-run

## Windows-specific notes

- Reporter CLI flags (`--reporter=json`, `--json`, `--junit-xml`) are appended to the command array passed into `TerminalService`, not shell-string-concatenated, to avoid PowerShell quoting issues with paths containing spaces (common under `C:\Users\...`)
- JUnit XML file paths written by pytest/playwright must be resolved as absolute Windows paths before `OutputParser` reads them back, since some frameworks emit relative paths assuming a POSIX-style invocation context

---

**Risks / Open questions**: Static test-tree discovery (parsing `it()`/`describe()` calls via AST, not execution) can drift from runtime-generated tests (`.each()`, dynamically named tests) — Phase 1 accepts this as a known limitation, matching VS Code's own Testing API behavior for similar frameworks. JUnit XML parsing for pytest requires pytest to be run with `--junit-xml` flag injected by `TestRunner`, which changes the user's existing pytest invocation — needs a config toggle, not a silent flag injection.
**Sequencing**: Wave 2. Debug-test action (Phase 3) is soft-blocked on spec 12 (DAP Debugger) landing first; Phases 1–2 ship independently.
