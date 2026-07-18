# Continuation goal — Vibe Code Studio dead-panel / module-split slice

**Date:** 2026-07-18  
**Owner lane:** `apps/vibe-code-studio/**` only  
**Landed commit:** `df30328c` on branch **`feat/vibe-shop-content-seo` only**  
**Prior handoff (still useful for install/UX verify):** `docs/CONTINUATION-2026-07-17-file-explorer.md` (on that branch)

---

## Paste into AGENTS.md → Current task

```text
- Target: Continue vibe-code-studio after dead-panel removal commit df30328c on feat/vibe-shop-content-seo — land hook/path leftovers, re-verify product UX, then either open a PR for the VCS slice or finish remaining soft-limit splits / e2e unskips.
- Outcome: Working tree for VCS is intentional and green; pre-commit Windows ESLint path normalization is committed if still needed; user-visible Open Folder / Agent plan / Ctrl+K paths verified; branch history is ready for PR or next product slice without mixing monorepo-wide dirt.
- Acceptance criteria:
  1) `git checkout feat/vibe-shop-content-seo` and `git rev-parse --short HEAD` is `df30328c` (or a descendant that only adds intentional follow-ups).
  2) `pnpm nx typecheck vibe-code-studio`, `pnpm nx test vibe-code-studio`, `pnpm nx build vibe-code-studio` green; `pnpm nx e2e vibe-code-studio` ≥25 pass with only documented skips.
  3) Any remaining VCS-related unstaged files (`src-tauri` log path, `vitest.config.ts` Vitest 4 `maxWorkers`) are either committed with coverage or deliberately discarded after review.
  4) `scripts/pre-commit.ps1` ESLint batch does not reintroduce Windows “pattern v” failures (forward-slash relative paths + `--` before file args if still required).
  5) No bulk commit of non-VCS dirty tree; no push/PR unless user explicitly asks in-session.
  6) Optional product: soft-limit shrink of App.tsx / useAppEffects / Sidebar; unskip e2e that now have planner mocks; PerformanceMonitor only if re-touched with 100% diff coverage.
- Allowed destructive/network actions: local checkout/commit/stash of VCS+hook files only; delete/orphan verified wrong-branch leftovers after confirming content is on feat tip; no remote write, push, PR, publish, or deploy without explicit user approval.
```

---

## Session start checklist (next agent)

1. **Read this file** and root `AGENTS.md`.
2. **Confirm branch:** must work on `feat/vibe-shop-content-seo` @ `df30328c` (or successor).  
   If the workspace is on another branch (e.g. `chore/electron-csp-and-worktree-cleanup`), **do not** implement VCS features there — switch or use a worktree.
3. **Do not** stage the monorepo-wide dirty tree (~200–400 files). Only `apps/vibe-code-studio/**` (+ optional `scripts/pre-commit.ps1` hook fix).
4. Re-run gates before any new commit:
   ```powershell
   pnpm nx typecheck vibe-code-studio
   pnpm nx test vibe-code-studio
   pnpm nx build vibe-code-studio
   pnpm nx e2e vibe-code-studio
   ```
5. Diff coverage: never use `COVERAGE_GATE=off` unless the user explicitly chooses that escape hatch.

---

## What landed in `df30328c` (review summary)

| Area          | Change                                                                                                                                                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Size          | 152 files, **+4,883 / −13,157**                                                                                                                                                                                                                                                                       |
| Deletes       | Dead/orphan UI: AICodeEditor, CodeQualityPanel, AIProviderSelector, CustomInstructionsPanel, RulesEditor, TaskMonitorPanel, WorkspaceTemplatesPanel, GitDiffViewer, ModelSelector, RemoteStatusBar, Sidebar subpanels (Agent/Context/Performance/Collapsible), AIProviderManager, LocalProvider, etc. |
| Splits / adds | `VisualPanelShell`, `GlobalSearch` split, `ComponentLibrary` split, `ErrorBoundary` wrappers, `monacoPreload`, `lazyRetry` / `withLazyLoading` / `LazyComponents.lazy`, `fileTreeWalker`, UI hooks (`useDialog`, `useContextMenu`, `card.styles`), health helpers in `useAppEffects`                  |
| Tests         | Large unit coverage set for new modules; e2e fixtures (`tests/fixtures/auth.ts`); screenshot-to-code e2e; agent/cmd-k specs tightened; deepseek mock removed                                                                                                                                          |
| Docs          | `BUTTON_AUDIT.md`, `RUNTIME_DIAGNOSIS.md`, older `CONTINUATION-2026-07-17-file-explorer.md`, PROJECT_GUIDE touch                                                                                                                                                                                      |

### Validation already proven (2026-07-18 session)

| Check                                       | Result                    |
| ------------------------------------------- | ------------------------- |
| Pre-commit (full gates, 100% diff coverage) | Passed on commit          |
| `pnpm nx build vibe-code-studio`            | Pass                      |
| `pnpm nx e2e vibe-code-studio`              | **25 passed, 23 skipped** |

### Soft-limit debt still on tip (lines, approximate)

| File                             | ~Lines | Note                         |
| -------------------------------- | ------ | ---------------------------- |
| `src/App.tsx`                    | ~624   | Soft 500                     |
| `src/app/hooks/useAppEffects.ts` | ~596   | Soft 500                     |
| `src/components/Sidebar.tsx`     | ~789   | Soft 500; hard 1000 headroom |

---

## Open work (priority order)

### P0 — orientation / hygiene

1. **Checkout the correct branch** before editing. Commit `df30328c` exists **only** on `feat/vibe-shop-content-seo` (not on `main`, not on current chore branches).
2. If working tree is on another branch with VCS-shaped leftovers:
   - `apps/vibe-code-studio/src-tauri/src/lib.rs` — diag log → `D:\logs\vibe-code-studio\rust-sidecar.log` (feat tip already has a similar paths-policy version; reconcile, don’t double-apply blindly).
   - `apps/vibe-code-studio/vitest.config.ts` — Vitest 4 deprecation: `poolOptions.forks` → `maxWorkers: 2`. Prefer landing this on the feat branch with a one-line config commit if not already equivalent on tip.
3. **Hook hardening (if still needed after retest):** during the land session, ESLint batch failed with `No files matching the pattern "v"` when absolute Windows paths hit ESLint globs. A stronger normalize (forward slashes + `--` before file args + drop empty/`.` paths) was applied on disk in that session; **verify whether feat tip still needs it** — tip already has `GetRelativePath` but may lack `--` / slash normalize. Re-prove with a tiny staged lint batch if unsure.

### P1 — product verification (manual / installed)

From 07-17 continuation:

- [x] **Open Folder** — unit coverage for `runOpenFolderDialog` (native picker → path normalize → index; cancel/abort/fallback). Installed Tauri smoke still optional.
- [ ] **Agent mode** plans past `agent_plan_v1` JSON salvage (no old “violated JSON contract after JSON” unless a new error) — still needs installed-app/AI path check.
- [x] **Ctrl+K** inline edit — e2e suite green (open, generate, accept/reject, Esc).

Runtime context (see `RUNTIME_DIAGNOSIS.md` on feat branch): AI path is sidecar `:5004` + session cookie; free-tier walls and stale packaged backend are known footguns.

### P2 — next engineering slices (only if user wants product progress)

1. Soft-limit splits for App / useAppEffects / Sidebar — **done** (useAppEffects barrel + siblings; App context/open-folder extract; Sidebar styles/tree/menu). App/Sidebar still ~510–520 (soft 500; hard 1000 OK).
2. Unskip E2E that need deterministic planner mocks (23 skips); native sqlite for 22 skipped unit tests.
3. Competitive-gap / Wave debt called out in 07-17 doc (specs 12/13/14, WorkspaceService analysis stubs, etc.).
4. If `PerformanceMonitor` styling (`right: 390`) is re-introduced: cover every added executable line (prettier once re-broke diff coverage).

### P3 — release process

- Branch name is **`feat/vibe-shop-content-seo`** but content is **VCS refactor** — rename branch before PR if user wants a truthful PR title/URL, or open PR with a clear title that overrides the branch name.
- **No push/PR** unless explicitly requested.
- Do **not** squash-merge unrelated monorepo dirt into this slice.

---

## Explicit non-goals / do-not

- Do not commit the whole dirty monorepo tree.
- Do not use `COVERAGE_GATE=off` or `--no-verify` for convenience.
- Do not resurrect deleted dead panels without a product request.
- Do not treat “build green on wrong branch” as validation of `df30328c`.
- Crypto/trading and other apps are out of scope unless user unlocks them.

---

## Suggested next-session prompt (copy-paste)

```text
You are continuing Vibe Code Studio work after commit df30328c
(refactor: remove dead panels and split modules) on branch
feat/vibe-shop-content-seo ONLY.

Read:
- apps/vibe-code-studio/docs/CONTINUATION-2026-07-18-dead-panel-slice.md
- apps/vibe-code-studio/docs/CONTINUATION-2026-07-17-file-explorer.md
- apps/vibe-code-studio/docs/RUNTIME_DIAGNOSIS.md
- root AGENTS.md

First actions:
1) git checkout feat/vibe-shop-content-seo && git rev-parse --short HEAD  # expect df30328c or descendant
2) git status --short -- apps/vibe-code-studio scripts/pre-commit.ps1
3) Re-run typecheck, test, build, e2e for vibe-code-studio

Then, in order unless I reprioritize:
A) Reconcile any leftover vitest maxWorkers + rust sidecar log-path diffs onto this branch with tests/gates
B) Confirm pre-commit ESLint batch is Windows-safe (no pattern "v"); harden and commit only if retest fails
C) Manual/product verify Open Folder, Agent plan JSON, Ctrl+K
D) Stop and report; wait for me before PR/push or soft-limit refactors

Constraints: VCS paths only (+ hook if needed); 100% diff coverage; no bulk dirty commit; no remote writes without explicit ask.
```

---

## Session notes (2026-07-18)

- User chose **option 2**: fill 100% diff coverage (not `COVERAGE_GATE=off`).
- Coverage filled progressively; `PerformanceMonitor` was left unstaged when prettier re-opened coverage holes.
- Commit succeeded after ESLint batch path handling; build + e2e green immediately after.
- Later workspace checkout moved to **`chore/electron-csp-and-worktree-cleanup`** with a large unrelated dirty tree — agents must re-orient to **feat/vibe-shop-content-seo** before continuing this goal.
- Active project lock: none (`activeProject: null`) as of handoff write.
