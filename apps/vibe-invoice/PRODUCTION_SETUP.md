# InvoiceFlow Production Setup Guide

## Quick Start (Minimum Required)

You only need **2 things** to run InvoiceFlow locally:

### 1. Generate an Auth Secret

```powershell
cd V:\monorepo\apps\invoice-automation-saas
.\scripts\generate-secret.ps1
```

Copy the generated secret.

### 2. Create your `.env.local`

```powershell
cp .env.example .env.local
notepad .env.local
```

Paste your `AUTH_SECRET` and set `DATABASE_PATH`:

```env
AUTH_SECRET=your-generated-secret-here
DATABASE_PATH=D:\databases\invoiceflow.db
```

### 3. Build & Run

```powershell
# Build frontend
pnpm nx run invoice-automation-saas:build

# Build API
pnpm nx run invoice-automation-saas:api:build

# Start server (serves both API + frontend)
cd V:\monorepo\apps\invoice-automation-saas
$env:AUTH_SECRET="your-secret"
$env:DATABASE_PATH="D:\databases\invoiceflow.db"
$env:SERVE_WEB="1"
$env:WEB_DIST_DIR="V:\monorepo\apps\invoice-automation-saas\dist"
node server/dist/index.js
```

Open http://localhost:8787

---

## What's Optional?

| Service | Required? | What breaks without it |
|---------|-----------|------------------------|
| **AUTH_SECRET** | ✅ Yes | Cannot log in or use auth |
| **DATABASE_PATH** | ✅ Yes | Cannot store data |
| **Stripe** | ❌ No | Payments show "demo mode" — invoices can still be created and marked paid manually |
| **Resend** | ❌ No | Emails won't send — invoice creation/recurring still works |
| **Sentry** | ❌ No | No error tracking — app runs fine |
| **Analytics** | ❌ No | No tracking — app runs fine |

---

## Adding Stripe (Real Payments)

1. Sign up at https://stripe.com
2. Get your keys from Dashboard → Developers → API Keys
3. Add to `.env.local`:
   ```env
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. For webhooks (production), create a webhook endpoint pointing to `/api/webhooks/stripe`
5. Add the webhook signing secret:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Adding Resend (Real Emails)

1. Sign up at https://resend.com
2. Get your API key from Settings → API Keys
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_...
   ```
4. For email delivery webhooks, add:
   ```env
   RESEND_WEBHOOK_SECRET=...
   ```
5. Set your sender domain in `server/src/email/send.ts` (search for `from:`)

---

## Docker Deployment

```powershell
cd V:\monorepo\apps\invoice-automation-saas
docker-compose up --build -d
```

The Docker container uses `/data/invoiceflow.db` for SQLite and exposes port `8787`.
