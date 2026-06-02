---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: mcp-testing
  path: packages/mcp-testing
category: packages
---

# mcp-testing AI Notes

## What this project is

- Testing utilities for VibeTech MCP servers

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run mcp-testing:build`
- **test**: `pnpm nx run mcp-testing:test`
- **typecheck**: `pnpm nx run mcp-testing:typecheck`
- **lint**: `pnpm nx run mcp-testing:lint`
- **quality**: `pnpm nx run mcp-testing:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/mcp-testing`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
