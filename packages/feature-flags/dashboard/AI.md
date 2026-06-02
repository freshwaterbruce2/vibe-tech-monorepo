---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/feature-flags-dashboard
  path: packages/feature-flags/dashboard
category: packages
---

# @vibetech/feature-flags-dashboard AI Notes

## What this project is

- Admin dashboard for feature flags management

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build @vibetech/feature-flags-dashboard`
- **test**: `pnpm nx test @vibetech/feature-flags-dashboard`
- **lint**: `pnpm nx lint @vibetech/feature-flags-dashboard`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/packages/feature-flags/dashboard`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
