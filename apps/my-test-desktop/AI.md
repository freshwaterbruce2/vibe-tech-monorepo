---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: my-test-desktop
  path: apps/my-test-desktop
category: apps
---

# my-test-desktop AI Notes

## What this project is

- my-test-desktop - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run my-test-desktop:dev`
- **dev:web**: `pnpm nx run my-test-desktop:dev:web`
- **build**: `pnpm nx run my-test-desktop:build`
- **package:check**: `pnpm nx run my-test-desktop:package:check`
- **package**: `pnpm nx run my-test-desktop:package`
- **test**: `pnpm nx run my-test-desktop:test`
- **typecheck**: `pnpm nx run my-test-desktop:typecheck`
- **lint**: `pnpm nx run my-test-desktop:lint`
- **quality**: `pnpm nx run my-test-desktop:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tauri, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/my-test-desktop`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
