# invoice-automation-saas — AI Context

## What this is
SaaS platform for automated invoice generation, PDF export, and payment processing with Stripe integration.

## Stack
- **Runtime**: Node.js 22
- **Framework**: Vite + React 19 (client) + Fastify v5 (API server)
- **Key deps**: better-sqlite3, @stripe/stripe-js, jspdf + html2canvas (PDF), react-hook-form, recharts

## Dev
```bash
pnpm --filter invoice-automation-saas dev       # Vite SPA dev server
pnpm --filter invoice-automation-saas dev:api   # Fastify API server (tsx watch)
pnpm --filter invoice-automation-saas build     # tsc + vite build → dist/
pnpm --filter invoice-automation-saas build:api # Compile API → server/dist/
```

## Notes
- Two processes in dev: Vite SPA + Fastify API (run both via `dev` + `dev:api`)
- SQLite DB path via env var; store on `D:\databases\`
- PDF generation done client-side via jspdf/html2canvas
- Uses `@vibetech/ui` workspace package for shared components
- Sentry error tracking integrated (`@sentry/react`)
