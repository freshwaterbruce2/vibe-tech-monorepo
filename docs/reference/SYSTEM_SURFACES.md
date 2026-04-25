# System Surfaces

Canonical review map for the workspace and the `D:\` operational surfaces.

## Canonical roots

| Surface | Path | Purpose |
| --- | --- | --- |
| Source code | `C:\dev` | Versioned monorepo, scripts, docs, Nx config |
| Databases | `D:\databases` | Durable SQLite databases and WAL/SHM sidecars |
| Learning system | `D:\learning-system` | Learning runtime, logs, docs, Python helpers |
| Logs | `D:\logs` | Application and maintenance logs |
| Data | `D:\data` | Non-database datasets and exports |
| Backups | `D:\backups` | Database/system backups and retention outputs |

`C:\dev\data`, `C:\dev\logs`, `C:\dev\databases`, and `D:\learning` remain deprecated.

## Canonical databases

| Database | Canonical path | Notes |
| --- | --- | --- |
| Unified workspace DB | `D:\databases\database.db` | Shared backend and tooling data store |
| Memory DB | `D:\databases\memory.db` | Primary memory-system database; watch WAL growth |
| Agent learning DB | `D:\databases\agent_learning.db` | Canonical learning-system database |
| Nova activity DB | `D:\databases\nova_activity.db` | Nova activity/event database |

## Known drift to review before migration

- Retired database references can remain in older plans and archives. Check
  `D:\databases\DB_INVENTORY.md` before restoring or recreating any database.
- Root-level reports, screenshots, and scratch files are treated as cleanup
  candidates, not source-of-truth artifacts.
- `.gitmodules` currently tracks `apps/gravity-claw` as a first-party app submodule;
  keep submodule ownership explicit before cleanup.

## Supported review commands

| Command | Purpose |
| --- | --- |
| `pnpm run paths:check` | Validate path-policy compliance against current workspace files |
| `pnpm run sync:audit` | Nx-aware monorepo sync audit with blocking checks |
| `pnpm run sync:audit:report` | Non-blocking audit report for inventory/review |
| `pnpm run databases:health` | Generate read-only database topology and WAL report |
| `pnpm run memory:health` | Check `memory.db` presence plus WAL/SHM state |
| `pnpm run learning:validate` | Validate the live `D:\learning-system` layout |
| `pnpm run workspace:cleanup:dry` | Emit cleanup candidates without deleting anything |
| `pnpm run workspace:health` | Run the combined safe-stabilization review suite |

## Review rules

- Do not delete duplicate databases until code references and runtime owners are mapped.
- Prefer archiving generated artifacts instead of keeping them in the repo root.
- Treat `scripts/monorepo-sync-audit.mjs`, `scripts/check-vibe-paths.ps1`, `scripts/database-health.ps1`, and `scripts/validate-learning-system.ps1` as the supported first-pass review surface.
