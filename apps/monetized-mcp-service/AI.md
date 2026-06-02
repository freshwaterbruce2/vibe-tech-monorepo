---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: monetized-mcp-service
  path: apps/monetized-mcp-service
category: mcp
---

# monetized-mcp-service AI Notes

## What this project is

- monetized-mcp-service - MCP Server

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run monetized-mcp-service:dev`
- **build**: `pnpm nx run monetized-mcp-service:build`
- **preview**: `pnpm nx run monetized-mcp-service:preview`
- **api:dev**: `pnpm nx run monetized-mcp-service:api:dev`
- **api:build**: `pnpm nx run monetized-mcp-service:api:build`
- **api:start**: `pnpm nx run monetized-mcp-service:api:start`
- **start-mcp**: `pnpm nx run monetized-mcp-service:start-mcp`
- **export-openapi**: `pnpm nx run monetized-mcp-service:export-openapi`
- **generate-openapi-mcp**: `pnpm nx run monetized-mcp-service:generate-openapi-mcp`
- **ship:check**: `pnpm nx run monetized-mcp-service:ship:check`
- **test**: `pnpm nx run monetized-mcp-service:test`
- **typecheck**: `pnpm nx run monetized-mcp-service:typecheck`
- **lint**: `pnpm nx run monetized-mcp-service:lint`
- **quality**: `pnpm nx run monetized-mcp-service:quality`
- **deploy**: `pnpm nx run monetized-mcp-service:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Fastify, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/monetized-mcp-service`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
