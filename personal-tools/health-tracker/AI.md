---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-06-01
project:
  name: @vibetech/health-tracker
  path: personal-tools/health-tracker
category: packages
---

# @vibetech/health-tracker AI Notes

## What this project is

- Personal four-dimension wellness tracker (physical, mental, emotional, spiritual). Local-first PWA.

## Standard Commands (Nx preferred)

- **build**: `pnpm nx build @vibetech/health-tracker`
- **test**: `pnpm nx test @vibetech/health-tracker`
- **lint**: `pnpm nx lint @vibetech/health-tracker`

## Tech Stack & Architecture

- **Core Technologies**: React 19.2.4, Vite, TypeScript, Tailwind CSS, Zod
- **Isolated Storage Policy**: All logs, sqlite databases, and runtime caches must be located on the `D:\` drive (e.g. under `D:\databases\` or `D:\logs\`). Code remains on the `C:\` drive under `C:/dev/personal-tools/health-tracker`.

## References

- Workspace Rules: [RULES.md](file:///C:/dev/docs/ai/RULES.md)
