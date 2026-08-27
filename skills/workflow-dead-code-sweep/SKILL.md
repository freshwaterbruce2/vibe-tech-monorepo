---
name: workflow-dead-code-sweep
description: Dead code elimination workflow - audit-first approach with 41 successful executions (grep zero-import check -> git rm bulk delete -> typecheck verify -> commit separately)
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_system_workflow_analysis
  success_rate: 1.0
  category: devops
  source_pattern: dead-code-sweep-session-start
  executions_analyzed: 41
---

# Dead Code Sweep Workflow

**Auto-generated from 41 successful workflow executions with 100% success rate**

## Overview

This skill captures the proven dead code elimination workflow used in the VibeTech monorepo. The key insight from 41 executions: **always audit first, never fix dead code before sweeping it.**

The workflow follows a strict sequence: grep for zero-import files → bulk delete with git rm → typecheck verify → commit separately.

## Core Capabilities

### 1. Audit Phase - Find Dead Code
```bash
# Find files with zero imports (no other files import them)
search_files target=content pattern="export.*" file_glob="*.ts" | \
  # Cross-reference with import statements
  search_files target=content pattern="from.*<candidate>" file_glob="*.ts"

# Or use pnpm nx to trace dependencies:
pnpm nx graph --focus=<candidate> --depth=0
```

### 2. Bulk Delete Phase
```bash
# Delete multiple files at once with git rm (preserves history)
git rm path/to/dead-file1.ts path/to/dead-file2.ts ...

# For entire directories:
git rm -r path/to/dead-folder/
```

### 3. Verification Phase
```bash
# Typecheck to ensure no broken imports
pnpm typecheck

# Run affected tests
pnpm test --affected

# Build to verify
pnpm build
```

### 4. Commit Phase
```bash
# Commit deletion separately from any fixes
git commit -m "chore: remove dead code - <description>

- Removed unused files: file1.ts, file2.ts
- Verified: typecheck passes, tests pass
- No functionality affected"
```

## Usage Examples

### Example 1: Complete dead code sweep
```bash
# Step 1: Audit - find candidates
pnpm nx graph --file=dependency-graph.json
# Analyze for zero-import nodes

# Step 2: Bulk delete (example)
git rm apps/legacy/dashboards/*.tsx packages/old-utils/src/*.ts

# Step 3: Verify
pnpm typecheck
pnpm test --affected

# Step 4: Commit
git commit -m "chore: remove legacy dashboard components (dead code sweep)"
```

### Example 2: Single package cleanup
```bash
# Find unused exports in a package
cd packages/my-package
# Use ts-prune or similar
npx ts-prune

# Delete confirmed dead code
git rm src/unused-export.ts

# Verify
pnpm typecheck --filter=my-package
pnpm test --filter=my-package

# Commit
git commit -m "chore(my-package): remove unused export"
```

## Integration with Monorepo

- **Monorepo Root**: `V:/monorepo`
- **Tool**: Nx for dependency graph analysis
- **Git**: Required for `git rm` to preserve history
- **TypeScript**: Typecheck catches broken references
- **Package Manager**: pnpm for scoped commands

## Safety Measures

1. **Audit First**: Never delete without confirming zero imports
2. **Git RM**: Use `git rm` not `rm` - preserves history and stages deletion
3. **Typecheck Verify**: Always run typecheck after deletions
4. **Separate Commits**: Delete in one commit, fix any fallout in another
5. **Test Affected**: Run `pnpm test --affected` to catch regressions

## Rules Enforcement

- ✅ ALWAYS audit with dependency graph first
- ✅ Use `git rm` for deletion
- ✅ Run typecheck before committing
- ✅ Commit deletions separately
- ❌ NEVER fix dead code before sweeping it
- ❌ NEVER use `rm` directly (losing git history)
- ❌ NEVER delete and fix in same commit

## Related Skills

- `bash-command-patterns` - Safe bash operations
- `file-read-patterns` - Reading dependency graphs
- `software-development-practices` - Core development practices
- `dev-practices` - TDD, planning, spike experiments

## Generation Metadata

- **Source**: Learning system task_patterns table
- **Pattern**: dead-code-sweep-session-start
- **Total Executions**: 41
- **Success Rate**: 100%
- **Recommended Approach**: "audit first: grep zero-import check -> git rm bulk delete -> typecheck verify -> commit separately. Never fix dead code before sweeping it."
- **Last Analyzed**: 2026-06-18
- **Confidence**: 0.90