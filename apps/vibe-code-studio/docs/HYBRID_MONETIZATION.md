# BYOK and subscription rollout

The desktop editor supports two funding choices. BYOK uses the customer's locally
stored provider key, with OpenRouter as the primary setup. Subscription mode uses
an authenticated managed backend. A mode change applies after restarting the app
so running tasks do not silently change who pays. Neither mode silently falls
back to the other.

## Proposed launch offer

Start with BYOK and one Pro subscription, with a clearly stated AI allowance.
A $20/month Pro price is a candidate, not an activated Stripe product. Cursor's
published entry price is $20/month and includes a model-usage allowance; its
on-demand usage is billed separately. Source checked September 10, 2026:
https://cursor.com/pricing

This implementation meters **request attempts per UTC calendar month**, not
dollar credits. Each agent may make multiple requests per task. Failed or aborted
upstream attempts count because the provider may already have incurred cost.
Included models, maximum output, input size, and monthly allowance are bounded.
Do not advertise unlimited AI or dollar-denominated credits. Choose the launch
allowance after measuring representative agent tasks and provider invoices.
The current implementation has no automatic overage charge.

## Hosting candidate

A paid Render web service with a persistent disk is a small-launch candidate
for the existing Node/SQLite backend. Keep one instance with this SQLite design.
Render free web services cannot attach persistent disks and lose local files on
restart/redeploy; they are unsuitable for this subscription database.
Review current compute/storage prices before provisioning:
https://render.com/pricing
https://render.com/docs/disks
https://render.com/docs/free

The hosted service must run under operator control. Customer-controlled desktop
databases cannot enforce paid entitlements. Never package your provider key,
Stripe secret, or auth signing secret in the desktop app. Hosted mode disables
the companion's WebSocket machine-control endpoints and local BYOK-key upload.

## Server configuration

Set these using the host's secret/environment settings, never frontend VITE keys:

| Variable | Purpose |
| --- | --- |
| `VCS_MANAGED_AI_ENABLED=true` | Enable hosted managed service mode |
| `AUTH_SECRET` | Unique random secret, at least 32 characters |
| `AUTH_COOKIE_NAME` | Use a VCS-specific name, e.g. `vcs_session` |
| `OPENROUTER_API_KEY` | Operator's funded provider key |
| `VCS_MANAGED_AI_MONTHLY_REQUESTS` | Positive request allowance per account |
| `VCS_MANAGED_AI_MAX_TOKENS` | Positive maximum output per request |
| `VCS_MANAGED_AI_MODELS` | Comma-separated permitted OpenRouter model IDs |
| `STRIPE_SECRET_KEY` | Server Stripe key; start in test mode |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this exact webhook endpoint |
| `VCS_STRIPE_PRO_PRICE_ID` | Recurring Stripe Price ID for Pro |
| `VCS_BILLING_RETURN_URL` | Operator-owned HTTPS return page |
| `VCS_ALLOWED_ORIGINS` | Exact permitted web-client origins, comma-separated |
| `VCS_DATABASE_PATH` | SQLite file on mounted persistent disk |
| `PORT` | Hosting platform's supplied port |

Create the database's parent directory on the persistent mount before startup.
Use a separate database from personal desktop state. Configure scheduled backups
and test restoration. SQLite WAL files belong on that same persistent mount.

Installed desktop builds pass Rust's exact database path to the sidecar. An
explicit `VCS_DATABASE_PATH` wins, then an existing `D:\databases` directory;
Windows machines without that directory use
`%APPDATA%\vibe-code-studio\vibe_studio.db`. Existing data is never moved or deleted.

From the repository root, install the locked dependencies for the app and build
its shared auth/billing packages before starting the server:

```sh
pnpm install --filter vibe-code-studio... --frozen-lockfile
pnpm --filter @vibetech/auth --filter @vibetech/billing run build
node apps/vibe-code-studio/scripts/backend-server.js
```

Use a supported Node runtime with the matching better-sqlite3 native module.
These commands require Linux validation on the chosen host before deployment;
the development checkout was validated on Windows. Do not use the Windows
desktop sidecar packaging command to build the hosted Linux service.

Register `/api/webhooks/stripe` on the HTTPS service for checkout completion and
subscription created/updated/deleted events. Enable the Stripe customer portal
for cancellation and payment-method management. The webhook verifies signatures
and retrieves current subscription state to handle delayed events.

## Desktop release configuration

Set `VITE_BACKEND_URL` to the hosted HTTPS base URL. Auth, billing and managed AI
must use the same service. Add that exact origin to `connect-src` in
`src-tauri/tauri.conf.json` before rebuilding; the current CSP only allows local
services and existing provider domains. Do not use a wildcard origin.

Configure the server's allowed origins for the intended browser frontend and
verify the packaged Tauri origin/cookie flow. The HTTPS billing return page
should tell users to return to the editor and refresh their plan. Checkout opens
in the external browser so it does not replace unsaved editor work.

## Required launch verification

Test a fresh account through signup, checkout, signed webhook activation, managed
request, allowance exhaustion, billing portal cancellation, period expiry, and
return to BYOK. Repeat in the packaged Windows app, including cross-site session
cookies and the exact CSP. Test invalid signatures, expired sessions, another
account's allowance, and attempts to access hosted local-machine endpoints.

Add production authentication recovery/email verification, ingress rate limits,
monitoring, and database backups before a public launch. Validate the chosen
Stripe Price, allowed models and allowance before accepting real payments.
No hosting service, Stripe product, or production deployment is created by these
source changes.
