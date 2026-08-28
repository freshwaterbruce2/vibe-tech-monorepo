# Findings

## Research Notes

| Topic | Source | Finding |
| --- | --- | --- |
| Nx validation | Nx docs via MCP | Single project validation should use `nx test <project>` and `nx build <project>`; workspace convention prefixes with `pnpm`. |
| Stripe webhooks | Context7 Stripe Node docs | Webhook verification requires the raw request body, Stripe signature header, and webhook signing secret passed to `stripe.webhooks.constructEvent`. |
| Fastify raw body | Context7 Fastify docs | Custom content-type parsers can preserve raw request bodies for HMAC/webhook signature validation. |
| Stripe events | Stripe docs web search | Relevant subscription events include `checkout.session.completed` and `customer.subscription.*`; subscription state should be coordinated through webhooks. |
| Scope boundary | User goal | All edits must remain under `apps/discharge-ez/`; planning files are stored here to respect that boundary. |

## Local Discoveries

- `apps/discharge-ez` already depends on `@vibetech/auth` and `@vibetech/billing`.
- Existing app already has `/api/billing/demo-checkout` and a Stripe webhook section, but auth still references `DEMO_USER_*`.
- `apps/discharge-ez/vibe-app.json` has a static `mrrCents` value of `900`.
- Initial `pnpm nx show project discharge-ez` failed because Nx project graph processing tripped over `apps/vibe-shop/vitest.config.ts`; this is workspace host noise outside the requested edit boundary.
- Final implementation keeps all file edits within `apps/discharge-ez/` and does not modify shared `@vibetech` packages.
