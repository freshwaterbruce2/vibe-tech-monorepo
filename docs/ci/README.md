# CI/CD Documentation

## Overview

This monorepo uses **GitHub Actions**. The source of truth is [`/.github/workflows/`](../../.github/workflows/).

## Pipeline Stages

| Stage | Purpose |
| --- | --- |
| `install` | Install dependencies with locked pnpm version |
| `sync-audit` | Enforce monorepo synchronization policy checks |
| `lint` | Nx affected lint checks |
| `typecheck` | Nx affected typecheck checks |
| `test` | Nx affected test checks |
| `build` | Nx affected build checks |
| `changeset-*` | Versioning and publish automation on `main` |

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

## Local CI Simulation

```powershell
pnpm run ci:sync
pnpm run ci:lint
pnpm run ci:typecheck
pnpm run ci:test
pnpm run ci:build
```

## Release Flow

1. Create a changeset with `pnpm changeset`.
2. Merge to `main`.
3. GitHub Actions runs `changeset-version` and `changeset-publish`.
