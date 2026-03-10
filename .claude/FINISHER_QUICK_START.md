# The Finisher v2.0 - Quick Start Guide

**For:** Starting a new project completion session
**Methodology:** See `.claude/FINISHER_METHODOLOGY.md` for complete details

---

## Pre-Flight Checklist

```markdown
- [ ] Read project CLAUDE.md
- [ ] Create FINISHER_STATE.md in project root
- [ ] Run initial error assessment
- [ ] Classify errors by priority (use script if 10+ errors)
- [ ] Plan loop strategy (CRITICAL → HIGH → MEDIUM)
```

---

## Error Classification (NEW in v2.0)

### Automated Tool

For projects with 10+ errors, use the automated classifier:

```powershell
# Run from monorepo root
powershell -File .claude/scripts/Classify-Errors.ps1 -ProjectPath "apps/your-project"
```

**Output shows:**

- Priority 1 (CRITICAL): Blocks build - **fix first**
- Priority 2 (HIGH): Code quality - **fix second**
- Priority 3 (MEDIUM): Style/warnings - **fix last (optional)**

### When to Use

✅ **Use classifier for:**

- 10+ errors (recommended)
- 50+ errors (mandatory)
- Mixed error types
- Unsure of fix order

❌ **Skip classifier for:**

- <10 errors (just fix all)
- Single error type (e.g., all React.FC)
- Already know priority order

---

## Commands Reference

### Nx Workspace Projects

```bash
# Initial assessment
pnpm nx lint <project>
pnpm nx typecheck <project>

# Incremental verification (after each batch)
pnpm nx affected:typecheck
pnpm nx affected:lint

# Test validation (after code fixes)
pnpm nx affected:test --parallel=2

# Build and package
pnpm nx build <project>
pnpm nx tauri:build <project>  # Desktop apps
```

### Non-Nx Projects

```bash
# Initial assessment
npm run lint
npm run typecheck

# Incremental verification
npm run typecheck
npm run lint

# Test validation
npm run test

# Build and package
npm run build
npm run tauri build  # Desktop apps
```

---

## Batch Processing Template

````markdown
### Batch N (2-3 files)

**Files to fix:**

- File 1: [path]
- File 2: [path]

**Changes:**

- File 1: [specific changes]
- File 2: [specific changes]

**Incremental Verification:**

```bash
pnpm nx affected:typecheck
pnpm nx affected:lint
```
````

- TypeCheck: [PASS/FAIL]
- Lint: [PASS/FAIL]

**Cascading Issues:**

- [None/List any new errors that appeared]
- [How they were fixed]

**Status:** [✅ Complete / ⚠️ Needs Rework]

````

---

## Error Priority Quick Reference

### Priority 1: CRITICAL (Fix First)
- TypeScript compilation errors
- Missing dependencies
- Build configuration errors
- Import/export errors
- Syntax errors

### Priority 2: HIGH (Fix Second)
- React.FC anti-patterns
- React.* namespace types
- Unused imports/variables
- Type safety issues
- Dead code

### Priority 3: MEDIUM (Fix Last)
- ESLint warnings
- Console.log statements
- Formatting issues
- Documentation gaps

---

## React 19 Quick Fixes

```tsx
// React.FC → Typed props
// BEFORE
const Component: React.FC<Props> = ({ prop }) => {};
// AFTER
const Component = ({ prop }: Props) => {};

// React.* event types → Named imports
// BEFORE
const handler = (e: React.MouseEvent) => {};
// AFTER
import type { MouseEvent } from 'react';
const handler = (e: MouseEvent) => {};

// Unused React import → Named imports only
// BEFORE
import React, { useState } from 'react';
// AFTER
import { useState } from 'react';
````

---

## Success Criteria

- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 errors (warnings OK)
- ✅ Tests: PASSING
- ✅ Build: PASSING
- ✅ Installers: Created (desktop apps)
- ✅ Grade: A or A+

---

## State Tracking Template

Copy this to create `FINISHER_STATE.md`:

````markdown
# THE FINISHER - [Project Name]

## Project Overview

- **Name**: [Project]
- **Type**: [Web/Desktop/Mobile]
- **Tech Stack**: [React 19, TypeScript 5.9, etc.]
- **Start Time**: [Date]

## Mission

Apply Finisher v2.0 methodology to achieve production-ready status.

## Initial Analysis

### Error Classification

**Priority 1 (CRITICAL):** [Count]
**Priority 2 (HIGH):** [Count]
**Priority 3 (MEDIUM):** [Count]

### Loop Plan

- Loop 1: [Error type] - [X files]
- Loop 2: [Error type] - [Y files]

## Loop 1: [Error Type]

[Use batch template for each batch]

## Test Validation

### Test Execution

```bash
pnpm nx affected:test --parallel=2
```
````

- Tests Passed: X/Y
- Status: [PASS/FAIL]

## Build & Package

### Quality Checks

- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 errors
- ✅ Build: PASSING

### Installers

- [List created installers]

## 🎯 FINAL STATUS

- Code Grade: [A+/A/B]

````

---

## Troubleshooting

### "Incremental verification failing after fix"

**Cause:** Cascading issues from type changes
**Fix:**
1. Analyze new errors
2. Update dependent files
3. Re-run verification
4. Mark batch complete only when clean

### "Tests failing after code changes"

**Cause:** Regression or outdated test expectations
**Fix:**
1. Analyze failure message
2. Determine if code or test needs update
3. Apply fix
4. Re-run tests
5. Document in FINISHER_STATE.md

### "Build succeeds but installers fail"

**Cause:** Version mismatch (common with Tauri)
**Fix:**
1. Check Cargo.toml versions match package.json
2. Run `cargo update <plugin-name>`
3. Retry build

---

## Next Steps After Completion

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: complete [project] to production-ready state"
````

1. **Test installers:**
   - Install on clean machine
   - Verify functionality
   - Document any issues

2. **Update documentation:**
   - Mark project as production-ready
   - Document known limitations
   - Update README if needed

3. **Ask user:** "Which project should I finish next?"

---

**Full Methodology:** `.claude/FINISHER_METHODOLOGY.md`
**Last Updated:** 2026-01-15
