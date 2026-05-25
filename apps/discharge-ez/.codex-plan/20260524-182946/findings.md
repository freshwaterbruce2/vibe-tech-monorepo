# Findings

## Research Notes

| Topic | Source | Finding |
| --- | --- | --- |
| Memory | `MEMORY.md` | Prior SaaS ship work showed webhook persistence and entitlement state are part of the real revenue gate, not optional polish. |
| Boundary | User goal | Edits are limited to `packages/billing/`, `apps/discharge-ez/`, and `plugins/factory/src/generators/saas/`. |
| Planning file location | User boundary + planning-with-files | Session files live under `apps/discharge-ez/.codex-plan/20260524-182946/` to avoid out-of-bound edits. |

## Local Discoveries

- `packages/billing/src/index.ts` already owns `getStripeClient` and `verifyWebhookSignature`, so the new bus can build on the same Stripe dependency without another package.
- `apps/discharge-ez/server/src/index.ts` had app-specific SQLite persistence and reusable routing/idempotency/MRR helper logic mixed together.
- `plugins/factory/src/generators/saas/files/server/src/index.ts__tmpl__` did not previously include a Stripe webhook route; generated apps only had Checkout smoke support.

## Decisions

- Keep app-specific database writes in `discharge-ez`; the shared bus handles event construction, idempotency dispatch, exact handlers, prefix handlers, Stripe ID extraction, and MRR math.
- Keep the generated SaaS template starter persistence lightweight with an in-memory processed-event set, and document that production apps should replace it with their database.
- Nx 22 documentation supports explicit project arguments for `run-many`; the comma-delimited `--projects=...` form exited with `No tasks were run`, so final proof used explicit `--projects @vibetech/billing discharge-ez @vibetech/factory`.
