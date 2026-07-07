# Stripe Webhook Testing Suite and Mock Webhook Guide

This guide details how to simulate Stripe checkout events, manage subscriptions, and automatically test database quota updates locally without spending real money or requiring live webhooks.

---

## 1. Webhook Handler & Database Architecture

The Stripe Webhook handler processes events sent by Stripe and updates user subscription records in the local SQLite database.

*   **Handler Endpoint**: [route.ts](file:///V:/monorepo/apps/ai-avatar-youtube-saas/src/app/api/webhooks/stripe/route.ts)
*   **Database Service**: [db.ts](file:///V:/monorepo/apps/ai-avatar-youtube-saas/src/lib/db.ts) (manages the `subscriptions` table)
*   **Pricing & Quota Configuration**: [stripe.ts](file:///V:/monorepo/apps/ai-avatar-youtube-saas/src/lib/stripe.ts)

When a checkout session is completed, updated, or deleted, the webhook handler updates the SQLite database with the following mapping:

| Tier | Price ID | Monthly Video Credits |
|---|---|---|
| **Hobby (Default)** | — | `10` |
| **Startup Pro** | `price_startup` | `100` |
| **Growth Channel** | `price_growth` | `500` |
| **SaaS Scale** | `price_saas_scale` | `2500` |

---

## 2. Running the Integration Tests

A comprehensive integration test suite verifies that the handler parses events correctly, validates signatures, and performs accurate database transitions.

*   **Test File**: [route.test.ts](file:///V:/monorepo/apps/ai-avatar-youtube-saas/src/app/api/webhooks/stripe/route.test.ts)

### How to Run the Tests
To run all tests inside `ai-avatar-youtube-saas` (which includes the Stripe webhook suite):

```powershell
pnpm nx test ai-avatar-youtube-saas
```

These tests run entirely offline. They configure a temporary test SQLite database located at `D:\databases\ai-avatar-youtube-saas\tmp\stripe-webhooks.test.db`, generate mock Stripe header signatures locally using the SDK, and mock Stripe's customer-retrieval APIs so no network traffic is generated.

---

## 3. Standalone Webhook Mock Dispatcher

A local command-line script is provided to post simulated Stripe checkout payloads directly to your local development server. This is useful for rapid prototyping and validation of database updates without setting up the Stripe CLI.

*   **Script Location**: [send-mock-webhook.js](file:///V:/monorepo/apps/ai-avatar-youtube-saas/scripts/send-mock-webhook.js)

### How to Use the Mock Dispatcher

1.  Make sure your local Next.js development server is running:
    ```powershell
    pnpm nx dev ai-avatar-youtube-saas
    ```
2.  In another terminal, execute the script, passing the target **User ID** and **Plan Tier** (`startup`, `growth`, `saas_scale`, or `hobby`):
    ```powershell
    node apps/ai-avatar-youtube-saas/scripts/send-mock-webhook.js user_123 startup
    ```

### How It Works
*   The script reads the `STRIPE_WEBHOOK_SECRET` variable from `apps/ai-avatar-youtube-saas/.env.local` (falling back to a dummy secret if not present).
*   It generates a mock Stripe payload containing the target `client_reference_id` (User ID) and the corresponding `price` for the requested tier.
*   It signs the payload using `stripe.webhooks.generateTestHeaderString` and HTTP POSTs the signed request to `http://localhost:4300/api/webhooks/stripe`.
*   Upon receipt, the local server handles the payload and upserts the user's subscription in SQLite.

---

## 4. Live Local Simulation via Stripe CLI

To simulate real, end-to-end checkout flows with Stripe's test environment without utilizing real credit cards:

### Step 1: Initialize Stripe CLI
If you don't have the Stripe CLI, install it globally:
```powershell
npm install -g @stripe/cli
```
Authenticate with your Stripe account:
```powershell
stripe login
```

### Step 2: Forward Webhooks
Forward Stripe events directly to your local web server:
```powershell
stripe listen --forward-to localhost:4300/api/webhooks/stripe
```
This command output will print a **Webhook Signing Secret** (e.g. `whsec_xxx`). 

Copy this signing secret and add it to `apps/ai-avatar-youtube-saas/.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Step 3: Trigger a Checkout Event
In a separate terminal, trigger a simulated `checkout.session.completed` event. You can pass overrides to specify your **User ID** and **Pricing Tier**:

```powershell
# Simulate upgrading user_123 to the Startup Pro Tier
stripe trigger checkout.session.completed `
  --override "checkout_session:client_reference_id=user_123" `
  --override "checkout_session:line_items[0].price=price_startup"
```

Stripe CLI will create a mock transaction in the Stripe Dashboard, generate a real event, and forward it to your local endpoint. Your server will retrieve the subscription from Stripe and automatically allocate `100` video credits to `user_123` in SQLite.
