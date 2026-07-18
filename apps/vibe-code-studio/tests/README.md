# E2E Testing Guide - Vibe Code Studio

## Overview

This directory contains end-to-end (E2E) tests for Vibe Code Studio using Playwright, run
against the **web mode** dev server (`vite --port 3001`). In web mode the app auto-opens the
in-memory demo workspace (`demo://workspace`) with `index.js` in Monaco.

## Auth mock (required by every spec)

The app boots to a marketing landing page unless a session exists, and the session cookie is
`Secure`/`SameSite=None`, so it never sticks on `http://localhost:3001`. Every spec therefore
uses the shared fixture in **`fixtures/auth.ts`**, which:

- auto-installs a `page.route('**/api/auth/me', ...)` mock (`MOCK_USER`) on every page, and
- exports helpers:
  - `gotoAppShell(page)` — navigate to `/` and wait for `[data-testid="app-container"]`
  - `waitForDemoEditor(page)` — wait for Monaco to render the demo workspace
  - `openAgentMode(page)` — Ctrl+Shift+A, wait for `chat-input` + `mode-agent` pressed
  - `mockAiCompletion(page, content)` / `mockAiFailure(page)` — fulfill/fail AI proxy calls
    (`http://localhost:5004/api/ai/**/chat/completions`) deterministically

Always import from the fixture, never from `@playwright/test` directly:

```typescript
import { expect, gotoAppShell, test } from './fixtures/auth';
```

## Test Files

- **`basic.spec.ts`** - App shell, demo workspace, status bar toggles
- **`agent-mode-basic.spec.ts`** - AIChat Agent Mode basics (Ctrl+Shift+A)
- **`agent-mode-comprehensive.spec.ts`** - Agent Mode UI suite (modes, placeholders, empty state)
- **`cmd-k-inline-editing.spec.ts`** - Ctrl+K inline editing with mocked AI proxy responses
- **`multi-file-approval.spec.ts`** - Multi-file edit approval panel (mostly skipped, see below)
- **`screenshot-to-code.spec.ts`** - Screenshot-to-Code panel smoke test

## Running Tests

```powershell
# From apps/vibe-code-studio (config auto-starts the web dev server on :3001,
# reuseExistingServer allows running against one you started yourself)
pnpm playwright test

# Single file / headed / interactive
pnpm playwright test basic.spec.ts
pnpm playwright test --headed
pnpm playwright test --ui
```

Artifacts (test-results, HTML report, traces, videos) are written to
`D:\temp\playwright\vibe-code-studio\` (override with `PLAYWRIGHT_ARTIFACT_DIR`).
They must never land inside `V:\monorepo`. Proof screenshots go to `D:\screenshots\`.

## Skipped tests (intentional)

Two groups are skipped on purpose:

1. **Multi-file approval behavioral tests (8)** — the modal only opens when the AI execution
   engine proposes a multi-file edit plan; there is no trigger mechanism yet. The tests are
   implemented and ready to activate (see "Activating Tests" below).
2. **Agent Mode execution flows (15)** — sending an agent message runs the task planner
   through `UnifiedAIService` → backend AI proxy (`:5004`), which requires a live provider
   key and returns non-deterministic plans. These stay skipped until a deterministic
   plan-response mock (or recorded fixture) for the planner exists. The skipped bodies
   already target the selectors the product renders (`agent-task`, `step-card`,
   `step-status[data-status]`, `/Task completed successfully/`).

The Ctrl+K inline-edit generation flows are NOT skipped: they mock the AI proxy at the
network boundary (`mockAiCompletion`/`mockAiFailure`), which is deterministic because the
inline edit consumes the raw completion text.

## Selector conventions

- Prefer `data-testid`. Key ids: `app-container`, `chat-input`, `mode-chat`, `mode-agent`
  (active state via `aria-pressed`), `agent-empty-state`, `agent-task`, `step-card`,
  `step-status` (+ `data-status`), `clear-chat`, `inline-edit-dialog`, `instruction-input`,
  `diff-view`, `accept-button`, `reject-button`, `error-message`, `retry-button`,
  `multi-file-approval`, `screenshot-to-code-panel`, `screenshot-upload-zone`, and the
  StatusBar toggles (`status-screenshot-toggle`, `status-terminal-toggle`,
  `status-tasks-toggle`, `status-chat-agent-toggle`, `status-sidebar-toggle`, ...).
- The AIChat root does **not** render a `data-testid` (the `data-testid="ai-chat"` prop set
  in AppLayout is not forwarded to the DOM) — anchor on `chat-input` instead.
- The "Review Agents" StatusBar button (EnhancedAgentMode overlay) only renders when
  `VITE_ENABLE_REVIEW_AGENTS=true`; the primary agent surface for tests is AIChat Agent
  Mode via Ctrl+Shift+A or `status-chat-agent-toggle`.

## Gotchas

- **Ctrl+K focus**: the binding uses `react-hotkeys-hook` without `enableOnFormTags`, so it
  does not fire while Monaco's hidden textarea has focus. Tests blur the editor before
  pressing Ctrl+K (see `openInlineEdit` in `cmd-k-inline-editing.spec.ts`).
- **Cold dev server**: the first page load can exceed 30s while Vite transforms the module
  graph for parallel workers; the global test timeout is 120s and `gotoAppShell` waits up
  to 60s for the shell.

## Multi-File Approval Tests — Activating

To activate once AI triggers are ready:

1. Remove the `.skip` from tests in `multi-file-approval.spec.ts`
2. Add a helper that triggers the modal via the AI execution engine:

```typescript
async function triggerMultiFileEdit(page: Page) {
  await page.getByTestId('chat-input').fill('Refactor these components into a shared utility');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="multi-file-approval"]');
}
```

| Element            | Test ID               |
| ------------------ | --------------------- |
| Modal Container    | `multi-file-approval` |
| Apply Button       | `apply-button`        |
| Reject Button      | `reject-button`       |
| Accept File Button | `accept-file-button`  |
| Reject File Button | `reject-file-button`  |

## Best Practices

1. Import `test`/`expect` from `fixtures/auth.ts` (auth mock is mandatory)
2. Use `data-testid` for element selection; assert state via attributes (`aria-pressed`,
   `data-status`), not CSS classes
3. Mock AI at the proxy boundary (`mockAiCompletion`), never inside product code
4. Test user flows, not implementation details; keep tests independent

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- `docs/RUNTIME_DIAGNOSIS.md` — AI proxy architecture and Wave 2 agent UX consolidation
