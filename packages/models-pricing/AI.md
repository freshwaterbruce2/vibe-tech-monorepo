---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/models-pricing
  path: packages/models-pricing
category: packages
---

# @vibetech/models-pricing AI Notes

## What this project is

- Database service package that manages AI models, pricing tiers, and pricing histories.
- Initializes and seeds `D:\databases\models_pricing.db`.

## Standard Commands (Nx preferred)

- **build**: `pnpm nx run @vibetech/models-pricing:build`
- **test**: `pnpm nx run @vibetech/models-pricing:test`
- **lint**: `pnpm nx run @vibetech/models-pricing:lint`
- **typecheck**: `pnpm nx run @vibetech/models-pricing:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, better-sqlite3, `@vibetech/shared-config`
- **Isolated Storage Policy**: The database is stored at `D:\databases\models_pricing.db`. Code remains on the `C:\` drive under `V:/monorepo/packages/models-pricing`.

## References

- Workspace Rules: [RULES.md](file:///V:/monorepo/docs/ai/RULES.md)
