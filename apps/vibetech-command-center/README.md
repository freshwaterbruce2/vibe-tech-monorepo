# Vibe-Tech Command Center

> Single-pane-of-glass operations console for the VibeTech monorepo.

The Command Center is an Electron 33 desktop app that provides real-time visibility into Nx projects, SQLite databases, MCP server health, build status, and agent orchestration. It also hosts a local MCP server that exposes monorepo introspection tools to Claude Code and other MCP clients.

---

## Tech Stack

| Layer           | Technology                                                         |
| --------------- | ------------------------------------------------------------------ |
| Desktop Runtime | Electron 33                                                        |
| Frontend        | React 19, TypeScript 5.9 (strict)                                  |
| Bundler         | electron-vite                                                      |
| Styling         | Tailwind CSS 4, shadcn/ui                                          |
| State           | Zustand (client), TanStack Query (server)                          |
| Native Modules  | better-sqlite3 (read-only for external DBs)                        |
| Testing         | Vitest (unit), Playwright (E2E)                                    |
| Package Manager | pnpm (workspace root `.npmrc`; portable `store-dir=../pnpm-store`) |

---

## Installation / Dev Commands

All commands run from `apps/vibetech-command-center`.

| Command               | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `pnpm dev`            | Start electron-vite in dev mode with hot reload             |
| `pnpm build`          | Production build of main, preload, renderer, and MCP server |
| `pnpm test`           | Run Vitest unit/integration tests                           |
| `pnpm test:e2e`       | Build and run Playwright E2E tests                          |
| `pnpm package`        | Build + package NSIS installer (`release/`)                 |
| `pnpm package:dir`    | Build + package unpacked directory (`release/`)             |
| `pnpm rebuild:native` | Rebuild `better-sqlite3` for Electron ABI                   |
| `pnpm restore:native` | Restore `better-sqlite3` for Node ABI                       |
| `pnpm mcp:start`      | Start the MCP server standalone (stdio)                     |
| `pnpm typecheck`      | Run `tsc --noEmit`                                          |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Electron Main                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ nx-graph    │ │ nx-affected │ │ db-explorer         │   │
│  │ memory-viz  │ │ agent-      │ │ health-probe        │   │
│  │ backup-svc  │ │ orchestrator│ │ process-runner      │   │
│  │ claude-bridge│ │ rag-client │ │ monorepo-watcher    │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                          ws-hub                              │
└────────────────────────┬────────────────────────────────────┘
                         │ IPC
┌────────────────────────┴────────────────────────────────────┐
│                      Electron Renderer                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Affected │ │ DB       │ │ Agent    │ │ Memory   │       │
│  │ Dashboard│ │ Explorer │ │ Orchestrator│ Viz     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Backup   │ │ Build    │ │ Apps     │ │ Claude   │       │
│  │ Log      │ │ Status   │ │ Grid     │ │ Launcher │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐                                  │
│  │ Agent    │ │ Db       │                                  │
│  │ Console  │ │ Health   │                                  │
│  └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
                         MCP (stdio / stdio-over-socket)
```

### Main Process

- **nx-graph** — Parses and caches the Nx project graph.
- **nx-affected** — Computes affected projects, health scores, and risk flags.
- **db-explorer** — Read-only SQLite browser with safe query runner.
- **memory-viz** — Reads `@vibetech/memory` stores for timeline and semantic search.
- **agent-orchestrator** — Monitors MCP server health and launches Nx tasks.
- **health-probe** — TCP/HTTP reachability probes for known services.
- **backup-service** — Reads backup metadata and logs.
- **process-runner** — Spawns and manages child processes with kill/restart.
- **claude-bridge** — Streams Claude Code output into the renderer.
- **rag-client** — Queries LanceDB vector store for RAG search.
- **monorepo-watcher** — Watches `apps/` and `packages/` for file changes.
- **ws-hub** — WebSocket hub streaming events to renderer panels.

### Preload

Secure IPC bridge exposing typed channels defined in `src/shared/types.ts`. No `contextIsolation` bypass.

### Renderer Panels

| Panel                               | Purpose                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Affected Intelligence Dashboard** | Pre-commit impact analysis: affected projects, dependency subgraph, health scores (0-100), risk flags              |
| **DB Explorer**                     | Read-only SQLite browser. Schema introspection, safe query runner (SELECT/WITH only, 5s timeout, 1,000-row cap)    |
| **Agent Orchestrator**              | MCP server health monitoring (7+ servers), Nx task launcher, process grid with kill/restart, searchable log stream |
| **Memory Viz**                      | Episodic timeline, semantic explorer with importance bars, procedural patterns table, decay visualization          |
| **Backup Log**                      | Historical backup events and integrity status                                                                      |
| **Build Status**                    | Live build progress and failure summaries                                                                          |
| **Apps Grid**                       | Catalog of all monorepo apps with tags and quick actions                                                           |
| **Claude Launcher**                 | One-click Claude Code session starter with stream output                                                           |
| **Agent Console**                   | Raw agent logs and command replay                                                                                  |
| **Db Health**                       | Database size, WAL growth, and table-level metrics                                                                 |
| **Rag Search**                      | Vector search across LanceDB semantic memory                                                                       |

### MCP Server

The app bundles an MCP server (`src/mcp/`) compiled to `dist/mcp/`. It exposes 11+ tools for monorepo introspection, health probes, database metrics, backups, and RAG search. Registered in `.mcp.json` as `command-center`.

---

## Environment Variables

Copy `.env.example` to `.env` for local development.

| Variable                          | Default                    | Description                                                  |
| --------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `VIBETECH_COMMAND_CENTER_WS_PORT` | `3210`                     | WebSocket hub port for renderer↔main stream communication    |
| `DB_EXPLORER_ROOTS`               | `D:\databases;V:\monorepo` | Semicolon-separated list of allowed DB roots for DB Explorer |
| `NODE_ENV`                        | `development`              | Node environment                                             |

---

## Packaging Notes

- **Native module rebuild required**: `better-sqlite3` must be rebuilt against Electron's ABI before packaging. The `pnpm package` script handles this automatically via `pnpm rebuild:native` and restores the Node ABI afterward.
- **Output directory**: `release/`
- **Installer format**: NSIS (`Vibe-Tech Command Center-Setup-${version}.exe`)
- **Auto-updates**: Disabled (`publish: null`)
- **Code signing**: Not configured
