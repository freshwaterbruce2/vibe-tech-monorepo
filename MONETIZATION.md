# VibeTech Monetization Engine

Workstream A centralizes revenue primitives in shared packages so SaaS apps can attach billing,
email, analytics, and AI metering without copying app-local Stripe or Resend code.

## Packages

| Package | Responsibility |
| --- | --- |
| `@vibetech/monetization` | Plan definitions, feature gates, tenant context, and usage counters. |
| `@vibetech/payments` | Stripe Checkout wrappers, webhook verification, subscription lookup, and tenant-to-customer links. |
| `@vibetech/email` | Resend client access plus shared React Email rendering and transactional templates. |
| `@vibetech/analytics` | Browser analytics plus standard monetization funnel events. |
| `@vibetech/ai` | Gemini/OpenRouter provider routing and tenant/app token usage metering. |

## Environment Variables

| Variable | Required For | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe calls | Read by `@vibetech/payments` through the shared billing client. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Used by invoice SaaS `/api/webhooks/stripe` signature verification. |
| `VITE_STRIPE_PUBLIC_KEY` | Browser checkout redirect setup | Public key for client-side Stripe.js. |
| `RESEND_API_KEY` | Transactional email | Read by `@vibetech/email` when creating the Resend client. |
| `RESEND_WEBHOOK_SECRET` | Resend webhooks | Used by invoice SaaS `/api/webhooks/resend` Svix verification. |
| `EMAIL_FROM` | Transactional email sender | Must be a verified Resend sender. |
| `APP_BASE_URL` | Checkout redirects and email links | Base URL used in invoice links and Stripe success/cancel URLs. |
| `INVOICE_SAAS_DEFAULT_PLAN` | Invoice SaaS plan gate | One of `free`, `starter`, `pro`, or `business`; defaults to `free`. |
| `GEMINI_API_KEY` | Gemini provider | Used by apps that instantiate `createFetchGeminiProvider`. |
| `OPENROUTER_API_KEY` | OpenRouter fallback | Used by apps that instantiate `createFetchOpenRouterProvider`. |

## Invoice SaaS Attachment

`apps/invoice-automation-saas` is the first proof app. It now depends on the new
`@vibetech/*` monetization packages and keeps app-specific routing, persistence, and webhook
behavior local.

Current plan behavior:

- `free`: may create up to 3 invoices per calendar month and cannot use recurring billing.
- `starter`, `pro`, and `business`: unlock unlimited invoice creation.
- `pro` and `business`: unlock recurring billing and AI-assisted features.
- `starter`, `pro`, and `business`: unlock dunning email features.

Stripe Checkout should not hard-code `payment_method_types`; Stripe Dashboard payment method
settings control eligible methods through dynamic payment methods.
