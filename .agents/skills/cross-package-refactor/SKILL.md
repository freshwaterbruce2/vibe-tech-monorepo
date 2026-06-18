---
name: cross-package-refactor
description: Use for API or contract changes in shared packages that may cascade into multiple apps or packages in the VibeTech Nx workspace.
---

# Cross-Package Refactor

Use this skill when changing a shared package API, billing or monetization contract, generated SaaS template, or workspace-wide type surface.

## Preflight

1. Read `AGENTS.md`, `.agent/agents/master-agent.md`, and project-local `AGENTS.md` files for every touched app/package.
2. Use `nx-workspace` first, then query affected projects with Nx instead of manual guessing.
3. Search before creating files or duplicate services:
   - `rg --files`
   - `rg "<symbol-or-route-name>"`
   - `pnpm exec nx show projects --json`
4. If the change is complex, create or update the file-backed plan in `~/.gemini/antigravity/scratch/planning/`.

## Parallel Execution Pattern

Split work by ownership boundary, not by file count:

- shared package contract and tests
- generated template or plugin output
- each downstream app family
- final verification and affected Nx gates

Use Antigravity `/goal` or the repo `orchestrate` workflow when the work spans independent folders. Each subagent must report:

- files touched
- contract assumptions
- validation command run
- unresolved blockers

## Validation

Prefer the narrowest Nx command first:

```powershell
Set-Location -LiteralPath 'V:\monorepo'
pnpm exec nx graph --print
pnpm nx affected -t lint typecheck test build
```

When a specific project is known, use:

```powershell
Set-Location -LiteralPath 'V:\monorepo'
pnpm nx test <project>
pnpm nx build <project>
```

Do not report completion from build output alone when a runtime or checkout flow is the acceptance gate.
