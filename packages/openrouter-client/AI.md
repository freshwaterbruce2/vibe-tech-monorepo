---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: openrouter-client
  path: packages/openrouter-client
category: packages
---

# openrouter-client AI Notes

## What this project is

- TypeScript client library for VibeTech OpenRouter proxy

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run openrouter-client:build`
- **test**: `pnpm nx run openrouter-client:test`
- **test:coverage**: `pnpm nx run openrouter-client:test:coverage`
- **lint**: `pnpm nx run openrouter-client:lint`
- **typecheck**: `pnpm nx run openrouter-client:typecheck`
- **install**: `pnpm nx run openrouter-client:install`
- **quality**: `pnpm nx run openrouter-client:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/openrouter-client`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
