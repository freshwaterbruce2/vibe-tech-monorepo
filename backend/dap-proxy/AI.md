---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: dap-proxy
  path: backend/dap-proxy
category: packages
---

# dap-proxy AI Notes

## What this project is

- Debug Adapter Protocol WebSocket proxy

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run dap-proxy:dev`
- **build**: `pnpm nx run dap-proxy:build`
- **start**: `pnpm nx run dap-proxy:start`

## Tech Stack & Architecture

- **Core Technologies**: 
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/backend/dap-proxy`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
