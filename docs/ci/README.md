# CI/CD Documentation

## Overview

This monorepo uses **GitHub Actions**. The source of truth is [`/.github/workflows/`](../../.github/workflows/).

## Pipeline Stages

| Stage | Purpose |
| --- | --- |
| `install` | Install dependencies with locked pnpm version |
| `sync-audit` | Enforce monorepo synchronization policy checks |
| `lint` | Nx affected lint checks (fallback: all projects) |
| `typecheck` | Nx affected typecheck checks (fallback: all projects) |
| `test` | Nx affected test checks (fallback: all projects) |
| `build` | Nx affected build checks (fallback: all projects) |
| `changeset-*` | Versioning and publish automation on `main` |

## Nx-Affected Strategy

CI runs affected targets against `origin/main`:

```bash
pnpm nx affected -t lint --base=origin/main --head=HEAD
pnpm nx affected -t typecheck --base=origin/main --head=HEAD
pnpm nx affected -t test --base=origin/main --head=HEAD
pnpm nx affected -t build --base=origin/main --head=HEAD
```

If the base ref is unavailable in CI, the pipeline falls back to full `nx run-many --all`.

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
