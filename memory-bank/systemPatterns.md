# System Patterns & Architecture Decisions

## Monorepo Organization
- `apps/` = product applications, desktop apps, MCP servers
- `packages/` = shared libraries, UI, config, memory, MCP utilities
- `backend/` = backend services (openrouter-proxy, ipc-bridge, lsp-proxy, etc.)

## Key Patterns
1. **Nx-first**: Always use `pnpm nx <target> <project>` over direct tool commands
2. **Co-located tests**: `Component.test.tsx` next to source
3. **Async-first**: `async/await` preferred over promise chains
4. **Path aliases**: Use `@/` for src imports; avoid deep relative paths
5. **Local-only data**: Runtime data (DBs, logs) on `D:\`, never committed

## Memory Architecture
- `@vibetech/memory` package: episodic, semantic, procedural stores in SQLite
- `memory-mcp` server exposes memory to LLM clients via MCP
- `D:\databases\memory.db` = primary memory store
- `D:\databases\agent_learning.db` = execution telemetry
- Learning system at `D:\learning-system\` bridges to memory

## MCP Server Ecosystem
11 MCP servers configured in `.mcp.json`:
- `memory` — persistent memory (SQLite)
- `rag` — codebase RAG search
- `workspace` — config registry, DB inventory
- `nx-mcp` — Nx workspace queries
- `desktop-commander` — Windows automation
- `filesystem` — file access
- `sqlite` — generic SQLite queries
- `skills` — agent skills system
- `command-center` — VTDE control plane
- `youtube`, `notebooklm`, `chrome-devtools`
