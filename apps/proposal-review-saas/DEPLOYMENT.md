# Proposal Review Deployment

This app is the current real generated SaaS candidate for the factory goal.

## Local ship preflight

Run this before attempting a live deploy:

```powershell
pnpm nx run proposal-review-saas:ship:check
```

What it proves locally:
- shared packages build cleanly
- frontend and API compile cleanly
- the compiled API passes health/auth/pro-route smoke checks
- the checkout route returns a safe configuration error when Stripe credentials are absent
- if `STRIPE_SECRET_KEY` is present, the checkout route must return a Stripe Checkout URL
- missing Stripe or deploy credentials are reported explicitly as warnings

To make missing deploy credentials fail the preflight, run:

```powershell
$env:SHIP_CHECK_REQUIRE_DEPLOY_ENV='1'; pnpm nx run proposal-review-saas:ship:check
```

## Deployment shape

- Frontend: Vercel static Vite deployment
- Backend: Railway Fastify deployment
- Billing: Stripe Checkout in test mode first

## Required environment variables

### Backend

```env
PORT=3000
HOST=0.0.0.0
APP_BASE_URL=https://proposal-review.your-domain.com
STRIPE_SECRET_KEY=
RESEND_API_KEY=
SENTRY_DSN=
```

### Frontend

```env
VITE_API_BASE_URL=https://proposal-review-api.your-domain.com
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
VITE_STRIPE_PUBLIC_KEY=
SENTRY_DSN=
```

## Railway backend steps

1. Deploy from the monorepo root.
2. Use [railway.json](C:/dev/apps/proposal-review-saas/railway.json).
3. Set the backend environment variables above.
4. Confirm `GET /api/health` returns `{"ok":true,"app":"proposal-review-saas"}`.
5. Confirm `GET /api/billing/demo-checkout` returns a Stripe Checkout URL once `STRIPE_SECRET_KEY` is set.

## Vercel frontend steps

1. Import the repo in Vercel.
2. Set the project root to `apps/proposal-review-saas`.
3. Enable source files outside the root directory so pnpm workspace packages are available.
4. Install command: `cd ../.. && pnpm install --frozen-lockfile --filter ./apps/proposal-review-saas...`
5. Build command: `pnpm run build:shared:api && pnpm run build`
6. Output directory: `dist`
7. Set the frontend environment variables above.
8. Use [vercel.json](C:/dev/apps/proposal-review-saas/vercel.json) so `/terms` and `/privacy` resolve to the SPA entry.

## Production proof still missing

This deployment scaffold is present, but the app is not yet proven deployed in production from this workspace session.

The current blockers are live credentials:

- `STRIPE_SECRET_KEY` is not available in the current environment
- `VITE_STRIPE_PUBLIC_KEY` is not available in the current environment
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are not available in the current environment
- `RAILWAY_TOKEN` is not available in the current environment

Until those exist and a live deploy is performed, the app is only locally smoke-verified.
