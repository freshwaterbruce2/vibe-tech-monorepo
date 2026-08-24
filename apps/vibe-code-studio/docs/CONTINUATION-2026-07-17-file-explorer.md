# Continuation: Vibe Code Studio session handoff (2026-07-17)

## Current state — everything green, installer fresh

- **Installer**: `D:\cargo-targets\release\bundle\nsis\Vibe Code Studio_1.2.3_x64-setup.exe`
  built 2026-07-17 12:39 PM. Contains ALL fixes below. User should install this one.
  Never point installs at `V:\` (ReFS — MSI `Config.Msi` Error 5); NSIS installs per-user to C:.
- **Gates**: lint 0 errors/0 warnings (zero eslint-disables), typecheck clean,
  2,654 unit tests pass (22 skipped), E2E 25 pass / 0 fail / 23 documented skips.
- Cargo target dir is `D:\cargo-targets` (app's `src-tauri/target` stays empty).
- Vite production build can OOM-crash (exit 4294967295) right after big test runs — retry
  with `$env:NODE_OPTIONS = "--max-old-space-size=8192"`.
- `vibe-code-studio:test` is occasionally flaky under `nx run-many` parallel load — rerun
  sequentially before believing a failure.

## Fixed this session (2026-07-16 → 07-17)

1. Full review remediation (see report artifact "Vibe Code Studio — Full Review"):
   E2E suite repaired (31 fail → 0; shared fixture `tests/fixtures/auth.ts`), 64 lint
   warnings → 0, 42 dead files deleted, StatusBar Wave-2 alignment (Tasks → Agent Manager,
   Review gated by `VITE_ENABLE_REVIEW_AGENTS`), VisualPanelShell wired, Ctrl+K bound
   natively in Monaco, GlobalSearch Escape, mojibake icon, overlay stacking, token budgets,
   boot-cost regression test. Smoke-test users purged from `D:\databases\vibe_studio.db`.
2. **Agent-mode planner** (`AgentPlan.ts::parseStructuredPayload` + 8 tests): salvages the
   first balanced JSON object when providers append fences/commentary after the plan
   (fixes "Provider violated the agent_plan_v1 JSON contract ... after JSON").
3. **Open Folder native picker** (`App.tsx::handleOpenFolderDialog`,
   `WelcomeScreen.tsx::handleOpenFolder` + 3 tests): removed the "if Tauri → manual
   text-entry dialog" short-circuit; both entry points now call the native Windows picker
   via the shim (`tauriShim.ts::dialog.openFolder`, permission `dialog:allow-open` already
   granted); manual "Enter Folder Path" remains only as failure fallback; paths normalized
   to forward slashes.

## Open items / what the user should verify in the new installed build

- [ ] Open Folder from Desktop pops the native Windows picker and the workspace indexes.
- [ ] Agent mode task runs past planning (the JSON-contract error is fixed; if it fails
      again the error text will be different — investigate fresh).
- [ ] Ctrl+K inline edit works while typing in the editor (new Monaco binding).

## Known roadmap debt (not blockers, from the review's P2)

- 22 skipped unit tests need a native sqlite runner; 23 E2E skips need a deterministic
  planner mock (spec bodies already use current selectors).
- Agent rollback intentionally reports "needs new approval"; Wave-1 no-mock debt
  (`WorkspaceService` analysis, `triggerAiCompletion` stub); competitive-gap specs 12/13/14.

## Standing constraints

- Branch `feat/vibe-shop-content-seo`; ~400 uncommitted files are an INTENTIONAL held
  refactor — do not commit unless the user asks (memory: `monorepo-uncommitted-refactor`).
- Repo rules: no placeholders, files ≤500 lines, lines ≤100 chars, 100% diff coverage at
  commit time, `pnpm --filter` (never bare install in app dirs), PowerShell / Windows 11.
