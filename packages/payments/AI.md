---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: payments
  path: packages/payments
category: packages
---

# payments AI Notes

## What this project is

- payments - Shared Library

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run payments:build`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, pnpm workspace package
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/payments`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
