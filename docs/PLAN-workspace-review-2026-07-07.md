# Workspace Review & Fix Plan — 2026-07-07

Full review of `V:\monorepo` (all apps/packages/backend/scripts) plus the `D:\` data drive.
Method: 7 parallel review agents (working-tree triage, hygiene/path-policy sweep, secrets sweep,
TODO/placeholder debt, D:\ audit, PR-backlog triage, nova-agent CI diagnosis) + direct CI-log and
health-tool verification. Every finding below has a concrete fix, an owner, and a verification
step. **Nothing in this plan is a dangling TODO — each item is either executable now or explicitly
assigned to Bruce with the exact command.**

Owners: `[agent]` = Claude in a fix session, `[Bruce]` = requires credentials/GUI/human judgment.

---

## Executive summary

| Area                      | State                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| main branch CI            | GREEN (last merge #77 passed)                                                                                                                  |
| PR #80 (batch-2 campaign) | RED — 3 root causes, all diagnosed, all fixable (see P0)                                                                                       |
| Branch discipline         | feat/vcs-lsp is **61 commits ahead of origin/main** (rule: merge every ~10)                                                                    |
| Working tree              | ~35 dirty/untracked files — triaged into 9 clean commit groups, zero mystery files                                                             |
| PR backlog                | 10 open PRs — 1 pure duplicate, 2 trivially mergeable, 3 need rebase only                                                                      |
| Secrets                   | Tree clean except 1 tracked Firebase web key; 2 past leak rotations still pending                                                              |
| TODO debt                 | Only **3 real TODOs** repo-wide + ~10 placeholder stubs (exceptional)                                                                          |
| Path policy (V:\)         | 396 MB `_backups\` + ~1 GB build artifacts on V:\; 52 MB uploads git-tracked                                                                   |
| D:\ drive                 | 656 GB free, DBs healthy; **snapshot backups dead since 2026-03-19**; ~2.3 GB prunable; `D:\data` = 50 GB / 908k files (needs breakdown audit) |
| Health tooling            | 2 of 3 monorepo-health scripts crash; d-drive script has 2 bugs                                                                                |
| Disk                      | V:\ 25 GB free, D:\ 656 GB free — no pressure                                                                                                  |

---

## P0 — Unblock PR #80 CI (do first, in this order)

PR #80 fails three independent gates. All three are diagnosed to the exact line.

### P0.1 Commit the staged lint fix `[agent]`

The `Quality Gates → Lint (affected)` failure is 2 unused `eslint-disable` directives
(`react-hooks/exhaustive-deps`) in `ApiKeySettings.tsx:356` and `CodeQualityPanel.tsx:44`,
failing under `--max-warnings=0`. The fix is **already staged locally** (useCallback/useMemo
refactor that makes the directives unnecessary, plus suppression prune and a new test):

- `apps/vibe-code-studio/src/components/ApiKeySettings.tsx`
- `apps/vibe-code-studio/src/components/CodeQualityPanel.tsx`
- `apps/vibe-code-studio/eslint-suppressions.json`
- `apps/vibe-code-studio/src/__tests__/components/ApiKeySettings.test.tsx` (new)

Step: commit as `fix(vibe-code-studio): resolve exhaustive-deps without disable directives`, push.
Verify: `pnpm nx lint vibe-code-studio` clean locally; Quality Gates green on re-run.

### P0.2 Fix nova-agent CI build (Agent Verification Gate) `[agent]`

Root cause (confirmed from CI log run 28832443749): `apps/nova-agent/src-tauri/.cargo/config.toml`
is **git-tracked and hardcodes the local machine's MSVC path**
(`C:\Program Files\Microsoft Visual Studio\18\Community\...\14.44.35207\...`) as linker/CC/env pins.
GitHub runners have VS2022 at a different path → `error: linker 'link.exe' not found` → cargo dies
compiling `proc-macro2` → `nova-agent:build` fails → typecheck gate fails.

Two fixes, both required:

1. `apps/nova-agent/src-tauri/.cargo/config.toml` — delete the `[target.x86_64-pc-windows-msvc]`
   linker/rustflags overrides and the `CC/CXX/INCLUDE/LIB/VCINSTALLDIR/VCToolsVersion` env pins.
   Cargo auto-detects MSVC via vswhere. If this machine needs the pin locally, it goes in
   `%USERPROFILE%\.cargo\config.toml` (untracked), never the repo.
2. `apps/mcp-rag-server/project.json` — add `"dependsOn": []` to its `typecheck` (and `test`)
   targets. Why: `nx.json` `typecheck.dependsOn: ["^build"]` + mcp-rag-server's tsconfig include of
   `../nova-agent/src/rag/**/*` drags the **full native Tauri bundle** into a pure-TS gate.
   mcp-rag-server consumes raw `.ts` source only; it never needs the built artifact.

Verify: `pnpm nx typecheck mcp-rag-server` runs without scheduling `nova-agent:build`;
Agent Verification Gate green on re-run.

### P0.3 Review bot hard-fails on large PRs `[agent]` + secret `[Bruce]`

Two independent problems:

- Code: `GitHubService.getPullRequestDiff` (`apps/vibe-code-studio/src/services/GitHubService.ts:141`,
  fetch at `:330`) uses the single-diff API which errors 406 when the diff exceeds 20,000 lines
  (PR #80 does). Fix: fall back to the paginated _files_ API
  (`GET /repos/{o}/{r}/pulls/{n}/files?per_page=100`, iterate pages, reconstruct per-file patches)
  and cap per-file review at a sane size; if even that overflows, post a "PR too large to review,
  reviewed N of M files" comment instead of crashing. Wire into
  `src/services/review/orchestrator.ts:60`. Add a test with a mocked 406.
- Secret: CI shows `OPENROUTER_API_KEY:` and `DEEPSEEK_API_KEY:` **empty**. Even with the 406 fixed
  the bot cannot call a model. `[Bruce]`:
  `gh secret set OPENROUTER_API_KEY --repo freshwaterbruce2/vibe-tech-monorepo` (funded key).

### P0.4 Land the rest of the dirty tree as clean commits `[agent]`

The 9 triaged groups (commit separately, in this order — each is self-contained):

| Group          | Files                                                                                                                                                                            | Commit message                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| G (P0.1 above) | 4 staged VCS files                                                                                                                                                               | `fix(vibe-code-studio): exhaustive-deps refactor`                                                          |
| B              | `desktop-bridge/package.json`, `desktop-bridge/index.js`                                                                                                                         | `feat(desktop-bridge): Fastify 5 + @fastify/websocket v11 migration`                                       |
| C              | `apps/desktop-commander-v3/src/Logger.ts`, `src/tests/Logger.test.ts`                                                                                                            | `fix(desktop-commander-v3): route debug/info logs to stderr (MCP stdout safety) + regression test`         |
| D              | `apps/memory-mcp/src/rag-bridge.ts`, `src/http-transport.ts` (new), `docs/reference/SYSTEM_SURFACES.md`                                                                          | `feat(memory-mcp): streamable-HTTP transport + ESM __dirname fix`                                          |
| E              | `scripts/cleanup-processes.ps1`, `scripts/verify-mcp-servers.ps1`, `scripts/mcp-diagnostics/mcp-diagnostic-1-config.ps1`, `-2-logs.ps1`, `scripts/start-chrome-devtools-mcp.ps1` | `fix(scripts): MCP script hardening (protected process types, ASCII output, cmd /c npx)`                   |
| F              | `tools/mcp-sync/sync.mjs`, `tools/mcp-sync/README.md`                                                                                                                            | `feat(mcp-sync): vscode-json emit target`                                                                  |
| A              | `.github/dependabot.yml` + 6 package.json bumps + `requirements.txt` + `chunk-01-scaffold.md` + `tools/vectorshift-svg/package.json`                                             | `chore(deps): grouped dependabot config + version bumps (electron 39, fastify 5, next 16.2, MCP SDK 1.27)` |
| H              | `WORKSPACE.json`, `apps/nova-agent/tsconfig.json`, `apps/vibe-tutor/tsconfig.app.json`, `packages/shared-config/src/index.ts`, `.gitignore`                                      | `chore(workspace): registry refresh, build-graph refs, ESM export fix, ignore coverage-*`                  |
| —              | `apps/vibe-code-studio/FEATURE_SPECS/FINISH-CAMPAIGN-PRD.md` (new)                                                                                                               | ride with G or standalone `docs(vibe-code-studio): finish-campaign PRD`                                    |

Untracked leftovers — dispose deliberately (no silent sweeping):

- `.mcp-fleet-staging/` — throwaway staging; its `http-transport.ts` is byte-identical to the copy
  already at `apps/memory-mcp/src/http-transport.ts`. **Delete the dir**; if
  `Prepare-McpFleet.ps1`/`Start-MemoryMcp.ps1` are wanted, move into `scripts/` first. Add
  `.mcp-fleet-staging/` to `.gitignore` so it can't be committed if it reappears.
- `.claude/workflows/` — 4 byte-identical stub JS files (mc-dashboard port planning). Hold: either
  differentiate and commit deliberately, or delete the stubs. Do not commit as-is.
- `apps/crypto-enhanced/.plan-persistence-fix.md` — local scratch plan; keep local (it's a
  dotfile), reference it when the crypto persistence fix is scheduled (see P6.4).

Also: unpushed commit `989872c4` has a malformed subject (`@ chore(mcp): ...` — stray `@ ` prefix).
It is unpushed, so a reword is possible via rebase — **only if Bruce approves history edit**;
otherwise push as-is (cosmetic).

Verify: `git status --short` empty except intentionally-held items; push; PR #80 shows all green.

---

## P1 — PR backlog: 10 → ~4 open PRs

Verified with `merge-base --is-ancestor` + file-diff analysis, not title-reading. Order matters.

| Step | PR                                           | Action                                                                                                                    | Why                                                                                           |
| ---- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1    | **#78**                                      | `[Bruce or agent]` CLOSE                                                                                                  | All 26 commits are ancestors of #80 — a strict subset, zero unique work, worse CI             |
| 2    | **#66** (security deps)                      | `[Bruce]` MERGE NOW                                                                                                       | Clears 126 Dependabot alerts; CI effectively green (only non-blocking Greptile); unblocks #72 |
| 3    | **#69** (docs)                               | `[Bruce]` MERGE NOW                                                                                                       | Single README file, substantive checks green                                                  |
| 4    | **#63**                                      | `[agent]` cherry-pick its 7 novel security/CodeQL commits (~231/−33 lines) onto a fresh branch → small PR; then CLOSE #63 | 27k-line stale draft whose real content is ~250 lines                                         |
| 5    | **#80**                                      | after P0: FIX-THEN-MERGE to main                                                                                          | The canonical batch-2 PR; landing it resets the 61-commits-ahead problem                      |
| 6    | **#65** (MCP cleanup + Moonshot key removal) | `[agent]` rebase onto main, fix its 4 gate failures, merge                                                                | Security-relevant, 13 days stale, 101 commits behind                                          |
| 7    | **#62**                                      | `[agent]` rebase onto main, re-run CI                                                                                     | Mechanical lint-only chunks 2-4, author-validated; stale-branch noise explains failures       |
| 8    | **#61**                                      | `[agent]` rebase — only 1 novel commit survives (`d421376b` nova-agent SQLite WAL hardening)                              | Rest already landed via other PRs                                                             |
| 9    | **#72** (Electron 39)                        | rebase after #66 lands (sheds the duplicate bump conflict); stays draft until `[Bruce]` smoke-tests the desktop apps      | Explicitly smoke-test-gated                                                                   |
| 10   | **#73** (maintenance-copilot)                | KEEP DRAFT; retarget/rebase to main (its old base branch already merged)                                                  | Write-side incomplete by design                                                               |

Repo-wide issue discovered here: **Vercel preview checks fail on unrelated PRs**
(`appointment-reminder-saas`, `dev`, `proposal-review-saas`, `vibe-tech-org`). `[Bruce]` decide:
fix the Vercel project links or disconnect those preview integrations so they stop polluting
every PR. Until then, treat those 4 checks as noise.

Stash cleanup `[agent]`: 6 stashes exist. Drop the two `lint-staged automatic backup` stashes
after confirming their content is in HEAD; inspect `stash@{2}` (docs leftovers), `stash@{3}`
(pre-docs local changes), `stash@{4}` (nx.json temp), `stash@{5}` (auto-docs temp) with
`git stash show -p` — apply anything still wanted, then drop. Target: 0 stashes.

---

## P2 — Fix the health tooling that this review broke on

All in `V:\monorepo\scripts\`, all `[agent]`, all small:

1. `workspace-health.ps1:4` and `database-health.ps1:5` — the `$OutputPath` param default uses
   `$PSScriptRoot`, which is **empty during param-default evaluation under
   `powershell.exe -File`** (Windows PowerShell 5.1, which the monorepo-health MCP server uses).
   Fix: default the param to `$null` and compute the path inside the body
   (`if (-not $OutputPath) { $OutputPath = Join-Path ... }`). Both scripts, same pattern.
2. `d-drive-health.ps1:106` — crashes (`op_Subtraction`) when the backup dir has 0 snapshot
   subdirs (`$oldest` is null). Guard: `if ($backupCount -gt 0) { ... }`.
3. `d-drive-health.ps1:99` — checks `D:\_backups`, but the real backups live in **`D:\backups`**
   (that's why it reported "0 snapshots"). Point it at `D:\backups` (and/or
   `D:\repositories\vibetech` for snapshot freshness — see P4.2).
4. Same script's disk line prints "656.06 GB free of GB" — total-size variable is empty; fix the
   interpolation while in there.
5. Consider switching the monorepo-health MCP server to invoke `pwsh.exe` instead of
   `powershell.exe` (repo standard is PowerShell 7+); the 5.1-only bugs then can't recur.

Verify: all three MCP tools (`get_workspace_health`, `get_database_health`, `get_d_drive_health`)
return success with correct numbers.

---

## P3 — V:\ hygiene & path policy

1. **Tracked user uploads (only >5 MB tracked files in the repo)** `[agent]`:
   `apps/ai-avatar-youtube-saas/public/uploads/` — 7 identical 7.42 MB PNGs (~52 MB) committed.
   `git rm --cached` them, add `apps/ai-avatar-youtube-saas/public/uploads/` to `.gitignore`,
   serve uploads from `D:\data\` or blob storage. History rewrite to reclaim the 52 MB is
   **deferred** and bundled with the security history-scrub in P5.2 (one filter-repo pass, not two).
2. **`V:\monorepo\_backups\` (396.5 MB)** `[agent]`: move all 20 archives to `D:\backups\monorepo-_backups\`
   (`Move-Item V:\monorepo\_backups\* D:\backups\monorepo-_backups\`), delete the dir. Data never
   lives on V:\.
3. **Build artifacts on V:\ (~1 GB)** `[agent]`: purge now —
   `.next/` caches (ai-avatar-youtube-saas 218 MB sst + vibe-shop ~150 MB),
   `apps/vibetech-command-center/release/` (~310 MB Electron output),
   stale Tauri sidecar binaries where rebuildable, `apps/vibe-tutor/android/**/app-debug.apk` (35 MB).
   These are ignored by git so deletion is safe; they regenerate on next build. Python `.venv`
   trees stay (rebuilding is slow) but note them in the next cleanup pass.
4. **WORKSPACE.json drift** `[agent]`: 6 phantom apps listed (`dap-proxy`, `ipc-bridge`,
   `lsp-proxy`, `openrouter-proxy`, `prompt-engineer-app`, `workflow-engine` — not on disk),
   3 real apps missing (`ai-avatar-youtube-saas`, `maintenance-copilot`, `vibe-flow`). The dirty
   Group-H edit already adds 2 of the 3 and fixes backend paths — finish the job in the same
   commit: add `vibe-flow`, remove the 6 phantoms, and regenerate the list from
   `pnpm nx show projects` so it matches reality.
5. **Root junk** `[agent]`: delete `nul`, `.npmrc.bak`, `_diskscan_results.txt`,
   `_diskscan2_results.txt`, `_finalscan_results.txt`, `_localscan_results.txt`,
   `_userscan_results.txt`, stale root `dist/` (11.8 MB), `tmp/`, `coverage/`,
   `playwright-report/`, `test-results/`. `git rm -r --cached scratch/` + gitignore it.
6. **Tool caches writing _.db/_.log inside the tree** `[agent]`: set `NX_CACHE_DIRECTORY=D:\cache\nx`
   (the `.nx/workspace-data` daemon.log is already 12.5 MB) and mypy `cache_dir` (in the two
   affected projects' mypy config) to `D:\cache\mypy`. These are the only in-tree policy hits
   outside node_modules.

Verify: `.\scripts\check-vibe-paths.ps1` clean;
`Get-ChildItem V:\monorepo -Recurse -Include *.db,*.sqlite` returns nothing outside caches.

---

## P4 — D:\ drive fixes & prunes (~2.3 GB reclaim, 2 discipline repairs)

1. **`D:\active-project\active-project.json` missing** — the dir exists (only `history\` inside).
   Since no project lock is currently intended, `[agent]` write the explicit null state
   (`{ "activeProject": null }`) so `pnpm project:status` and the pre-commit hook read cleanly
   instead of erroring on a missing file. `[Bruce]` run `pnpm project:start <name>` when he next
   wants a lock.
2. **Snapshot discipline dead**: `D:\repositories\vibetech` newest snapshot = **2026-03-19**
   (3.5 months). `[agent]` run `scripts\version-control\Save-Snapshot.ps1 -Description "Post workspace-review baseline 2026-07-07"`
   and diagnose why the schedule stopped (check Task Scheduler / cron entry that used to drive it);
   re-register the job. `[Bruce]` confirm the scheduled task is allowed to run.
3. **Prunes** `[agent]` (in order of payoff):
   - `D:\backups\skills-consolidation_20260626_102909` (1.27 GB) +
     `skills-textonly_20260626_104232` (414 MB) — one-time skill-migration backups from 06-26;
     the migration is stable (per memory: junction layout live). Delete → 1.68 GB.
   - `D:\databases\backups` — keep last 3 + one weekly of `memory.db` / `agent_learning.db`
     copies, delete the rest → ~0.4–0.5 GB. Then add retention to whatever job writes them.
   - `D:\temp` — delete files >30 days (786 files, 96.5 MB); investigate the `1979-12-31`-dated
     orphans while there.
   - `D:\logs` — delete >60 days (60 files, 27 MB); add age-based pruning for `monitor_service`
     and `nova-agent` (largest producers) to the weekly `Quick-Cleanup.ps1`.
   - `D:\cache\.npm` (stale since 04-20) and `.genkit` (05-28) — clear.
4. **`D:\data` breakdown audit** `[agent]` — long-path-safe measurement (`robocopy /L`):
   **55.4 GB / 1,169,191 files / 171k dirs** — the overwhelming majority of bytes AND object
   count on the drive. Notably, `Get-ChildItem` undercounts it by ~261k files (~5.4 GB): those
   are `node_modules` paths exceeding the 260-char Windows limit, which **naive backup/copy tools
   will silently skip or break on** — confirmation the tree is full of embedded `node_modules`
   (top level includes `models`, `temp-install`, `graphify`, many `vibe-*` dirs). It also
   dominates every backup/scan pass (it's why recursive enumeration stalls). Not urgent (656 GB
   free) but do a per-subdir metadata pass — `robocopy <dir> NULL /L /E /NFL /NDL /NJH /BYTES`
   per top-level subdir, read the Bytes/Files summary — then prune prime suspects first:
   `temp-install`, stray `node_modules`, superseded `models` weights. Use long-path-aware tools
   (robocopy, not Get-ChildItem/Explorer) for any move/delete here.
5. Healthy, no action: DB WAL sizes normal, no zero-byte DBs, no deprecated `D:\learning`,
   `D:\learning-system` active, 656 GB free.

---

## P5 — Security (mostly `[Bruce]` — credentials required)

1. **Key rotations still outstanding** (in-tree removal done, rotation NOT done):
   - Gemini key from the `list_models.py` incident (2026-07-04) — rotate at Google AI Studio.
   - Moonshot key from the vibe-justice incident (2026-06-24) — rotate at Moonshot; the literal
     still exists in git history on origin/main + branches.
2. **History scrub** — one `git filter-repo` pass covering: the Moonshot key literal, the Gemini
   key literal, and the 52 MB of upload PNGs (P3.1). `[Bruce]` schedules it (it force-rewrites
   main; all clones must re-pull). `[agent]` can prepare the exact filter-repo invocation and a
   pre-scrub `D:\` snapshot beforehand.
3. **Firebase web key** in `apps/serenity-flow/firebase-applet-config.json` (project
   `vibe-tech-openclaw`). Web API keys are identifiers, not secrets, **if** restrictions are on.
   `[Bruce]`: in Google Cloud console confirm HTTP-referrer restriction + Firebase Security Rules /
   App Check for that key; then either leave it (documented) or externalize to env.
4. **CI secrets** `[Bruce]`: `gh secret set OPENROUTER_API_KEY` (and optionally
   `DEEPSEEK_API_KEY`) for the review bot (P0.3).
5. **3 CodeQL highs** deferred from the batch-1 release remain open — fold into the #63
   cherry-pick PR (P1 step 4), which is already security-themed.
6. Everything else clean: no tracked `.env` with real values, no private keys, no `ghp_`/`xox`
   tokens, `.gitignore` coverage complete, both past incident literals absent from the working tree.

---

## P6 — Code debt (small, enumerated, so none of it is a "TODO")

1. **The 3 real TODO comments** — eliminate by doing or deleting `[agent]`:
   - `apps/vibe-justice/backend/vibe_justice/services/ai_service.py:266` + `:440` (duplicate
     deferral): "Add SSE streaming for reasoning display." Decision needed `[Bruce]`: implement
     SSE streaming (medium task, backend + frontend) or delete the comments and log it as a
     feature spec. Either way the comments go.
   - `apps/vibe-shipping/src/sw-registration.ts:3`: commented-out `pwaMetrics` import. Delete the
     dead comment (module was never created; nothing references it).
2. **Placeholder stubs in production paths** (~10 substantive) — each gets implement-or-delete:
   - `apps/vibe-shipping/src/services/advanced-offline-manager.ts:610` — returns a fabricated
     timestamp (`Date.now() - 3600000`). Replace with the real last-sync value it pretends to be.
   - `apps/vibe-shipping/src/stores/mapStore.ts:693` — route optimization unimplemented; remove
     the dead seam or implement.
   - `apps/nova-agent/src/services/featureFlags.ts:32,36`, `src-tauri/src/http_server.rs:146`,
     `src-tauri/src/modules/scheduler.rs:121` — stubbed flag service / placeholder HTTP payloads.
   - `apps/vibe-code-studio/src/services/ProactiveDebugger.ts:394` — stubbed AI path.
   - `apps/serenity-flow/src/components/AudioLayer.tsx:6` — SoundHelix placeholder audio URLs.
   - `apps/vibe-tech-lovable/src/components/lead/SmartLeadEnricher.ts:7` — enrichment stubbed.
     These are per-app product decisions — `[Bruce]` picks implement vs. remove per line; `[agent]`
     executes. Known exception: vibe-code-studio `MultiAgentReview` is mock **by design** (spec 15).
3. **Size-cap backlog**: 60 files over the 1000-line hard cap, 49 in the warn band
   (`docs/audits/line-limit-violations-2026-06-18.md`). Existing strategy stands (caps bite
   changed code; PRs #62/#63 are the cleanup vehicle). One fix now `[agent]`: exclude
   `**/htmlcov/**` from the audit report generator — 2 of the 60 are generated coverage HTML.
4. **crypto-enhanced persistence gap** — `apps/crypto-enhanced/.plan-persistence-fix.md`
   documents a missing `update_order_status` in the orders-persistence path. Schedule as its own
   fix session (financial code — human review required per CI/CD rules; **never** auto-fix).
5. **VCS spec campaign** (context, not drift): 4 specs DONE, 8 partial, 3 pending (12 DAP /
   13 remote / 14 notebooks), 2 deferred by design. The FINISH-CAMPAIGN-PRD committed in P0.4
   is the driving doc; continue per that campaign, separate from this hygiene plan.

---

## Suggested execution order

1. **Session 1 (agent, ~1 sitting):** P0.1 → P0.2 → P0.4 commits → push → P0.3 code fix →
   re-run PR #80 CI. Then P2 (health scripts) since it's 4 tiny edits.
2. **Bruce's 15-minute list:** set `OPENROUTER_API_KEY` secret · merge #66 · merge #69 ·
   close #78 · decide Vercel previews · approve P6 implement-vs-delete choices · rotate 2 keys.
3. **Session 2 (agent):** P1 steps 4-8 (cherry-pick #63, rebase #62/#61/#65, land #80) +
   stash cleanup.
4. **Session 3 (agent):** P3 (V:\ hygiene) + P4 (D:\ repairs & prunes) — mechanical, low-risk.
5. **Scheduled with Bruce:** P5.2 history scrub (coordinated force-push) · P6.4 crypto fix ·
   #72 Electron smoke test.

## Verification checklist (plan is done when all true)

- [ ] PR #80: all checks green; merged to main; `git rev-list --count origin/main..feat/vcs-lsp` ≈ 0
- [ ] `git status --short` clean; `git stash list` empty
- [ ] Open PRs ≤ 4, none stale >14 days without a disposition label
- [ ] All 3 monorepo-health MCP tools return success with correct data
- [ ] `check-vibe-paths.ps1` clean; no tracked file >5 MB; `_backups` gone from V:\
- [ ] `D:\active-project\active-project.json` exists (null state); fresh snapshot in `D:\repositories\vibetech` dated ≥ 2026-07-07
- [ ] `rg "TODO|FIXME" --type-add 'src:*.{ts,tsx,py,rs}' -t src` in production paths → 0 hits
- [ ] Both leaked keys rotated (Bruce confirms); history scrub scheduled or done

---

## P7 — Ship-readiness gaps from web research (added 2026-07-07, executed same session)

Ranked findings from a sourced 2026 best-practices sweep (full report with URLs in session log):

1. **pnpm CVE-2026-50021** `[agent — routed to chore/deps]`: pnpm ≤10.34.0 skips tarball
   integrity verification when a lockfile entry lacks `integrity:`, even under
   `--frozen-lockfile`. We pin 10.33.0 in `package.json` `packageManager` + `PNPM_VERSION` in
   ci.yml / nova-agent.yml / vcs-review.yml / path-segregation-gate.yml. Fix: bump all to
   **10.34.1**, regen lockfile under the fixed version.
2. **Renovate is dead config** `[agent]`: root `renovate.json` exists but the Renovate app has
   0 PRs ever (not installed). Dependabot is the active bot. Delete `renovate.json`.
3. **No CI build for shippable desktop apps** `[agent]`: only nova-agent (Tauri) and
   vibetech-command-center (Electron) package installers in CI; vibe-code-studio and vibe-tutor
   don't — a packaging regression ships silently. Add windows-latest build+artifact workflows.
4. **nova-agent.yml Rust caching** `[agent]`: uses raw actions/cache on target/ only — crates
   re-download every run. Swap to swatinem/rust-cache@v2 (registry+git+target, correct keys).
5. **Two release mechanisms configured, one active** `[agent]`: nx.json `release` block is
   unused (Changesets in ci.yml is authoritative). Remove the block.
6. **CI cache key gap** `[agent — routed to chore/deps]`: Nx cache keys hash only
   pnpm-lock.yaml; pnpm 10 reads hoisting config from pnpm-workspace.yaml → add it to hashFiles.
7. **Windows code signing absent** `[Bruce — decision + cert purchase]`: no Authenticode signing
   on any Tauri/Electron artifact (Android signing exists). 2026 guidance: OV cert or Azure
   Artifact Signing; Tauri supports it natively via tauri.conf.json bundle.windows.\*. Required
   before public distribution; not blocking internal builds.
8. **Next 16 Turbopack cache never prunes itself** `[agent]`: no framework pruning exists (the
   218MB .sst was this). Add `apps/*/.next/cache` pruning to Quick-Cleanup.ps1.
9. **pnpm 11 migration trap** `[future gate — documented]`: pnpm 11 silently ignores
   `pnpm.overrides` in package.json (must move to pnpm-workspace.yaml). When the pnpm 11 major
   bump PR appears: move the overrides block in the same change, verify with `pnpm why`.
   Do NOT auto-merge pnpm's own major bump.
10. **Electron 39 smoke-test scope** `[Bruce — gates chore/deps merge]`: must cover app launch +
    contextBridge IPC round-trip, electron-builder packaging with ASAR integrity (now stable,
    fails closed), auto-updater if present, native-module rebuild (command-center
    rebuild:native). Read breaking-changes for EVERY intermediate major (34-39).
11. **Review bot 300-file API cap** `[agent — after review-bot fix lands]`: GitHub's files API
    caps at 300 files/PR regardless of pagination — add a comment + totalFiles caveat in
    GitHubService.ts.

Already conforming (verified): SHA-pinned actions, `.npmrc` trust-policy/minimum-release-age
hardening, store-dir isolation in CI, evidence-based hardlink choice on ReFS.
