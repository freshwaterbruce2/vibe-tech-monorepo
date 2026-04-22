---
type: ai-entrypoint
scope: project
audience:
  - claude-code
status: active
lastReviewed: 2026-04-21
---

# CLAUDE.md — Vibe-Justice

Tauri v2 desktop app for legal document analysis. React 19 + TypeScript frontend,
FastAPI + Python 3.13 backend sidecar. Canonical workspace rules live in
`../../docs/ai/WORKSPACE.md`.

## Architecture

- **Frontend** (`frontend/`) — Vite + React 19 + TypeScript. All network calls go
  through `src/services/httpClient.ts` (adds auth headers, handles retries).
- **Backend** (`backend/`) — FastAPI + SQLite. Rate-limited via `slowapi`
  (`vibe_justice/utils/rate_limit.py`). Database path must come from the
  `DATABASE_PATH` env var — never hardcoded.
- **Tauri** — scoped capabilities in `frontend/src-tauri/capabilities/default.json`;
  backend ships as a PyInstaller sidecar built by `build_v8_final.ps1`
  (spec: `native.spec`).

## Required env vars (backend)

| Var | Purpose |
|-----|---------|
| `DATABASE_PATH` | SQLite path (`D:\databases\vibe_justice.db` in dev, `:memory:` in tests) |
| `VIBE_JUSTICE_ENV` | `development` / `test` / `production` |
| `VIBE_JUSTICE_ALLOWED_ORIGINS` | Comma-separated CORS allowlist |

## Nx targets (see `project.json`)

- `vibe-justice:lint` / `:typecheck` / `:test:frontend` / `:build:frontend`
- `vibe-justice:test:backend` (pytest, coverage floor 60% — see `backend/pytest.ini`)
- `vibe-justice:test:backend:coverage` (HTML coverage report)
- `vibe-justice:backend:build` (PyInstaller via `build_v8_final.ps1`)
- `vibe-justice:tauri:dev` / `:tauri:build`
- `vibe-justice:e2e` (Playwright)
- `vibe-justice:backend:migrate` / `:backend:migrate:create` (Alembic)

## CI

`.github/workflows/vibe-justice.yml` runs on changes to `apps/vibe-justice/**`:

- **frontend job**: install → lint → typecheck → Vitest → build
- **backend job**: pip install → pytest (coverage floor 60%)

## Related docs

- AI notes: `AI.md`
- Legacy design docs: `docs/archive/` (historical; not binding)
