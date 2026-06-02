---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/shared-ipc
  path: packages/shared-ipc
category: packages
---

# @vibetech/shared-ipc AI Notes

## What this project is

- IPC message schemas and contracts for NOVA-Deepcode communication

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/shared-ipc:build`
- **lint**: `pnpm nx run @vibetech/shared-ipc:lint`
- **typecheck**: `pnpm nx run @vibetech/shared-ipc:typecheck`
- **quality**: `pnpm nx run @vibetech/shared-ipc:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/shared-ipc`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
