---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: mcp-rag-server
  path: apps/mcp-rag-server
category: mcp
---

# mcp-rag-server AI Notes

## What this project is

- MCP server exposing the Nova-Agent RAG pipeline to Claude Desktop / Claude Code

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run mcp-rag-server:build`
- **start**: `pnpm nx run mcp-rag-server:start`
- **dev**: `pnpm nx run mcp-rag-server:dev`
- **typecheck**: `pnpm nx run mcp-rag-server:typecheck`
- **lint**: `pnpm nx run mcp-rag-server:lint`
- **test**: `pnpm nx run mcp-rag-server:test`
- **quality**: `pnpm nx run mcp-rag-server:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/mcp-rag-server`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
