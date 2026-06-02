---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: workspace-mcp-server
  path: apps/workspace-mcp-server
category: mcp
---

# workspace-mcp-server AI Notes

## What this project is

- MCP server for VibeTech workspace config: API keys, ports, servers, plugins, databases, env vars

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run workspace-mcp-server:dev`
- **build**: `pnpm nx run workspace-mcp-server:build`
- **lint**: `pnpm nx run workspace-mcp-server:lint`
- **test**: `pnpm nx run workspace-mcp-server:test`
- **typecheck**: `pnpm nx run workspace-mcp-server:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/workspace-mcp-server`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
