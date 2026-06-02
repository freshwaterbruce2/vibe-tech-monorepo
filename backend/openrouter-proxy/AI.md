---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: openrouter-proxy
  path: backend/openrouter-proxy
category: packages
---

# openrouter-proxy AI Notes

## What this project is

- Centralized OpenRouter API proxy for VibeTech monorepo

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run openrouter-proxy:dev`
- **build**: `pnpm nx run openrouter-proxy:build`
- **start**: `pnpm nx run openrouter-proxy:start`
- **test**: `pnpm nx run openrouter-proxy:test`
- **lint**: `pnpm nx run openrouter-proxy:lint`
- **typecheck**: `pnpm nx run openrouter-proxy:typecheck`
- **evaluate**: `pnpm nx run openrouter-proxy:evaluate`
- **install**: `pnpm nx run openrouter-proxy:install`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Express, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/backend/openrouter-proxy`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
