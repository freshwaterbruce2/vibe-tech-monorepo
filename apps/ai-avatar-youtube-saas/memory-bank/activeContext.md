# Active Context: ai-avatar-youtube-saas (AI Avatar YouTube Studio)

## Status: LIVE IN PRODUCTION (Railway)

Last updated: 2026-09-08

### Production Deployment Summary

- **Live URL:** https://ai-avatar-studio-production.up.railway.app
- **Health Endpoint:** `GET /api/health` → HTTP 200 `{"status":"ok","service":"ai-avatar-youtube-saas"}`
- **Root page:** HTTP 200 HTML titled `VibeTech AI Avatar Studio`
- **Hosting Platform:** Railway (Project: `invoiceflow` / Service: `ai-avatar-studio`)
- **Persistent Volume:** `ai-avatar-studio-volume` mounted at `/data` (SQLite `APP_DB_PATH=/data/ai-avatar.db`)
- **Latest Deployment ID:** `5d17c289-3f64-45db-bbdb-6d035a4a737d` (Status: SUCCESS)
- **Runtime:** Next.js 16.2.6 standalone listening on `0.0.0.0:3000`

### Architectural Notes (2026-09-08)

1. Shared packages vendored under `src/shared/` (`db-app`, `avatar-render-engine`).
2. Multi-stage Dockerfile builds standalone output and mounts `/data` for SQLite.
3. Fixed Railway 502 by setting `HOSTNAME=0.0.0.0` (Docker otherwise binds Next.js to the container id).
4. Typecheck clean; Vitest 10 suites / 35 tests passed prior to deploy.

### Local Persistence & Snapshots

- Canonical working source: `C:\projects\vibe-tech-monorepo\apps\ai-avatar-youtube-saas`
- Production snapshot: `C:\projects\_vibe-snapshots\ai-avatar-production-final-20260908-145814`
- Deploy metadata: `apps/ai-avatar-youtube-saas/DEPLOYMENT.md`

### Next Steps

1. Provision live Stripe / YouTube OAuth / Gemini / GCS secrets when enabling paid + publish flows.
2. Optionally attach a custom domain under vibe-tech.org.
3. Deploy/connect `backend/ai-avatar-render-worker` when full render pipeline is required in production.
