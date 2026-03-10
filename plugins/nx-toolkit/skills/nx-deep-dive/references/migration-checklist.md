# Nx Major Version Migration Checklist

## Pre-Migration

- [ ] Create D:\ snapshot: `.\Save-Snapshot.ps1 -Description "Before Nx migration" -Tag "pre-nx-upgrade"`
- [ ] Create feature branch: `git checkout -b chore/nx-upgrade`
- [ ] Document current Nx version: `pnpm nx --version`
- [ ] Check current plugin versions: `pnpm list @nx/js @nx/eslint @nx/vite @nx/react`
- [ ] Review Nx changelog for target version
- [ ] Verify Node.js version meets new requirements
- [ ] Verify pnpm version compatibility
- [ ] Run full quality check as baseline: `pnpm run quality`
- [ ] Note current cache hit rate for comparison

## Migration Execution

### Step 1: Generate Migrations

```bash
pnpm nx migrate @nx/workspace@<target-version>
```

This creates `migrations.json` with automated migration scripts.

### Step 2: Review migrations.json

Read every migration entry. Check for:
- Breaking changes to `nx.json` schema
- Plugin API changes
- Generator template changes
- Config file renames or restructures
- Deprecated options being removed

### Step 3: Update Dependencies

```bash
pnpm install
```

Resolve any peer dependency conflicts. Common issues:
- `@nx/*` packages must all be the same version
- TypeScript version requirements may change
- ESLint config format may need updating

### Step 4: Run Migrations

```bash
pnpm nx migrate --run-migrations
```

### Step 5: Clean Up

```bash
rm migrations.json
pnpm nx reset  # Clear cache (required after major upgrade)
```

## Post-Migration Validation

### Critical Checks

- [ ] `pnpm nx --version` shows new version
- [ ] `pnpm nx show projects` lists all projects
- [ ] `pnpm nx graph` renders without errors
- [ ] `pnpm run quality` passes (lint + typecheck + build)
- [ ] `pnpm nx affected -t test` runs successfully
- [ ] Cache is working: run same command twice, second should be cached

### Per-Project Checks

For each critical project:
- [ ] `pnpm nx build <project>` succeeds
- [ ] `pnpm nx test <project>` passes
- [ ] `pnpm nx lint <project>` clean
- [ ] Dev server starts: `pnpm nx dev <project>`

### Regression Checks

- [ ] No new TypeScript errors
- [ ] No new lint warnings
- [ ] Build output sizes are similar (no unexpected bloat)
- [ ] Dev server hot reload works
- [ ] E2E tests pass (if applicable)

## Rollback Plan

If migration fails:

```bash
# Option 1: Git restore
git checkout main
pnpm install
pnpm nx reset

# Option 2: D:\ snapshot restore
cd C:\dev\scripts\version-control
.\Restore-Snapshot.ps1 -Tag "pre-nx-upgrade"
```

## Version-Specific Notes

### Nx 21 -> 22

Key changes to watch:
- `@nx/js` plugin configuration may change
- Task runner options restructured
- Cache directory format may change
- Project inference rules updated
- ESLint flat config becomes default

### Nx 22 -> 23 (Future)

Watch for:
- Potential Node.js minimum version bump
- Plugin API v3 changes
- New project graph algorithms
- Distributed execution improvements

## Troubleshooting Common Migration Issues

### "Cannot find module '@nx/...'"

```bash
pnpm install --force
pnpm nx reset
```

### "Project graph computation failed"

```bash
# Check for circular dependencies
pnpm nx graph

# Reset and rebuild
pnpm nx reset
rm -rf node_modules/.cache
pnpm install
```

### "Cache is stale after migration"

```bash
pnpm nx reset
rm -rf .nx/cache
```

### "Migrations.json has conflicts"

```bash
# Manual resolution
# Edit migrations.json to resolve conflicts
# Then run remaining migrations
pnpm nx migrate --run-migrations
```

### "Plugin version mismatch"

All `@nx/*` packages must be the same version:

```bash
# Check versions
pnpm list @nx/js @nx/eslint @nx/vite @nx/react @nx/workspace

# Fix mismatches
pnpm update @nx/js@<version> @nx/eslint@<version> @nx/vite@<version>
```
