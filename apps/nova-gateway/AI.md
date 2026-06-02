---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: nova-gateway
  path: apps/nova-gateway
category: apps
---

# nova-gateway AI Notes

## What this project is

- Nova Agent Gateway: 24/7 bot gateway and webhook platform connecting Telegram & Discord to Nova Agent desktop

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run nova-gateway:dev`
- **build**: `pnpm nx run nova-gateway:build`
- **lint**: `pnpm nx run nova-gateway:lint`
- **test**: `pnpm nx run nova-gateway:test`
- **typecheck**: `pnpm nx run nova-gateway:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Fastify, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/nova-gateway`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
