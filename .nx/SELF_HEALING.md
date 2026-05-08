# Nx Cloud Self-Healing Policy

## Confidence Rules

- Treat lint and formatting failures as low-risk only when they are isolated to
  source or test files and the fix is mechanical.
- Treat typecheck, build, test, e2e, release, Android, database, and deployment
  failures as review-required unless a deterministic local command is listed
  below.
- Never auto-apply fixes that touch more than 5 files, generated assets, or files
  modified by a human in the same PR.

## Off-Limits Areas

- `apps/crypto-enhanced/**` - financial/trading logic is observation-only.
- `**/.env*`, `**/*secret*`, `**/*credential*`, `**/auth/**` - secrets and auth
  require manual review.
- `**/migrations/**`, `**/*.sql`, `D:/databases/**` - database state and schema
  changes are manual-only.
- `apps/*/android/**`, `apps/*/ios/**` - native/mobile generated files are
  manual-only unless the failing command is an explicit Android/iOS target.
- `packages/games/**` and `apps/gravity-claw/**` - shared/runtime-sensitive
  areas that require manual review before automated edits.

## Preferred Fixes

- For lint failures, prefer the project Nx target (`pnpm nx lint <project>`) and
  only then apply narrow source edits. Do not add broad rule disables.
- For TypeScript project-service errors, add or fix the relevant `tsconfig`
  coverage rather than weakening strict rules.
- For dependency failures, prefer `pnpm install --frozen-lockfile` evidence and
  Renovate-managed version updates. Do not install ad hoc dependencies.
- For flaky tests, classify first and use `quarantine.json` as the single source
  of truth before skipping any test.

## Validation Commands

- Workspace sync: `pnpm run sync:audit:report`
- Broad confidence: `pnpm run quality:affected`
- Workspace health: `pnpm run workspace:health`

## Context

- Root workspace rules live in `AGENTS.md`, `AI.md`, and `WORKSPACE.json`.
- Shared runtime data belongs on `D:/`, not under `C:/dev`.
- Direct commits to `main`, `master`, and `develop` are blocked locally.

## Deterministic Nx Checks

The following Nx commands have deterministic fix counterparts. When a check fails,
apply the matching fix before any other remediation.

- `nx format:check` -> fix with `nx format`
- `nx sync:check` -> fix with `nx sync`
- `nx conformance:check` -> fix with `nx conformance`

## Monorepo-Specific Context

- The Nx project graph is the source of truth for affected tasks. If an affected
  run behaves unexpectedly, verify the graph with `pnpm nx graph`.
- `pnpm-workspace.yaml` defines the workspace packages. Missing packages here will
  exclude projects from the graph.
- Per-app `project.json` files define targets. If a target is missing, inspect the
  project's `project.json` first.
- `nx.json` configures task pipelines and generators. Changes to pipelines or
  defaults must be validated with `pnpm nx run-many -t <target>`.
- Changes to root `package.json` or `pnpm-lock.yaml` should trigger broader affected
  analysis because they can impact the entire dependency tree.

## Known Failure Patterns

- Missing dependency in `package.json` after adding an import -> run `pnpm install`
  or `pnpm add <pkg>`, then ensure the lockfile is updated.
- `nx show projects` missing a project -> check that the project's `project.json`
  is in the expected location and that `tsconfig.base.json` paths map correctly.
- TypeScript `TS2307` (cannot find module) -> check if the imported package is a
  workspace package that has not been built yet; run `pnpm nx build <pkg>` first.
- ESLint `no-relative-imports` violation -> replace the relative path with the `@/`
  alias for in-project imports or the workspace package name for cross-package imports.
