# InvoiceFlow Production Deployment (Railway)

**Date deployed:** 2026-09-08  
**Live URL:** https://invoiceflow-production-86e9.up.railway.app  
**Custom Domain:** https://invoiceflow.vibe-tech.org  
**Health Check:** https://invoiceflow-production-86e9.up.railway.app/api/health

---

## 1. Cloud Infrastructure Details

- **Platform:** Railway
- **Project Name:** `invoiceflow` (ID: `c28cdf30-99c1-4b15-a36f-dbcece18a269`)
- **Service Name:** `invoiceflow` (ID: `8ce6b557-8911-4e17-b548-c7410a66d423`)
- **Environment:** `production` (ID: `d6f0a5d2-c58c-4171-b52c-7f42cb670287`)
- **Volume:** `invoiceflow-volume` mounted at `/data` (ID: `d4616c3a-9272-46ae-8166-2a249ba05b96`)
- **Container Build:** Multi-stage Dockerfile (`node:22-bookworm-slim`) with native C++ compilation for `better-sqlite3`.

---

## 2. DNS Configuration

To activate the custom domain `invoiceflow.vibe-tech.org`, add the following DNS record:

| Type      | Name / Host   | Target Value              | TTL        |
| :-------- | :------------ | :------------------------ | :--------- |
| **CNAME** | `invoiceflow` | `l7kkzqu9.up.railway.app` | 300 / Auto |

_(Optional verification TXT record if required)_:

- **Type**: `TXT`
- **Name**: `_railway-verify.invoiceflow`
- **Value**: `railway-verify=8dd05d4c99936637fd0a27265c517b9daf7ccbbc602cb55ab88ec24b6d02e81f`

---

## 3. Environment Variables Configured in Railway

| Variable                    | Configured Value / Description                       |
| :-------------------------- | :--------------------------------------------------- |
| `NODE_ENV`                  | `production`                                         |
| `HOST`                      | `0.0.0.0`                                            |
| `PORT`                      | `8787`                                               |
| `DATABASE_PATH`             | `/data/invoiceflow.db`                               |
| `SERVE_WEB`                 | `1`                                                  |
| `WEB_DIST_DIR`              | `/app/dist`                                          |
| `AUTH_SECRET`               | 64-character cryptographically secure token          |
| `APP_BASE_URL`              | `https://invoiceflow-production-86e9.up.railway.app` |
| `INVOICE_SAAS_DEFAULT_PLAN` | `pro`                                                |

---

## 4. Connecting Live Stripe Payments

When ready to enable live payments:

```powershell
cd C:\projects\vibe-tech-monorepo\apps\vibe-invoice
railway variable set STRIPE_SECRET_KEY="sk_live_..."
railway variable set VITE_STRIPE_PUBLIC_KEY="pk_live_..."
railway variable set STRIPE_WEBHOOK_SECRET="whsec_..."
```

Webhook destination in Stripe dashboard:

- `https://invoiceflow-production-86e9.up.railway.app/api/webhooks/stripe`
- Events: `checkout.session.completed`

---

## 5. Local Standalone Architecture

The application has been decoupled from monorepo workspace dependencies:

- Shared modules vendored into `server/src/shared/`:
  - `auth/` (session cookies, scrypt password hashing, JWT)
  - `monetization/` (plans, feature flags, entitlements)
  - `billing/` (dunning sweep, overdue policies, Stripe client)
  - `email/` (Resend transactional delivery)
  - `emails/` (React email templates: InvoiceCreated, OverdueReminder, PaymentReceipt)
  - `payments/` (Stripe Checkout session builder)
- Local builds use native NodeNext module resolution.

---

## 6. How to Run Locally

```powershell
cd C:\projects\vibe-tech-monorepo\apps\vibe-invoice
npm install
npm run build
npm run build:api
node server/dist/index.js
```
