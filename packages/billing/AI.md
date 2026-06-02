---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/billing
  path: packages/billing
category: packages
---

# @vibetech/billing AI Notes

## What this project is

- Stripe checkout and dunning primitives for VibeTech apps

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/billing:build`
- **test**: `pnpm nx run @vibetech/billing:test`
- **lint**: `pnpm nx run @vibetech/billing:lint`
- **typecheck**: `pnpm nx run @vibetech/billing:typecheck`
- **quality**: `pnpm nx run @vibetech/billing:quality`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/billing`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
