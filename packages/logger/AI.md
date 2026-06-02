---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/logger
  path: packages/logger
category: packages
---

# @vibetech/logger AI Notes

## What this project is

- Structured JSON logging for all monorepo packages

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/logger:build`
- **test**: `pnpm nx run @vibetech/logger:test`
- **test:coverage**: `pnpm nx run @vibetech/logger:test:coverage`
- **lint**: `pnpm nx run @vibetech/logger:lint`
- **typecheck**: `pnpm nx run @vibetech/logger:typecheck`
- **quality**: `pnpm nx run @vibetech/logger:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/logger`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
