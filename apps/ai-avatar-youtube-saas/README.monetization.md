# Monetization and Database Reference - VibeTech AI Avatar YouTube Automator v2

This document maps the monetization plans, database schema, and environment
configuration for the Next.js 15/16 web-first AI Avatar YouTube Automator.

## Pricing Tiers

| Plan | Price (Monthly) | Included Features |
| ---- | --------------- | ----------------- |
| **Free** | Free | 3 avatar uploads, watermarked renders |
| **Pro** | $19 | Unlimited renders, HD output, direct YouTube publish |

## Feature Flags and Entitlements

| Feature Key | Display Name | Description |
| ----------- | ------------ | ----------- |
| `avatar.upload` | Avatar Upload | Upload avatar images from the browser camera |
| `render.hd` | HD Render | Export 720p/1080p MP4 without watermark |
| `publish.youtube` | YouTube Publish | One-click YPP-compliant upload |

## Database Schema

The application uses `@vibetech/db-app` SQLite with WAL at the configured
`APP_DB_PATH`.

### Table: `avatar_assets`

| Column | Definition |
| ------ | ---------- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `owner_id` | `TEXT` |
| `gcs_path` | `TEXT NOT NULL UNIQUE` |
| `signed_url` | `TEXT` |
| `signed_url_expires` | `INTEGER` |
| `mime_type` | `TEXT` |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` |

### Table: `render_jobs`

| Column | Definition |
| ------ | ---------- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `status` | `TEXT NOT NULL DEFAULT 'queued'` |
| `script_prompt` | `TEXT NOT NULL` |
| `voice_id` | `TEXT NOT NULL` |
| `audio_sample_rate` | `INTEGER NOT NULL DEFAULT 16000` |
| `asset_paths` | `TEXT NOT NULL` |
| `viseme_mapping` | `TEXT` |
| `output_url` | `TEXT` |
| `error_message` | `TEXT` |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` |

### Table: `oauth_tokens`

| Column | Definition |
| ------ | ---------- |
| `provider` | `TEXT NOT NULL` |
| `user_id` | `TEXT NOT NULL` |
| `access_token_encrypted` | `TEXT NOT NULL` |
| `refresh_token_encrypted` | `TEXT` |
| `expires_at` | `INTEGER` |
| `dpop_jkt` | `TEXT` |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` |
| **PK** | `(provider, user_id)` |

## Environment Configuration

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:4300

# Database (uses D:\databases by default)
APP_DB_PATH=D:\databases\ai-avatar-youtube-saas.db

# Google Cloud Storage (server-only)
GCS_CREDENTIALS={}
GCS_BUCKET_NAME=vibetech-avatar-assets

# AI / Voice (server-only)
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Render worker
RENDER_WORKER_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379/0

# YouTube OAuth (server-only)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:4300/api/auth/youtube/callback

# Auth / DPoP
AUTH_SECRET=change-me-min-32-characters-long
DPOP_SECRET=change-me-min-32-characters-long
```

## First Launch Sequence

1. **Schema Initialization**: Next.js Server Actions create `avatar_assets`,
   `render_jobs`, and `oauth_tokens` tables on first use.
2. **DPoP Binding**: The upload flow requests a server-signed challenge and
   binds each upload to a single-use nonce.
3. **Render Worker**: Long-running renders are enqueued in Redis and processed
   by the FastAPI/Celery worker.
4. **YouTube OAuth**: Users connect a channel via OAuth `access_type=offline`;
   tokens are encrypted and stored server-side.
