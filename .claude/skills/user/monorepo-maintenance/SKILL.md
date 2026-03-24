---
name: monorepo-maintenance
description: Weekly maintenance workflow for keeping the @vibetech/workspace monorepo and external projects up to date with 2025/2026 best practices. Use when updating dependencies, aligning configs (tsconfig, eslint, nx), migrating to new framework APIs, or auditing consistency across 26 apps and 24 packages. Triggers on requests like "weekly maintenance", "update dependencies", "align configs", "check what's outdated", or "monorepo health check". Covers React 19, TypeScript 5.9, pnpm workspaces, Nx orchestration, MCP servers, agents, and plugins.
---

# Monorepo Maintenance

Weekly interactive workflow: Claude proposes updates, user approves, Claude executes.

## Locations

- **Monorepo**: `C:\dev`
- **External projects**: `C:\Users\fresh_zxae3v6`

## Weekly Workflow

### Phase 1: Audit

1. Run dependency audit across all projects
2. Compare configs against baselines (tsconfig, eslint, nx, prettier)
3. Check for framework/library updates with breaking changes
4. Identify drift between similar app types

Search web for recent releases of core dependencies (React, TypeScript, Nx, pnpm) to catch new best practices.

### Phase 2: Propose

Present findings in this format:

```
## Maintenance Report - [Date]

### 🔴 Critical (security/breaking)
- [item]: [current] → [recommended] | [risk level]

### 🟡 Recommended Updates
- [item]: [current] → [recommended] | [benefit]

### 🟢 Optional/Minor
- [item]: [current] → [recommended]

### ⚙️ Config Alignment Issues
- [file] in [app]: [issue] | [baseline reference]

### 📋 Proposed Actions
1. [action] - [scope] - [estimated impact]
2. ...

Approve all? Or specify which items to proceed with.
```

### Phase 3: Execute

After user approval:

1. Create backup note of current state
2. Execute approved changes
3. Run `pnpm install` if dependencies changed
4. Run `nx affected:build` to verify no breaks
5. Report completion with summary of changes made

## Reference Files

Load these based on context:

| File                             | When to load                                 |
| -------------------------------- | -------------------------------------------- |
| `references/conventions.md`      | Always - core patterns                       |
| `references/config-baselines.md` | When auditing/aligning configs               |
| `references/tracked-projects.md` | When scanning project locations              |
| `references/desktop-apps.md`     | When working on desktop apps                 |
| `references/mobile-apps.md`      | When working on mobile apps                  |
| `references/web-apps.md`         | When working on web apps                     |
| `references/ai-systems.md`       | When working on agents, MCP servers, plugins |

## Config Alignment Rules

Base configs live in monorepo root. Apps extend them:

- `tsconfig.base.json` → app's `tsconfig.json` extends
- `.eslintrc.base.json` → app's config extends
- `nx.json` → shared target defaults

Legitimate differences allowed for:

- App-specific paths, entry points
- Platform-specific compiler options (node vs browser)
- Feature flags unique to an app

Flag for review: unexplained deviations from baseline.

## Dependency Update Strategy

**Safe auto-update** (patch versions): testing libraries, dev tools, linters
**Propose with context** (minor versions): framework packages, UI libraries
**Require explicit approval** (major versions): anything with breaking changes

Cross-check with:

- Nx compatibility matrix for nx/angular/react versions
- TypeScript compatibility with React types
- pnpm workspace protocol versions

## File Limits

Per project conventions: 360-line max per file. During maintenance, if any touched file exceeds this, flag it for refactoring.
