# @vibetech/maintenance-copilot

Tauri 2.0 + Vite (React 19) + Express desktop app — the permanent home for the
Monorepo Maintenance Co-Pilot. Scans the real `V:\monorepo` workspace and `D:\`
data drive and surfaces health + one-click maintenance, with the gateway shipped
as a self-contained Tauri **sidecar** (no Node required on the target machine).

## Run

```powershell
cd V:\monorepo ; pnpm install
cd apps\maintenance-copilot
pnpm build:gateway          # compile the Express gateway -> src-tauri\binaries\gateway-<triple>.exe (once)
pnpm tauri dev              # Tauri spawns the gateway sidecar; dashboard shows "Connected"
```

For rapid server iteration without rebuilding the binary:

```powershell
pnpm dev:hot                # tsx gateway (:8675) + Vite (:5173) in the browser, no Tauri window
```

Package a self-contained installer (runs `build:gateway` + `build:frontend` first via `tauri.conf.json`):

```powershell
pnpm build                  # -> src-tauri\target\release\bundle\ (nsis + msi)
```

## Layout

```
server/      Express gateway (:8675) — mcp-adapter.ts (routes) + ps-health.ts
             (PowerShell/python runners) + workspace-scanner.ts (drift)
src/         React UI (Vite) — App.tsx dashboard
scripts/     build-gateway.mjs (esbuild -> @yao-pkg/pkg -> triple-named binary)
src-tauri/   Tauri 2.0 native shell (lib.rs spawns + reaps the sidecar)
```

## Endpoints (gateway → real scripts; the frontend consumes these)

| Route                                     | Source                                                                                                                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/ping`                           | gateway liveness                                                                                                                                                                                                |
| `GET /api/mcp/get_workspace_health`       | live `pnpm-workspace.yaml` scan + cross-package version-drift detection                                                                                                                                         |
| `GET /api/mcp/get_database_health`        | `scripts/database-health.ps1`                                                                                                                                                                                   |
| `GET /api/mcp/get_d_drive_health`         | `scripts/d-drive-health.ps1` + `learning_insights.json` + `D:\logs` OOM scan                                                                                                                                    |
| `GET /api/mcp/get_git_status`             | live `git` branch / status / log                                                                                                                                                                                |
| `GET /api/telemetry`                      | aggregated health score (drift + active WAL + OOM)                                                                                                                                                              |
| `POST /api/mcp/run_workspace_cleanup`     | `scripts/cleanup-stale-artifacts.ps1` (dry-run default)                                                                                                                                                         |
| `POST /api/mcp/run_workspace_maintenance` | `D:\learning-system\scripts\run_maintenance.py` — baseline (integrity + WAL checkpoint + ANALYZE) with opt-in `{retention, vacuum, backup}`; VACUUM is disk-space-gated and destructive steps auto-backup first |

This mirrors the canonical `apps/monorepo-health-mcp` tool contract.

Env overrides: `WORKSPACE_ROOT` (default `V:/monorepo`), `LEARNING_SYSTEM_DIR`
(default `D:/learning-system`), `GATEWAY_PORT` (default `8675`).

## Sidecar lifecycle

`src-tauri/src/lib.rs` spawns the `gateway` sidecar on startup, streams its
stdout/stderr, and kills it on `ExitRequested` (no zombie on :8675). Because it is
launched from Rust, no `shell:` capability is strictly required; the scoped
`shell:allow-spawn` in `capabilities/default.json` is included only so the frontend
could relaunch it. Sidecar binary naming follows Tauri v2: `gateway-<target-triple>`
(this machine: `x86_64-pc-windows-msvc`). Compiler: `@yao-pkg/pkg` (classic
`vercel/pkg` is archived).

## Notes

- Folder is `apps/maintenance-copilot` (matches the package name); the earlier
  `apps/monorepo-maintenance-copilot` name was abandoned after a host-side lock left
  it unwritable. `git mv` to rename later if desired.
- Versions match the monorepo: Vite 7.3.1, Express 5.2.1, TS 5.9.3, React 19.2.4.
