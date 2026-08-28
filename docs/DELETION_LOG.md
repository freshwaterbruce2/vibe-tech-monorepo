# Deletion Log

Phase 2 dead-code elimination log for the VibeTech monorepo.

## 2026-05-25

### Analysis Inputs

| Tool | Command | Result | Report |
| --- | --- | --- | --- |
| Knip | `pnpm dlx knip --no-progress --reporter json --no-exit-code` | Completed with report; emitted a Prisma `DATABASE_URL` config warning before JSON. | `D:\planning-files\phase-2-dead-code\20260525-072803\knip-report.json` |
| Knip production | `pnpm dlx knip --production --no-progress --reporter json --no-exit-code` | Completed with dummy analysis-only `DATABASE_URL`. | `D:\planning-files\phase-2-dead-code\20260525-072803\knip-production-report.json` |
| Depcheck | `pnpm dlx depcheck V:\monorepo --json` | Returned issues plus one invalid-file parse warning for commented `tsconfig.base.json`; root `pnpm exec depcheck` is blocked by an `entities` export mismatch. | `D:\planning-files\phase-2-dead-code\20260525-072803\depcheck-root-report.json` |

### Guardrails

- Do not remove authentication, wallet, database-client, search-service, or core business logic code.
- Treat Knip and depcheck output as candidates only; require reference checks before deletion.
- Skip generated local artifacts unless they are tracked source files.
- Skip ambiguous public API exports and package entrypoints.

### Batch 1

| Removed item | Type | Risk assessment | Impact |
| --- | --- | --- | --- |
| `.tmp-check.mjs` | Tracked temp script | One-line `process.argv` dump, no references found with `rg`, not a package/script entrypoint, not protected domain code. User explicitly confirmed removal. | Removed 1 tracked source artifact. |

### Batch 2

| Removed item | Type | Risk assessment | Impact |
| --- | --- | --- | --- |
| `scripts/backup/Backup-MoltBotData.ps1` | Old project maintenance script | User confirmed old MoltBot project should be deleted; standalone backup script, not referenced after cleanup. | Removed 222 lines. |
| `scripts/backup/Register-BackupTask.ps1` | Old project scheduled-task script | User-confirmed stale project artifact; only registered MoltBot backup task. | Removed 112 lines. |
| `scripts/backup/Repair-MoltBotDatabase.ps1` | Old project database repair script | User-confirmed stale project artifact; scoped to MoltBot backup/database paths. | Removed 265 lines. |
| `scripts/backup/Restore-MoltBotBackup.ps1` | Old project restore script | User-confirmed stale project artifact; scoped to MoltBot backup restoration. | Removed 269 lines. |
| `scripts/backup/Rollback-Configuration.ps1` | Old project config rollback script | User-confirmed stale project artifact; scoped to ClawdBot/MoltBot config rollback. | Removed 145 lines. |
| `scripts/maintenance/Optimize-MoltBotDatabases.ps1` | Old project database maintenance script | User-confirmed stale project artifact; scoped to MoltBot database optimization. | Removed 202 lines. |
| `scripts/maintenance/Register-MaintenanceTask.ps1` | Old project scheduled-task script | User-confirmed stale project artifact; only registered MoltBot maintenance tasks. | Removed 175 lines. |
| `scripts/maintenance/Rotate-MoltBotLogs.ps1` | Old project log maintenance script | User-confirmed stale project artifact; scoped to MoltBot log paths. | Removed 190 lines. |
| `scripts/monitoring/Get-MoltBotHealth.ps1` | Old project health-check script | User-confirmed stale project artifact; scoped to MoltBot health and task checks. | Removed 481 lines. |
| `scripts/security/Setup-MoltBotSecrets.ps1` | Old project secret setup script | User-confirmed stale project artifact; scoped to MoltBot gateway token/config. | Removed 235 lines. |
| `scripts/security/Setup-MoltBotSecrets-MachineScope.ps1` | Old project secret setup script | User-confirmed stale project artifact; scoped to MoltBot gateway token/config. | Removed 275 lines. |
| `scripts/_archive/obsolete-tools/backup_moltbot.ps1` | Archived obsolete helper | User-confirmed stale project artifact. | Removed 40 lines. |
| `scripts/_archive/obsolete-tools/init_moltbot_memory.py` | Archived obsolete helper | User-confirmed stale project artifact. | Removed 60 lines. |
| `docs/ai/MOLTBOT_INTEGRATION_PLAN.md` | Untracked old project plan | User-confirmed stale project artifact. | Removed untracked local doc. |

Shared docs/config patched in the same batch: `AGENTS.md`, `README.md`, `WORKSPACE.json`, `eslint.config.js`, `docs/PORTS.md`, `docs/guides/architecture-tasks/phase-4/TASK_4_1_ESLINT_EXEMPTIONS.md`, `scripts/LearningSystem.psm1`, `scripts/LearningCommands.psm1`, and `tools/ralph/full_report.md`.

### Batch 3

| Removed item | Type | Risk assessment | Impact |
| --- | --- | --- | --- |
| `.codeberg/workflows/ci.yml` | Deprecated CI workflow | User confirmed no more Codeberg; GitHub Actions is the canonical CI path. | Removed 82 lines. |
| `apps/invoice-automation-saas/.codeberg/merge-gate.md` | Deprecated merge-gate doc | User confirmed no more Codeberg; app-specific Codeberg gate is stale. | Removed 27 lines. |
| `docs/ai/context/memories/codeberg-not-github.md` | Stale platform memory | User confirmed no more Codeberg; repository platform is already documented as GitHub. | Removed 116 lines. |
| `packages/openclaw-bridge/examples/extension/commands/search.js` | Example command tied to Codeberg MCP | User confirmed no more Codeberg; command only called `codeberg_search_repos`. | Removed 110 lines. |

Shared docs/examples patched in the same batch: `AI.md`, `docs/ai/ANTI-PATTERNS.md`, `docs/plans/integration-2026-04-18.md`, `TASKS.md`, `packages/openclaw-bridge/README.md`, `packages/openclaw-bridge/examples/webhook-handler.js`, `packages/openclaw-bridge/examples/extension/manifest.json`, `packages/openclaw-bridge/examples/extension/index.js`, `packages/openclaw-bridge/examples/extension/commands/mcp.js`, and `packages/openclaw-bridge/examples/INTEGRATION_GUIDE.md`.

### Batch 4

| Removed item | Type | Risk assessment | Impact |
| --- | --- | --- | --- |
| `apps/VibeBlox/apps/clawdbot-desktop/` | Untracked stale nested app copy | User confirmed old ClawdBot/MoltBot project should be deleted; zero tracked files under the path; removed after verifying path under `V:\monorepo\apps\VibeBlox\apps`. | Removed untracked local app copy and nested `node_modules`. |

### Batch 5

| Removed item | Type | Risk assessment | Impact |
| --- | --- | --- | --- |
| `depcheck` | Root dev dependency | Flagged unused by analysis, no root scripts reference it, and the local binary failed before analysis with an `entities` export mismatch. Future ad hoc checks can use `pnpm dlx depcheck`. | Removed from `package.json` and `pnpm-lock.yaml`. |

### Metrics

| Metric | Value |
| --- | --- |
| Tracked files removed | 18 |
| Untracked stale paths removed | 2 |
| Dependencies removed | 1 |
| Exports consolidated | 0 |
| Tracked lines removed | 3,006 |
| Tracked file bytes removed | 98,228 |
| Bundle size reduction | No production bundle delta measured; removed files are scripts, docs, CI artifacts, examples, and stale local app copy. |
