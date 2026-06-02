---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/memory
  path: packages/memory
category: packages
---

# @vibetech/memory AI Notes

## What this project is

- Memory system with episodic, semantic, and procedural stores with vector search

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build @vibetech/memory`
- **test**: `pnpm nx test @vibetech/memory`
- **lint**: `pnpm nx lint @vibetech/memory`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/memory`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
