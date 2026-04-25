<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

## Local + GitHub Workflow Rule

- Treat the local working tree as the primary source of truth.
- Prefer local workflows and local validation commands first.
- Prefer GitHub workflows/remotes when repository hosting is relevant.

## Workspace Snapshot

- Repository root: `C:\dev`.
- Repository host: GitHub, `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git`.
- Package manager: `pnpm@10.33.0` only.
- Node: `>=22.0.0`; current local toolchain is Node 22.x.
- Build system: `nx@22.5.0` with apps in `apps/` and libraries in `packages/`.
- Primary languages: TypeScript, JavaScript, Python, Rust, and React.
- Shared runtime data, logs, databases, and learning artifacts live on `D:\`, not under `C:\dev`.

Canonical workspace references:

- `AI.md` - workspace rules and path policy.
- `WORKSPACE.json` - current stack, project registry, and focus areas.
- `docs/WORKSPACE_STRUCTURE.md` - source vs local-only storage policy.
- `docs/ai/RULES.md` - detailed development and agent rules.

## Current Layout

- `apps/` - product apps, desktop apps, mobile apps, MCP servers, and infrastructure services.
- `backend/` - backend services and service-specific packages.
- `packages/` - shared libraries, UI, config, memory, MCP utilities, and feature flags.
- `scripts/` - reusable Windows and workspace maintenance scripts.
- `tests/` - cross-workspace tests and agent evaluation suites.
- `tools/` - local automation and maintenance tools.

Do not treat nested app folders as separate git repos unless their own git root is
verified. The root working tree is the default source of truth.

## Common Commands

Run commands from `C:\dev` unless a project-specific document says otherwise.

```powershell
pnpm install
pnpm exec nx show projects
pnpm nx graph
pnpm nx dev <project>
pnpm nx build <project>
pnpm nx lint <project>
pnpm nx test <project>
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run quality:affected
pnpm run workspace:health
pnpm run paths:check
pnpm run learning:validate
```

The root `pnpm run build` script intentionally fails. Use `pnpm nx build <project>`
or a project-specific build command instead.

If PowerShell cannot launch `node`, `pnpm`, `git`, `cmd.exe`, or `whoami.exe`, repair the process environment first:

```powershell
. .\scripts\Initialize-DevProcessEnvironment.ps1
Initialize-DevProcessEnvironment
```

## Development Rules

- Search before creating files, services, components, routes, scripts, or docs.
- Prefer modifying the existing implementation over adding a parallel duplicate.
- Use `git ls-files`, `rg`, `Get-ChildItem`, or `Select-String` to find existing patterns before editing.
- Do not install new dependencies without discussion.
- Keep changes scoped to the requested project and its direct shared dependencies.
- Preserve backwards compatibility unless the user explicitly asks for a breaking change.
- Use TypeScript types for TypeScript code and keep strict-mode assumptions intact.
- Prefer async/await over raw promise chains.
- Follow project-local patterns before introducing new abstractions.
- Add or update tests when behavior changes.
- Use `apply_patch` for manual edits.

## No Duplicates Rule

Before creating anything new:

1. Search for similar files and functionality.
2. Read the existing implementation when a similar match exists.
3. Modify existing code when it already owns the behavior.
4. Create a new file only when the feature is truly new or the user confirms that a separate implementation is wanted.

This applies to source files, tests, docs, scripts, services, handlers, components, functions, and configuration.

## Validation Guidance

- Prefer Nx targets over direct tool commands for build, lint, test, typecheck, and e2e work.
- For changed projects, prefer narrow validation first: `pnpm nx <target> <project>`.
- For repo-level confidence, use `pnpm run quality:affected` before broad all-project runs.
- For Python-only `apps/crypto-enhanced`, use that app's maintained runner instead of raw host `pytest` when available.
- If validation is blocked by local toolchain state, record the exact command and error rather than reporting success.

## Learning System

Current learning-system sources of truth:

- Active learning database: `D:\databases\agent_learning.db`.
- Canonical database inventory: `D:\databases\DB_INVENTORY.md`.
- Learning-system guide: `D:\learning-system\enhanced_agent_guidelines.md`.
- Learning-system workspace: `D:\learning-system`.

Before changing repair, maintenance, database, memory, or hook flows:

- Validate the current path against `D:\databases\DB_INVENTORY.md`.
- Do not recreate retired databases to satisfy stale scripts.
- Prefer updating existing maintenance scripts under `C:\dev\scripts`.
- Treat `D:\learning-system` as local code/docs/artifact state, not as the home of live runtime databases.

## Safety Protocols

MoltBot and crypto operations are observation-only unless the user gives explicit,
task-specific authorization for non-trading maintenance. Never execute buy, sell,
or trade actions.

When monitoring Gmail or hook-driven notifications, enforce a 5-minute deduplication
window and avoid repeated identical alerts.

Retention defaults:

- Config backups: 14 days.
- Memory snapshots: 30 days.

## Documentation Maintenance

When project reality changes, update this file together with the relevant source of truth:

- Stack, commands, and project registry: `WORKSPACE.json` and `package.json`.
- Path and storage policy: `AI.md` and `docs/WORKSPACE_STRUCTURE.md`.
- Database ownership: `D:\databases\DB_INVENTORY.md`.
- Learning-system workflow: `D:\learning-system\enhanced_agent_guidelines.md`.
