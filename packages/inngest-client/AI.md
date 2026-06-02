---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/inngest-client
  path: packages/inngest-client
category: packages
---

# @vibetech/inngest-client AI Notes

## What this project is

- Shared Inngest client and event types for VibeTech monorepo

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build @vibetech/inngest-client`
- **test**: `pnpm nx test @vibetech/inngest-client`
- **lint**: `pnpm nx lint @vibetech/inngest-client`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/inngest-client`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
