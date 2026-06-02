---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: mcp-skills-server
  path: apps/mcp-skills-server
category: mcp
---

# mcp-skills-server AI Notes

## What this project is

- MCP server exposing agent skills system-wide to any compliant LLM (Claude, Gemini, Copilot)

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run mcp-skills-server:build`
- **start**: `pnpm nx run mcp-skills-server:start`
- **dev**: `pnpm nx run mcp-skills-server:dev`
- **lint**: `pnpm nx run mcp-skills-server:lint`
- **typecheck**: `pnpm nx run mcp-skills-server:typecheck`
- **quality**: `pnpm nx run mcp-skills-server:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/mcp-skills-server`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
