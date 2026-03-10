# Self-hosting (Server + Domain)

This project is designed to run on your own server and domain, with all persistent data stored in a
SQLite database on `D:\` (WAL mode).

## 1) Build

From `C:\dev\apps\invoice-automation-saas`:

- Install deps: `pnpm install`
- Build web UI: `pnpm build`
- Build API: `pnpm build:api`

## 2) Configure environment

Create a production env file and set:

- `DATABASE_PATH=D:\databases\invoiceflow.db` (required; server fails fast if not on `D:\`)
- `AUTH_SECRET=...` (required; >= 32 chars)
- `HOST=0.0.0.0`
- `PORT=8787`
- `TRUST_PROXY=1` (if behind a reverse proxy)
- `SERVE_WEB=1`
- `WEB_DIST_DIR=C:\dev\apps\invoice-automation-saas\dist`
- `COOKIE_DOMAIN=invoiceflow.yourdomain.com` (optional; set when using a real domain)

See `apps/invoice-automation-saas/.env.production.example`.

## 3) Run the API (serves the UI too)

From `C:\dev\apps\invoice-automation-saas`:

- Start: `pnpm start:api`

With `SERVE_WEB=1`, the API also serves the SPA from your `dist/` folder.

## 4) Reverse proxy + TLS (recommended)

Put a reverse proxy in front for HTTPS and clean domain routing.

**Example (Caddyfile):**

```
invoiceflow.yourdomain.com {
  reverse_proxy 127.0.0.1:8787
}
```

## 5) Windows service (recommended)

Run the API as a service so it restarts automatically:

- NSSM: <https://nssm.cc/>
- Or a scheduled task on startup.

The service should run from `C:\dev\apps\invoice-automation-saas` so `WEB_DIST_DIR` can be relative
(or set `WEB_DIST_DIR` explicitly).

