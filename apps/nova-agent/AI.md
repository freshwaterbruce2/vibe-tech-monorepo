---
type: ai-rules
scope: project
status: canonical
lastReviewed: 2026-01-22
project:
  name: nova-agent
  path: apps/nova-agent
category: desktop
---

# nova-agent AI Notes

## What this project is

- Desktop app built with Tauri (Rust backend + React/Vite frontend).

## Commands (Nx preferred)

- Dev: `pnpm nx dev nova-agent`
- Build: `pnpm nx build nova-agent`
- Rust tests: `pnpm nx test:rust nova-agent`
- Rust check: `pnpm nx check:rust nova-agent`

## Debugging

- Prefer the repo’s Rust debugging setup docs when debugging the Tauri backend.

## Storage

- Code: `C:\dev\apps\nova-agent`
- Any logs/DB/learning artifacts must go on `D:\`.

## References

- Workspace rules: [../../docs/ai/WORKSPACE.md](../../docs/ai/WORKSPACE.md)
- Desktop area: [../../docs/ai/areas/DESKTOP.md](../../docs/ai/areas/DESKTOP.md)
