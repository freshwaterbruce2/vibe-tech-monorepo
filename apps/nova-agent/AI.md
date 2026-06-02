---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: nova-agent
  path: apps/nova-agent
category: desktop
---

# nova-agent AI Notes

## What this project is

- Desktop context-aware agent guide built with Tauri 2.0 (Rust backend + React 19 / Vite / Tailwind CSS frontend).

## Standard Commands (Nx preferred)

- Dev Mode: `pnpm nx dev nova-agent`
- Production Build: `pnpm nx build nova-agent` (packages version 1.3.1 installers to `D:\cargo-targets\release\bundle\`)
- Frontend Dev: `pnpm dev:web`
- Frontend Build: `pnpm nx build:frontend nova-agent` (enforces `cross-env NODE_ENV=production`)
- Frontend Typecheck: `pnpm nx typecheck nova-agent`
- Frontend Lint: `pnpm nx lint nova-agent`
- Frontend Tests: `pnpm nx test nova-agent`
- Rust backend unit tests: `pnpm nx test:rust nova-agent`
- Rust backend check: `pnpm nx check:rust nova-agent`

## Build & Production Constraints

- **Vite Production Builds**: Always enforce `cross-env NODE_ENV=production` when compiling the frontend to prevent compiler emission of `jsxDEV` calls, which crash on startup in production when React resolves to its production bundle.

## Storage Isolation Policy

- Code & Configuration: `C:\dev\apps\nova-agent`
- Runtime Data (SQLite DBs, Logs, Cache, Learning artifacts): Must go to `D:\` drive (e.g., `D:\databases\nova.db`, `D:\logs\`). Do not write persistent data to `C:\`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
- Desktop Guidelines: [DESKTOP.md](file:///C:/dev/docs/ai/areas/DESKTOP.md)
