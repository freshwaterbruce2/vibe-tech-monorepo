---
name: upgrade
description: Orchestrated dependency upgrade with breaking change detection and migration plan
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - WebSearch
  - WebFetch
  - AskUserQuestion
argument-hint: "<package-name> [--to <version>] [--dry-run]"
---

# Upgrade Orchestrator

Plan and execute a coordinated dependency upgrade across the monorepo. Handles breaking change detection, migration planning, and staged rollout.

## Execution Steps

### 1. Parse Arguments

Extract:
- `package-name` (required) - Package to upgrade (e.g., `react`, `@nx/js`, `typescript`)
- `--to <version>` (optional) - Target version (default: latest stable)
- `--dry-run` (optional) - Plan only, don't modify files

### 2. Current State Assessment

Find current usage across workspace:

```bash
# Find all versions in use
grep -rn "\"<package-name>\":" /c/dev/apps/*/package.json /c/dev/packages/*/package.json /c/dev/backend/*/package.json /c/dev/package.json 2>/dev/null | grep -v node_modules
```

Report:
- Current version(s) in use
- Number of projects using this package
- Whether versions are aligned or mismatched

### 3. Research Target Version

Use WebSearch to find:
- Latest stable version of the package
- Changelog / release notes for versions between current and target
- Known breaking changes
- Migration guides (if available)
- Compatibility with other workspace dependencies

Search queries:
- `"<package-name>" changelog <target-version>`
- `"<package-name>" migration guide <current> to <target>`
- `"<package-name>" breaking changes <target-version>`

### 4. Breaking Change Analysis

Identify potential breaking changes:

1. **API changes** - Removed/renamed exports, changed signatures
2. **Config changes** - New required fields, removed options
3. **Peer dependency changes** - New requirements, version bumps
4. **Build changes** - New build requirements, output format changes
5. **Runtime changes** - Behavior differences, removed features

Present findings clearly:

```
Breaking Change Analysis: react 19.1.0 → 19.2.0
=================================================

BREAKING CHANGES:
  1. [HIGH] useEffect cleanup timing changed (see migration guide)
  2. [MEDIUM] Removed legacy context API support
  3. [LOW] Console warnings for deprecated patterns

PEER DEPENDENCY CHANGES:
  - react-dom: must also be upgraded to 19.2.0
  - @types/react: must be upgraded to >=19.2.0

COMPATIBLE:
  - next: 15.x compatible
  - vite: no changes needed
  - eslint-plugin-react: compatible
```

### 5. Generate Migration Plan

Create a step-by-step upgrade plan:

```
Migration Plan: react 19.1.0 → 19.2.0
=======================================

Phase 1: Preparation
  [ ] Create D:\ snapshot: Save-Snapshot.ps1 -Description "Before react upgrade"
  [ ] Create feature branch: git checkout -b chore/upgrade-react-19.2

Phase 2: Root Update
  [ ] Update root package.json: react@19.2.0, react-dom@19.2.0
  [ ] Update @types/react, @types/react-dom
  [ ] Run: pnpm install

Phase 3: Per-Project Updates (8 projects)
  [ ] apps/nova-agent/package.json
  [ ] apps/vibe-code-studio/package.json
  [ ] apps/vibe-tutor/package.json
  [ ] apps/iconforge/package.json
  [ ] apps/business-booking-platform/package.json
  [ ] apps/shipping-pwa/package.json
  [ ] apps/vibe-tech-lovable/package.json
  [ ] packages/shared-components/package.json

Phase 4: Code Fixes
  [ ] Fix useEffect cleanup patterns (search: useEffect.*return)
  [ ] Remove legacy context API usage (search: contextType)

Phase 5: Validation
  [ ] pnpm nx reset (clear cache)
  [ ] pnpm run quality (lint + typecheck + build)
  [ ] pnpm nx affected -t test
  [ ] Manual testing of critical apps

Phase 6: Completion
  [ ] Commit: git commit -m "chore: upgrade react to 19.2.0"
  [ ] Merge to main (follow incremental merge strategy)
```

### 6. Execute (if not --dry-run)

Ask the user for confirmation before proceeding:

"I've prepared the migration plan above. Would you like me to execute it now, or save it as a reference?"

If approved:

1. Update `package.json` files using Edit tool
2. Run `pnpm install`
3. Run `pnpm nx reset` to clear cache
4. Run quality checks
5. Report results

### 7. Nx-Specific Upgrades

For `@nx/*` packages, use the Nx migration system:

```bash
# Generate migrations
pnpm nx migrate @nx/workspace@<target-version>

# Review migrations.json
cat migrations.json

# Run migrations
pnpm nx migrate --run-migrations

# Clean up
rm migrations.json
```

All `@nx/*` packages must be upgraded together to the same version.

## Special Cases

### TypeScript Upgrades

- Check `tsconfig.base.json` for deprecated compiler options
- Verify all project `tsconfig.json` files are compatible
- Run typecheck across all projects: `pnpm nx run-many -t typecheck --all`
- Check for stricter type checking in new version

### React Major Upgrades

- Check for deprecated lifecycle methods
- Verify third-party component library compatibility
- Test SSR/hydration if applicable
- Check React DevTools compatibility

### Vite Upgrades

- Check plugin compatibility (vite-plugin-*)
- Verify config format hasn't changed
- Test dev server and build output
- Check for changed default behaviors

## Tips

- Always create a D:\ snapshot before major upgrades
- Upgrade one major dependency at a time
- Use `--dry-run` first to understand the scope
- Check compatibility with other critical deps before upgrading
- For Nx packages, always use `nx migrate` instead of manual updates
