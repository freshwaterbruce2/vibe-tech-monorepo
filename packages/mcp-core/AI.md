---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: mcp-core
  path: packages/mcp-core
category: packages
---

# mcp-core AI Notes

## What this project is

- Core types and utilities for VibeTech MCP servers

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run mcp-core:build`
- **test**: `pnpm nx run mcp-core:test`
- **test:coverage**: `pnpm nx run mcp-core:test:coverage`
- **typecheck**: `pnpm nx run mcp-core:typecheck`
- **lint**: `pnpm nx run mcp-core:lint`
- **quality**: `pnpm nx run mcp-core:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/mcp-core`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
