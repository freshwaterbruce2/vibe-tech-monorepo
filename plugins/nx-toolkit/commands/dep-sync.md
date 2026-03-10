---
name: dep-sync
description: Find and fix dependency version mismatches across all workspace packages
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
argument-hint: "[--fix] [--package <name>]"
---

# Dependency Sync

Scan all workspace `package.json` files for dependency version mismatches and optionally auto-fix them.

## Execution Steps

### 1. Collect All Dependencies

Read every `package.json` in the workspace (excluding `node_modules`):

```bash
find /c/dev/apps /c/dev/packages /c/dev/backend -name "package.json" -not -path "*/node_modules/*" -not -path "*/.nx/*" -not -path "*/dist/*"
```

For each file, extract all `dependencies`, `devDependencies`, and `peerDependencies`.

### 2. Build Version Map

Create a map of `packageName → { version, location[] }` across the workspace. Group by:
- **Aligned**: Same version everywhere (good)
- **Mismatched**: Different versions in different projects (needs attention)
- **Workspace protocol**: Using `workspace:*` for internal packages (good)

### 3. Report Findings

Present a clear table:

```
Dependency Version Report
=========================

CRITICAL MISMATCHES (must fix):
  react: 19.0.0 (apps/nova-agent) vs 19.1.0 (apps/vibe-tutor)
  typescript: 5.8.2 (root) vs 5.9.3 (apps/vibe-code-studio)

WARNINGS (review recommended):
  @types/node: 22.0.0 (3 projects) vs 22.1.0 (2 projects)

ALIGNED (no action needed): 47 packages
WORKSPACE PROTOCOL: 12 internal references using workspace:*

NON-WORKSPACE INTERNAL DEPS (should use workspace:*):
  @vibetech/shared-utils: "^1.0.0" in apps/nova-agent (should be "workspace:*")
```

### 4. Critical Packages

Always flag mismatches in these packages as CRITICAL:
- `react`, `react-dom` - Runtime conflicts
- `typescript` - Type system consistency
- `vite` - Build tool alignment
- `eslint` - Linting rule compatibility
- `tailwindcss` - Style consistency
- Any `@nx/*` package - Nx version alignment

### 5. Auto-Fix (if --fix flag)

If the user passed `--fix` or confirms they want fixes:

1. For each mismatch, determine the correct version:
   - Use the **highest** semver version found
   - Prefer the root `package.json` version as source of truth
   - For `@nx/*` packages, all must match exactly

2. Update each `package.json` with the correct version using the Edit tool

3. After fixes, remind the user to run:
   ```bash
   pnpm install
   pnpm nx reset
   ```

### 6. Single Package Mode

If `--package <name>` is provided, only check that specific package across the workspace.

## Output Format

End with a summary:
```
Summary: X mismatches found across Y projects
  - Z critical (must fix)
  - W warnings (review)
  - V using non-workspace protocol (should fix)
```

## Tips

- Run this command before major dependency upgrades
- Critical mismatches can cause subtle runtime bugs
- Internal packages should always use `workspace:*` protocol
- After fixing, always run `pnpm install` to update the lockfile
