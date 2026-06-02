---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: desktop-bridge
  path: desktop-bridge
category: packages
---

# desktop-bridge AI Notes

## What this project is

- Command Center Desktop Bridge - REST + WebSocket Server

## Standard Commands (Nx preferred)

- **lint**: `pnpm nx run desktop-bridge:lint`
- **build**: `pnpm nx run desktop-bridge:build`
- **typecheck**: `pnpm nx run desktop-bridge:typecheck`
- **test**: `pnpm nx run desktop-bridge:test`

## Tech Stack & Architecture

- **Core Technologies**: Fastify
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/desktop-bridge`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
