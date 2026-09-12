# AI Avatar YouTube Studio — Production Deployment (Railway)

**Date deployed:** 2026-09-08  
**Live URL:** https://ai-avatar-studio-production.up.railway.app  
**Health Check:** https://ai-avatar-studio-production.up.railway.app/api/health  
**Verified response:** `{"status":"ok","service":"ai-avatar-youtube-saas"}` (HTTP 200)  
**Latest successful deployment ID:** `5d17c289-3f64-45db-bbdb-6d035a4a737d`

---

## 1. Cloud Infrastructure Details

| Item               | Value                                                |
| :----------------- | :--------------------------------------------------- |
| **Platform**       | Railway                                              |
| **Project Name**   | `invoiceflow`                                        |
| **Project ID**     | `c28cdf30-99c1-4b15-a36f-dbcece18a269`               |
| **Service Name**   | `ai-avatar-studio`                                   |
| **Service ID**     | `88c17377-bf9e-49c3-9694-d7b5fdff23b2`               |
| **Environment**    | `production`                                         |
| **Environment ID** | `d6f0a5d2-c58c-4171-b52c-7f42cb670287`               |
| **Public Domain**  | `ai-avatar-studio-production.up.railway.app`         |
| **Volume Name**    | `ai-avatar-studio-volume`                            |
| **Volume ID**      | `8479d8b2-e1a5-4d80-bcb7-e469071988fd`               |
| **Volume Mount**   | `/data`                                              |
| **Region**         | US East (`us-east4-eqdc4a`)                          |
| **Builder**        | Multi-stage `Dockerfile` (`node:22-bookworm-slim`)   |
| **Runtime**        | Next.js 16.2.6 standalone (`server.js` on port 3000) |
| **Restart policy** | `ON_FAILURE` (max 10 retries)                        |

SQLite database path inside the volume: `/data/ai-avatar.db` (`APP_DB_PATH`).

---

## 2. Container Boot Notes

Next.js standalone binds using the `HOSTNAME` env var. Docker/Railway sets `HOSTNAME` to the container id by default, which caused an earlier HTTP 502 (“Application failed to respond”) even though the process appeared online.

**Required bind settings (baked into `Dockerfile` and Railway variables):**

- `HOSTNAME=0.0.0.0`
- `HOST=0.0.0.0`
- `PORT=3000`

Confirmed runtime log after fix:

```text
Starting Next.js standalone from /app/server.js
▲ Next.js 16.2.6
- Local:         http://localhost:3000
- Network:       http://0.0.0.0:3000
✓ Ready in 0ms
```

---

## 3. Environment Variables (Railway)

| Variable                  | Purpose                                                      |
| :------------------------ | :----------------------------------------------------------- |
| `NODE_ENV`                | `production`                                                 |
| `HOSTNAME`                | `0.0.0.0` (Next.js listen address)                           |
| `HOST`                    | `0.0.0.0`                                                    |
| `PORT`                    | `3000`                                                       |
| `APP_DB_PATH`             | `/data/ai-avatar.db`                                         |
| `NEXT_TELEMETRY_DISABLED` | `1`                                                          |
| `SKIP_ENV_VALIDATION`     | `true` (allows boot without optional third-party keys)       |
| `NEXT_PUBLIC_APP_URL`     | `https://ai-avatar-studio-production.up.railway.app`         |
| `AUTH_SECRET`             | Session / auth signing secret (set in Railway; never commit) |
| `DPOP_SECRET`             | DPoP-related secret (set in Railway; never commit)           |

Optional / not yet required for health-page boot (configure when enabling live features):

| Variable                                    | Purpose                     |
| :------------------------------------------ | :-------------------------- |
| `STRIPE_SECRET_KEY`                         | Live Stripe billing         |
| `STRIPE_WEBHOOK_SECRET`                     | Stripe webhook verification |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | YouTube OAuth2              |
| `GEMINI_API_KEY`                            | Script generation           |
| `GCS_*` / Google Cloud credentials          | Object storage for renders  |

Do not commit `.env`, credential files, or secret values into source or snapshots.

---

## 4. Architecture (standalone app tree)

Shared monorepo packages are vendored locally under `src/shared/`:

- `@vibetech/db-app` → `src/shared/db-app/`
- `@vibetech/avatar-render-engine` → `src/shared/avatar-render-engine/`

Multi-stage Docker build:

1. **Builder** — `npm install --legacy-peer-deps`, compile native `better-sqlite3`, `npm run build` with `output: "standalone"`.
2. **Runner** — copies `.next/standalone`, `.next/static`, and `public`; starts discovered `server.js`.

`railway.json` selects the Dockerfile builder and documents `/api/health` as the healthcheck path.

---

## 5. How to Redeploy

From the app directory (service already linked):

```powershell
cd C:\projects\vibe-tech-monorepo\apps\ai-avatar-youtube-saas
railway up --detach
railway deployment list --json
railway logs -n 50
```

Verify:

```powershell
curl -s https://ai-avatar-studio-production.up.railway.app/api/health
curl -sI https://ai-avatar-studio-production.up.railway.app/
```

---

## 6. Local Development

```powershell
cd C:\projects\vibe-tech-monorepo\apps\ai-avatar-youtube-saas
npm install --legacy-peer-deps
npm run typecheck
npm test
npm run dev
```

Dev server defaults to port `4300` (`package.json` script).

Production-like local container:

```powershell
cd C:\projects\vibe-tech-monorepo\apps\ai-avatar-youtube-saas
docker build -t ai-avatar-youtube-saas .
docker run --rm -p 3000:3000 -e HOSTNAME=0.0.0.0 -e PORT=3000 -e SKIP_ENV_VALIDATION=true -v ${PWD}/data:/data ai-avatar-youtube-saas
```

Optional render worker (separate service, not part of this Railway web deploy):

```powershell
cd C:\projects\vibe-tech-monorepo\backend\ai-avatar-render-worker
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 7. Verification Evidence (2026-09-08)

| Check             | Result                                             |
| :---------------- | :------------------------------------------------- |
| Typecheck         | 0 errors (pre-deploy)                              |
| Vitest            | 10 suites / 35 tests passed (pre-deploy)           |
| Deployment status | `SUCCESS` (`5d17c289-3f64-45db-bbdb-6d035a4a737d`) |
| Runtime bind      | `0.0.0.0:3000`                                     |
| `GET /api/health` | HTTP 200 + expected JSON                           |
| `GET /`           | HTTP 200 HTML (`VibeTech AI Avatar Studio`)        |
| Volume            | `/data` attached and mounted                       |
