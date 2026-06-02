---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/testing-utils
  path: packages/testing-utils
category: packages
---

# @vibetech/testing-utils AI Notes

## What this project is

- Shared testing utilities and fixtures for VibeTech monorepo

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/testing-utils:build`
- **typecheck**: `pnpm nx run @vibetech/testing-utils:typecheck`
- **test**: `pnpm nx run @vibetech/testing-utils:test`
- **lint**: `pnpm nx run @vibetech/testing-utils:lint`
- **quality**: `pnpm nx run @vibetech/testing-utils:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/testing-utils`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
