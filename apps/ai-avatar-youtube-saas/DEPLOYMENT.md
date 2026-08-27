# Deployment - VibeTech AI Avatar YouTube Automator v2

## Architecture

- **Web App**: Next.js 15/16 App Router (`apps/ai-avatar-youtube-saas`)
- **Render Worker**: FastAPI + Celery (`backend/ai-avatar-render-worker`)
- **Message Broker**: Redis
- **Object Storage**: Google Cloud Storage
- **Metadata DB**: SQLite via `@vibetech/db-app`

## Local Development

```powershell
pnpm nx dev ai-avatar-youtube-saas
```

Start Redis and the render worker:

```powershell
cd backend/ai-avatar-render-worker
python -m venv .venv
. .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
celery -A app.tasks worker --loglevel=info
```

## Docker

### Web App

```powershell
docker build -t ai-avatar-youtube-saas -f apps/ai-avatar-youtube-saas/Dockerfile .
```

### Render Worker

```powershell
docker build -t ai-avatar-render-worker -f backend/ai-avatar-render-worker/Dockerfile backend/ai-avatar-render-worker
```

## Vercel / Railway

- The web app is configured for Next.js `standalone` output.
- The worker container can be deployed to Railway, Cloud Run, or any container
  platform with Redis access.
- Ensure all secrets are stored as runtime environment variables; never commit
  `.env` files.
