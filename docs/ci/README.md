# CI/CD Documentation

## Overview

This monorepo uses **GitHub Actions**. The source of truth is [`/.github/workflows/`](../../.github/workflows/).

## Pipeline Stages

| Stage               | Purpose                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `install`           | Install dependencies with locked pnpm version                                      |
| `sync-audit`        | Enforce monorepo synchronization policy checks                                     |
| `lint`              | Nx affected lint checks                                                            |
| `typecheck`         | Nx affected typecheck checks                                                       |
| `test`              | Nx affected test checks                                                            |
| `build`             | Nx affected build checks                                                           |
| `dependency-review` | PR dependency diff review                                                          |
| `coverage`          | Non-blocking affected `test:coverage` while project coverage targets are completed |
| `node24-canary`     | Non-blocking Node 24 compatibility signal                                          |
| `release`           | Versioning and publish automation on `main`                                        |

## Nx-Affected Strategy

CI runs affected targets against `origin/main`:

```bash
pnpm nx affected -t lint --base=origin/main --head=HEAD
pnpm nx affected -t typecheck --base=origin/main --head=HEAD
pnpm nx affected -t test --base=origin/main --head=HEAD
pnpm nx affected -t build --base=origin/main --head=HEAD
```

The current workflow does not implement an automatic full-workspace fallback.
Use the explicit `ci:*:all` or `*:all` scripts when a full sweep is required.

CI starts an Nx Cloud CI pipeline execution when available and runs
`pnpm exec nx fix-ci` at the end of PR quality jobs. Self-healing policy lives in
`.nx/SELF_HEALING.md`; cloud-side workspace settings control which fixes can be
suggested or auto-applied.

Known flaky skips must be recorded in `quarantine.json`. Do not skip tests in
source code without an entry and an owner/tracking issue.

## Local CI Simulation

```powershell
pnpm run ci:sync
pnpm run ci:lint
pnpm run ci:typecheck
pnpm run ci:test
pnpm run ci:build
pnpm run ci:coverage
```

## Release Flow

1. Create a changeset with `pnpm changeset`.
2. Merge to `main`.
3. GitHub Actions runs the `release` job.
4. The publish step runs only when `NPM_TOKEN` is configured as a job-level
   environment variable from the repository secret.

## Dependency Automation

Renovate is the default version-update bot for npm and GitHub Actions
dependencies. GitHub Dependabot version-update config is intentionally absent to
avoid duplicate dependency PRs; repository-level dependency graph and alerts can
remain enabled in GitHub settings.
