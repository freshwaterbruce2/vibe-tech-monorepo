# Vibe Justice Finish Findings

## 2026-08-16 baseline discovery

- Canonical remote: `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git`.
- Fresh checkout HEAD: `db33d791459061ca28789ee6011cb08054e36f3c` on `main`.
- Finish branch: `codex/vibe-justice-finish-20260816`.
- Host Node is `v24.19.0`, satisfying the repository's Node 22+ range.
- Host pnpm is `9.15.0`, below the pinned `10.33.0` contract.
- `corepack pnpm` resolves the repository-pinned pnpm `10.33.0`; an older standalone
  pnpm shim precedes Corepack on PATH, so Phase 0 commands will explicitly use Corepack.
- Host Python command resolves to CPython `3.11.15`; Python launcher also lists 3.14.
- Rust is stable `1.95.0` with Cargo `1.95.0`.
- `apps/vibe-justice/project.json` exposes all seven requested baseline Nx targets.
- Backend tests run through `apps/vibe-justice/backend/run-pytest.ps1` and expect `.venv`.
- The backend README explicitly supports Python 3.11-3.13 and a requirements-based `.venv`.
- The existing React frontend plus FastAPI backend can support private localhost web
  operation, but web success cannot prove installer or Tauri sidecar acceptance.
- Repository instructions require Nx-mediated gates and specialist delegation for complex changes.
- Existing `C:\Users\fresh\vibe-development` is not a usable Git checkout; its `.git`
  directory contains only `HEAD`.
- The root install would cover 106 projects and 5,241 packages. The user explicitly
  rejected whole-monorepo setup; use a filtered Vibe Justice install instead.
- A normal pnpm `--filter vibe-justice-frontend...` install is still unsuitable:
  the repository's hoisted linker attempts to materialize all 5,241 lockfile packages.
- The frontend declares `@vibetech/core` but does not import it anywhere in source.
  Its scripts also hardcode root `node_modules` paths, preventing a clean standalone install.
- A viable app-only direction is to remove the unused workspace dependency, use local
  package binaries, and install the frontend with pnpm `--ignore-workspace`; this needs
  verification against CI/Nx before implementation.
- App-local backend baseline on Python 3.11.15: 185 passed, 1 expected xfail in 6.08s;
  coverage 63.10% exceeded the configured 55% floor. This is test evidence only.
- Existing baseline tests explicitly encode unauthenticated chat behavior, confirming
  that green legacy tests do not satisfy the new all-non-health authentication contract.
- Isolated frontend install succeeds with 505 packages after removing unused workspace
  coupling and adding an app-local lockfile. It no longer requires root Nx/node_modules.
- Frontend lint, typecheck, 427 tests (plus 1 todo), and production build pass.
- The first build exposed a missing direct `@tailwindcss/postcss` declaration; adding it
  removed accidental root-node_modules resolution and the retry built 1,949 modules.
- Playwright was targeting port 5173 while Vite owns 5175 and reused an unrelated Vibe
  Assistant server. Both are now fixed to loopback `127.0.0.1:5175`, reuse is disabled,
  and workers are capped at one. The browser settings E2E passes in 5.7 seconds.
- Case-creation E2E remains red by design: the test describes a required feature that
  does not exist yet. This is a Phase 2 product gap, not a test to weaken.
- Phase 1A backend verification after security changes: 190 passed, 1 expected xfail,
  63.58% coverage. Every non-health route is authenticated; `/api/health` stays public.

## 2026-08-16 durable case slice

- Case creation now publishes from a unique staging directory with atomic metadata
  writes and an exclusive sibling lock. Duplicate IDs return 409 without overwrite;
  failed creation removes only its own staging tree.
- The backend exposes validated create/list/get/current/archive/restore contracts.
  Current case is persisted in app data, survives a fresh client/backend restart, is
  cleared on archive, and is not silently selected on restore.
- The frontend restores authoritative current state from the backend, provides an
  accessible create dialog, keyboard case selection, `aria-current`, and a visible
  Current marker. Chat/evidence are intentionally not case-scoped in this slice.
- Backend verification: 203 passed, 1 expected xfail, 67.33% coverage.
- Frontend verification: 431 passed, 1 todo; lint, typecheck, and production build pass.
- Serialized loopback Playwright acceptance uses a unique exact-run `%TEMP%` root,
  one worker, and a test-only key. Both settings and full create -> reload -> archive ->
  restore -> reselect flows pass; no provider was called and no real case data was used.

## Open questions to resolve from source

- Exact backend dependency/venv bootstrap contract.
- Current runtime-data roots and whether repository-wide D-drive guidance fits packaged app data.
- Current API authentication coverage and launcher/health implementation paths.
- Whether E2E actually launches Tauri or retains Electron assumptions.
