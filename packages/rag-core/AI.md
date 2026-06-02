---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/rag-core
  path: packages/rag-core
category: packages
---

# @vibetech/rag-core AI Notes

## What this project is

- Shared RAG pipeline library for VibeTech monorepo projects

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/rag-core:build`
- **test**: `pnpm nx run @vibetech/rag-core:test`
- **test:coverage**: `pnpm nx run @vibetech/rag-core:test:coverage`
- **typecheck**: `pnpm nx run @vibetech/rag-core:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Zod, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/rag-core`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
