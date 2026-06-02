---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: lsp-proxy
  path: backend/lsp-proxy
category: packages
---

# lsp-proxy AI Notes

## What this project is

- LSP WebSocket proxy for browser-based code editor

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run lsp-proxy:dev`
- **build**: `pnpm nx run lsp-proxy:build`
- **start**: `pnpm nx run lsp-proxy:start`

## Tech Stack & Architecture

- **Core Technologies**: 
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/backend/lsp-proxy`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
