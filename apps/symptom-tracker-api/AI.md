---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: symptom-tracker-api
  path: apps/symptom-tracker-api
category: apps
---

# symptom-tracker-api AI Notes

## What this project is

- symptom-tracker-api - Application

## Standard Commands (Nx preferred)

- **dev**: `pnpm nx run symptom-tracker-api:dev`
- **build**: `pnpm nx run symptom-tracker-api:build`
- **start**: `pnpm nx run symptom-tracker-api:start`
- **typecheck**: `pnpm nx run symptom-tracker-api:typecheck`

## Tech Stack & Architecture

- **Core Technologies**: TypeScript, Express, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/apps/symptom-tracker-api`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
