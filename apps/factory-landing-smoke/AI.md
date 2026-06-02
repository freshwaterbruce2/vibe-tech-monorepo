---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: factory-landing-smoke
  path: apps/factory-landing-smoke
category: apps
---

# factory-landing-smoke AI Notes

## What this project is

- factory-landing-smoke - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run factory-landing-smoke:dev`
- **build**: `pnpm nx run factory-landing-smoke:build`
- **preview**: `pnpm nx run factory-landing-smoke:preview`
- **test**: `pnpm nx run factory-landing-smoke:test`
- **typecheck**: `pnpm nx run factory-landing-smoke:typecheck`
- **lint**: `pnpm nx run factory-landing-smoke:lint`
- **quality**: `pnpm nx run factory-landing-smoke:quality`
- **deploy**: `pnpm nx run factory-landing-smoke:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/factory-landing-smoke`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
