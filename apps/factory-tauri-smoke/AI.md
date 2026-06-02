---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: factory-tauri-smoke
  path: apps/factory-tauri-smoke
category: apps
---

# factory-tauri-smoke AI Notes

## What this project is

- factory-tauri-smoke - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run factory-tauri-smoke:dev`
- **dev:web**: `pnpm nx run factory-tauri-smoke:dev:web`
- **build**: `pnpm nx run factory-tauri-smoke:build`
- **package:check**: `pnpm nx run factory-tauri-smoke:package:check`
- **package**: `pnpm nx run factory-tauri-smoke:package`
- **test**: `pnpm nx run factory-tauri-smoke:test`
- **typecheck**: `pnpm nx run factory-tauri-smoke:typecheck`
- **lint**: `pnpm nx run factory-tauri-smoke:lint`
- **quality**: `pnpm nx run factory-tauri-smoke:quality`
- **deploy**: `pnpm nx run factory-tauri-smoke:deploy`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tauri, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/factory-tauri-smoke`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
