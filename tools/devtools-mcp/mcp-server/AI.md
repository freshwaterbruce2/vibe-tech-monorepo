---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: devtools-mcp-server
  path: tools/devtools-mcp/mcp-server
category: tools
---

# devtools-mcp-server AI Notes

## What this project is

- Cross-browser DevTools via MCP — DOM, console, network, React, JS eval

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build devtools-mcp-server`
- **test**: `pnpm nx test devtools-mcp-server`
- **lint**: `pnpm nx lint devtools-mcp-server`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/tools/devtools-mcp/mcp-server`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
