# Vibe-Tutor AI Agent Instructions

## Big picture

- Vibe-Tutor is a React 19 + Vite PWA that also ships as a Capacitor Android app and an Electron desktop app.
- App entrypoints live at repo root (unusual): `App.tsx` + `index.tsx`; UI in `components/`, logic in `services/`, minimal `src/` (CSS + runtime config).
- Navigation is a simple view state machine in `App.tsx` with lazy-loaded feature bundles (see the `lazy(() => import(...))` list).

## Run / build (Windows)

- Package manager is `pnpm`.
- Web dev: `pnpm run dev` (Vite + Electron TS watch) and open `http://localhost:5173`.
- Backend proxy (required for AI + analytics): `pnpm run start` (Express on `:3001`, see `server.mjs`).
- Typecheck+build: `pnpm run build` (runs `typecheck` then `vite build`).
- E2E: `pnpm run test` (Playwright, config in `playwright.config.ts`). Unit: `pnpm run test:unit` (Vitest, config in `vitest.config.ts`).
- In the Nx monorepo context, prefer `pnpm nx <target> vibe-tutor` (targets in `project.json`).

## AI / API integration

- Never put API keys in client code. Client calls the backend proxy via `services/secureClient.ts` using `CapacitorHttp` (CORS-safe for Android).
- Runtime backend URL selection is in `src/config.ts` (USB debug uses `adb reverse tcp:3001 tcp:3001`).
- Server-side routes are in `server.mjs` (`/api/session/init`, `/api/chat`, `/api/analytics/log`). OpenRouter support exists in `render-backend/server.mjs` (`/api/openrouter/chat`).

## Persistence + “D:” drive constraints

- Persistence is “offline-first” and platform-dependent:
  - SQLite on Android + Windows via `services/dataStore.ts` and `services/databaseService.ts` (DB file: `D:\databases\vibe-tutor.db`).
  - localStorage on web (same `DataStore` API).
- There is a one-time migration from localStorage → SQLite in `services/migrationService.ts` guarded by `vibe_tutor_migration_complete`.
- Learning analytics logs go to `D:\learning-system\logs` on the backend (`server.mjs`) and use `services/learningAnalytics.ts` for client-side events.

## Electron desktop (separate runtime)

- Electron main process is in `electron/main.ts` and is the **sole writer** to the hub DB (`D:\databases\database.db`) using `better-sqlite3`.
- Keep IPC secure: renderer only talks through the explicit contextBridge API in `electron/preload.ts`.

## Project conventions / gotchas

- Keep Vite’s classic JSX runtime (`vite.config.ts`) to avoid Android WebView `jsxDEV` issues.
- Tailwind is used heavily; UI theme tokens live in `tailwind.config.js` (glassmorphism + mobile touch sizing).
- Prefer adding new “feature” code under `components/features/*` + `services/*`, and wire into the `App.tsx` view/lazy-load list.
