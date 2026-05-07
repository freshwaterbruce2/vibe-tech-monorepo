# Workspace Context - @vibetech/workspace

## Owner

Bruce Freshwater - solo Windows 11 developer working from the local monorepo.

## Current Baseline

- Repository root: `C:\dev`
- Git host: GitHub, `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git`
- Package manager: `pnpm@10.33.0`
- Node: `22.x`
- Build system: `nx@22.6.5`
- Current Nx project count: 70
- Primary languages: TypeScript, JavaScript, Python, Rust, and React

## Stack Reality Notes

- `apps/vibetech-command-center` is Electron 33 + electron-vite + electron-builder; it is not Tauri.
- `apps/vibe-tutor` is Electron 35.7 + Capacitor 8 + React/Vite with an Express backend; it is not React Native or Expo.
- `apps/nova-mobile-app` is the actual Expo 54 / React Native 0.81 mobile app.
- `apps/vibe-shop` is Next.js 16.1.6 and is an approved exception to the no-Next default.
- `apps/gravity-claw` is a local-only nested WIP repo excluded from `pnpm-workspace.yaml`; its package version is not a shipped workspace release.
- `apps/vibe-justice` has no root `package.json`; use the Tauri 2 frontend package and Python backend/PyInstaller `.spec` surfaces.
- `apps/business-booking-platform-next` has no root/frontend package manifest; the backend owns the only package.json.
- `apps/crypto-enhanced` is Python and is managed through root scripts/Nx targets.
- `packages/nova-core` has no package manifest and should not be treated as a workspace package.

## Source And Data Policy

- Source code lives under `C:\dev`.
- Runtime data lives on `D:\`.
- Active databases live under `D:\databases`.
- Logs live under `D:\logs`.
- Learning-system code/docs/artifacts live under `D:\learning-system`.
- Do not recreate deprecated `C:\dev\data`, `C:\dev\logs`, `C:\dev\databases`, or `D:\learning` paths.

## Workflow Rules

- Use pnpm only.
- Prefer Nx targets for lint, typecheck, test, build, e2e, and project discovery.
- Search before creating new files, components, services, scripts, or docs.
- Keep changes narrow and aligned with existing project patterns.
- Preserve user or generated work in a dirty tree unless the user explicitly asks for cleanup.
- Use `pnpm run quality:affected` for repo-level confidence after targeted validation.
- Use `pnpm run workspace:health` when path, database, learning-system, or sync surfaces are touched.

## Current Focus Areas

- Workflow and CI hardening for the root monorepo.
- Vibe Tutor readiness and Android/Capacitor validation.
- Chessmaster Academy correctness and shared `@vibetech/games` extraction.
- Gravity Claw local WIP runtime, dashboard, and bridge stability.
- Command Center as the dashboard/diagnostics app.
- Learning-system and database path consistency.

## Canonical References

- `AGENTS.md` - Codex/Nx/local workflow instructions.
- `AI.md` - canonical path, tooling, and agent behavior rules.
- `WORKSPACE.json` - current stack, project registry, and focus areas.
- `docs/WORKSPACE_STRUCTURE.md` - source vs local-only storage policy.
- `docs/ai/RULES.md` - detailed development and agent rules.
- `D:\databases\DB_INVENTORY.md` - database ownership and active DB paths.
