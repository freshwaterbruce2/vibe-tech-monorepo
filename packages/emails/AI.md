---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/emails
  path: packages/emails
category: packages
---

# @vibetech/emails AI Notes

## What this project is

- Shared React Email templates and rendering helpers for VibeTech apps

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/emails:build`
- **test**: `pnpm nx run @vibetech/emails:test`
- **lint**: `pnpm nx run @vibetech/emails:lint`
- **typecheck**: `pnpm nx run @vibetech/emails:typecheck`
- **quality**: `pnpm nx run @vibetech/emails:quality`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, TypeScript, Vitest
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/emails`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
