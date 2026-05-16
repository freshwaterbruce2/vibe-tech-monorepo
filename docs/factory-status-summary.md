# App Factory Status Summary

Last updated: 2026-05-15

## Current state

The app-factory goal is in progress. The workspace has moved past the audit and first extraction phases, and the factory plugin exists with working generators. The goal is not complete yet.

## What is done

### Phase 0

- `docs/factory-audit.md` exists.
- The active-project tooling was extended so `pnpm run project:start app-factory` works as a named workstream.

### Shared packages extracted

These packages now exist under `packages/` and have already been validated on their own narrow build/test paths:

- `@vibetech/auth`
- `@vibetech/billing`
- `@vibetech/emails`
- `@vibetech/landing`
- `@vibetech/analytics`
- `@vibetech/entitlements`

### Donor app migration progress

`apps/invoice-automation-saas` is already consuming the shared factory packages in meaningful seams:

- auth bridge
- billing bridge
- email render/template bridge
- landing bridge
- analytics bridge
- entitlement bridge

Narrow validation that has passed repeatedly:

- `pnpm nx typecheck invoice-automation-saas`
- `pnpm nx run invoice-automation-saas:api:build`
- `pnpm nx build invoice-automation-saas`

### Factory plugin

`plugins/factory` exists as a workspace package and exposes:

- `@vibetech/factory:saas`
- `@vibetech/factory:tauri-app`
- `@vibetech/factory:landing-only`

Smoke generation has already been proven with:

- `apps/factory-saas-smoke`
- `apps/factory-landing-smoke`

These generated-app paths have already validated on narrow commands:

- `pnpm nx build factory-saas-smoke`
- `pnpm nx run factory-saas-smoke:api:build`
- `pnpm nx typecheck factory-saas-smoke`
- `pnpm nx build factory-landing-smoke`

### Command Center

`apps/vibetech-command-center` already has the first Factory panel slice:

- lists generated apps via `factory:generated` tags
- launches generators through the existing process bridge
- shows last-run generator output

## What is still incomplete

### 1. Completion audit against the goal

The goal requires a real completion audit against `GOAL_APP_FACTORY.md`. That has not been finished yet.

### 2. Donor app zero-regression proof

`invoice-automation-saas` builds cleanly against the shared packages, but full zero-regression proof is still incomplete.

The current blocker is server-side Vitest coverage on this machine:

- focused app-local Vitest selection was corrected
- the remaining failure is still the local `better-sqlite3` native-load problem for the donor server tests

So the current state is:

- discovery/config mismatch: fixed
- native binding failure: still present locally

### 3. Factory panel is still shallow

The Factory panel exists, but it does not yet satisfy the goal requirement for richer monetization status:

- Stripe connected
- first revenue date
- MRR

Right now the panel still shows a placeholder state instead of those real app-level signals.

### 4. One real generated monetized app is still missing

The goal requires one new app generated end to end via the factory and shipped with working Stripe Checkout in test mode. That has not happened yet.

Smoke apps exist, but they are not the same as a real shipped generated app.

### 5. Success-criteria proof is still incomplete

Some package-consumption requirements look close, but they still need an explicit evidence pass:

- six shared packages consumed by at least two apps each
- plugin outputs meet the required generated surfaces
- donor app migration is complete enough to count as the proof app

## Recommended next work

1. Finish the Factory panel data model so it reads app-level factory metadata and shows real monetization readiness fields instead of `pending`.
2. Pick one canonical generated SaaS app and push it beyond smoke generation into a real monetized app candidate.
3. Re-run a completion audit against every binary success criterion in `GOAL_APP_FACTORY.md`.
4. Resolve or work around the donor server-test environment blocker so the zero-regression claim is backed by stronger evidence.

## Practical pause point

If work resumes now, the best next concrete lane is:

- deepen `vibetech-command-center` Factory panel with app metadata and monetization-status signals

That is the clearest missing success criterion that is both local and implementable without pretending the overall goal is already done.
