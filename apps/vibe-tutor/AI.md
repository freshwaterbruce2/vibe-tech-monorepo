---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-01-22
project:
  name: vibe-tutor
  path: apps/vibe-tutor
category: mobile
---

# vibe-tutor AI Notes

## What this project is

- PWA + Capacitor Android app for homework/tutoring with offline-first patterns.

## Commands (Nx preferred)

- Dev: `pnpm nx dev vibe-tutor`
- Build: `pnpm nx build vibe-tutor`
- Preview: `pnpm nx preview vibe-tutor`
- Backend proxy (if needed): `pnpm nx start vibe-tutor`
- Android sync/build/deploy:
  - `pnpm nx android:sync vibe-tutor`
  - `pnpm nx android:build vibe-tutor`
  - `pnpm nx android:deploy vibe-tutor`

## Android gotchas

- Increment `versionCode` before builds when required by the project’s Android workflow.
- If changes don’t apply, clear build caches and rebuild clean.

## Storage

- Code: `C:\dev\apps\vibe-tutor`
- If generating logs or DBs, place them on `D:\` per workspace rules.

## References

- Workspace rules: [../../docs/ai/WORKSPACE.md](../../docs/ai/WORKSPACE.md)
- Mobile area: [../../docs/ai/areas/MOBILE.md](../../docs/ai/areas/MOBILE.md)
