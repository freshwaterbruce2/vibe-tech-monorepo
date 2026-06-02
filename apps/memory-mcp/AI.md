---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: memory-mcp
  path: apps/memory-mcp
category: mcp
---

# memory-mcp AI Notes

## What this project is

- MCP server exposing VibeTech memory system to Claude Code

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run memory-mcp:dev`
- **build**: `pnpm nx run memory-mcp:build`
- **lint**: `pnpm nx run memory-mcp:lint`
- **test**: `pnpm nx run memory-mcp:test`
- **typecheck**: `pnpm nx run memory-mcp:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/memory-mcp`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
