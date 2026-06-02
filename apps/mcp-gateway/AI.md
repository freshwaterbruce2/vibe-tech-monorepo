---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: mcp-gateway
  path: apps/mcp-gateway
category: mcp
---

# mcp-gateway AI Notes

## What this project is

- MCP Gateway: bridges OpenClaw (Brain) with Antigravity MCP servers (Environment) via IPC Bridge

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run mcp-gateway:dev`
- **build**: `pnpm nx run mcp-gateway:build`
- **lint**: `pnpm nx run mcp-gateway:lint`
- **test**: `pnpm nx run mcp-gateway:test`
- **typecheck**: `pnpm nx run mcp-gateway:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/mcp-gateway`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
