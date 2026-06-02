---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/avatar-processor
  path: packages/avatar-processor
category: packages
---

# @vibetech/avatar-processor AI Notes

## What this project is

- Avatar processing library for GLB to VRM rigging and landmark tracking translation

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/avatar-processor:build`
- **lint**: `pnpm nx run @vibetech/avatar-processor:lint`
- **typecheck**: `pnpm nx run @vibetech/avatar-processor:typecheck`
- **test**: `pnpm nx run @vibetech/avatar-processor:test`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/avatar-processor`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
