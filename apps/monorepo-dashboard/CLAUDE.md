# monorepo-dashboard — AI Context

## What this is
Vite + React dashboard for visualising and managing the VibeTech monorepo — shows project health, dependency graph (d3-force), agent memory search, and OpenRouter AI chat.

## Stack
- **Runtime**: Node.js 22
- **Framework**: Vite + React 19 (client) + Express v5 (API server)
- **Key deps**: d3-force, recharts, @tanstack/react-query, better-sqlite3, @vibetech/memory, zustand

## Dev
```bash
pnpm --filter monorepo-dashboard dev          # Vite dev server
pnpm --filter monorepo-dashboard dev:server   # Express API server (tsx watch)
pnpm --filter monorepo-dashboard dev:all      # Both concurrently
pnpm --filter monorepo-dashboard build        # Vite production build → dist/
```

## Notes
- Two processes in dev: Vite SPA + Express API server
- Uses MCP SDK client to query running MCP servers for live status
- Integrates with `packages/memory` and `packages/openrouter-client` workspace packages
- SQLite at `D:\databases\database.db` (env: `DATABASE_PATH`)
