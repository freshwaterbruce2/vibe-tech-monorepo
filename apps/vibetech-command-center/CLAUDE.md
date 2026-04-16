# Command Center — Session Invariants

## Stack (do not suggest alternatives)
- Electron 33 + electron-vite
- React 19, TypeScript 5.9 strict
- Tailwind + shadcn/ui for components
- Zustand for state, TanStack Query for server state
- better-sqlite3 (read-only for external DBs), chokidar v4 for file watching
- Vitest unit, Playwright E2E
- pnpm only — npm corrupts the lockfile

## Rules
- Windows 11. All paths backslashed. PowerShell 7+, chain with `;`.
- No git. Manual zip backups via `Compress-Archive` before destructive changes.
- Hard cap 500 lines per .ts/.tsx file. Components 200-300 lines target.
- No Next.js. Ever.
- Read-only access to external SQLite DBs at `D:\databases\` and `D:\learning-system\`. Never write.
- Dashboard ports: UI dev 5180, IPC/WS 3210. MCP server is stdio.

## Paths
- App root: `C:\dev\apps\vibetech-command-center`
- Monorepo root: `C:\dev`
- Backups: `C:\dev\_backups\`
- External DBs: `D:\databases\*.db`, `D:\learning-system\*.db`
- LanceDB (RAG): `D:\nova-agent-data\lance-db\`

## Before any destructive change
Output the `Compress-Archive` command first, then the change. No exceptions.
