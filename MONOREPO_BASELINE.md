# Monorepo Baseline

Last updated: 2026-05-22
Workspace: `V:\monorepo` on desktop host `MYFIRSTBUILD`
Package: `@vibetech/workspace`

## Purpose

This file is the starting contract for keeping the whole monorepo healthy. Use it before deep work on individual apps so checks, CI, and project priorities stay consistent.

## Execution Baseline

- Node: `>=22.0.0`; SSH check reported `v22.22.2`.
- pnpm: workspace pins `pnpm@10.33.0`; SSH check reported `10.33.0`.
- Nx: workspace uses pnpm/Nx with apps under `apps` and libraries under `packages`.
- Projects: `pnpm exec nx show projects` reported 93 projects on 2026-05-22.
- Root `pnpm run build` intentionally fails. Build a project or use Nx run-many/affected commands instead.
- Remote SSH checks should use the repaired desktop PATH. If Git emits config path warnings over SSH, run with `GIT_CONFIG_GLOBAL=NUL` and `XDG_CONFIG_HOME=V:\monorepo\.no-xdg` until the desktop Git config is permanently cleaned up.
- SSH validation has a Windows junction caveat: `pnpm install --frozen-lockfile` over SSH can fail while traversing workspace links with `untrusted mount point` errors, observed on 2026-05-23 at `backend/ipc-bridge/node_modules/@vibetech/shared-ipc/package.json`. Prefer a local desktop shell for install/final release validation; use SSH for focused Nx checks that do not need package-link traversal.

## Canonical Commands

Install and inventory:

```powershell
pnpm install --frozen-lockfile
pnpm exec nx show projects
pnpm run workspace:inventory
```

CI-equivalent affected checks:

```powershell
pnpm run ci:sync
pnpm run ci:lint
pnpm run ci:typecheck
pnpm run ci:test
pnpm run ci:build
pnpm run ci:coverage
pnpm run ci:e2e
```

Broad local checks, used deliberately because this repo is large:

```powershell
pnpm run ci:lint:all
pnpm run typecheck:all
pnpm run test:all
pnpm run build:all
```

Workspace health and cleanup dry runs:

```powershell
pnpm run workspace:health
pnpm run workspace:cleanup:dry
pnpm run cleanup:pnpm:dry
```

## Project Tiers

Primary/high-priority apps:

- `vibe-tutor`
- `vibe-code-studio`
- `nova-agent`
- `nova-mobile-app`
- `vibetech-command-center`
- `memory-mcp`

Maintained product and service apps:

- `shipping-pwa`
- `invoice-automation-saas`
- `business-booking-platform-next`
- `vibe-tech-lovable`
- `chessmaster-academy`
- `vibeblox`
- `vibe-justice`
- `serenity-flow`
- `agent-engine`
- `mcp-gateway`
- `mcp-rag-server`
- `workspace-mcp-server`
- `cross-agent-reflection`
- `prompt-engineer`
- `desktop-commander-v3`

Core shared/runtime packages:

- `packages/shared-config`
- `packages/shared-utils`
- `packages/shared-ipc`
- `packages/shared`
- `packages/types`
- `packages/hooks`
- `packages/ui`
- `packages/logger`
- `packages/backend`
- `packages/service-common`
- `packages/testing-utils`

Domain/platform packages:

- `packages/nova-types`
- `packages/nova-database`
- `packages/db-app`
- `packages/memory`
- `packages/openclaw-bridge`
- `packages/openrouter-client`
- `packages/inngest-client`
- `packages/agent-lats`
- `packages/mcp-core`
- `packages/mcp-testing`
- `packages/vcs-theme`
- `packages/games`
- `packages/avatars`

Commercial/factory support packages:

- `packages/analytics`
- `packages/auth`
- `packages/billing`
- `packages/email`
- `packages/emails`
- `packages/entitlements`
- `packages/feature-flags`
- `packages/landing`
- `packages/monetization`
- `packages/payments`
- `packages/ai`

Factory or smoke fixtures. Keep only if they intentionally protect generator/regression behavior:

- `_-factory-runtime-smoke`
- `factory-landing-smoke`
- `factory-saas-smoke`
- `factory-tauri-smoke`
- `test-factory-app`

Generated SaaS/demo candidates that need product-owner classification before strict enforcement:

- `appointment-reminder-saas`
- `prior-auth-pro`
- `proposal-review-saas`
- `vibe-tech-marketing`

Cleanup/parking candidates:

- `apps/ide-bridge`: no `package.json` or `project.json`; appears to contain build artifact-style output.
- `apps/mcp-skills-server`: has `DEPRECATED.md` indicating it was merged into a unified MCP server and should be removed later.
- `apps/gravity-claw`: real app scripts, but `pnpm-workspace.yaml` excludes it and workspace metadata calls it local-only WIP. Treat separately from normal monorepo gates.

## Current Blockers And Risks

- `apps/gravity-claw/src-tauri/updater.key` is tracked inside the `gravity-claw` submodule. If it was ever used for updater signing, treat it as compromised signing material: rotate, remove from git, add ignore coverage, and consider history cleanup before shipping updater flows.
- Root CI called `pnpm run ci:e2e` while the root package lacked that script. The baseline fix is a root `ci:e2e` script that delegates to Nx affected non-atomized `e2e` targets. Avoid local `e2e-ci` here unless Nx Agents are enabled; Nx marks the atomized Playwright CI targets as Agents-only.
- Generated/factory apps should not be allowed to dominate monorepo quality work unless they are deliberate regression fixtures.
- Large ignored/generated directories should be cleaned only after active work is protected.
- Nx Cloud currently warns that the organization has exceeded the free plan. Local checks still run with `NX_NO_CLOUD`/local cache settings where configured, but release CI should not depend on Nx Cloud until billing/status is resolved.

## Verified On 2026-05-22

- `pnpm --version` over SSH: `10.33.0`.
- `node --version` over SSH: `v22.22.2`.
- `pnpm exec nx show projects`: 93 projects.
- `pnpm run ci:sync`: passed with no blocking synchronization issues and no root CI script issues.
- `pnpm exec nx affected -t e2e --base=HEAD --head=HEAD --parallel=1 --outputStyle=static`: ran no tasks successfully; emitted the current Nx Cloud disabled/free-plan warning.

## Recommended Next Pass

1. Run `pnpm install --frozen-lockfile` on the desktop.
2. Capture `pnpm exec nx show projects` into `tmp/nx-projects.txt`.
3. Run affected lint/typecheck/test/build and summarize failures by project.
4. Decide which factory/generated apps are fixtures, archived projects, or cleanup candidates.
5. Handle the `gravity-claw` updater key as a separate security/remediation task.
6. Decide whether to disable Nx Cloud fully for local/CI reliability or resolve the Nx Cloud organization plan warni