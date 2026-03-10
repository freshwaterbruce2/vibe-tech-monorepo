# Error Prioritization - Practical Example

**Scenario:** nova-agent project with 49 errors (complex multi-error project)
**Status:** Hypothetical - showing how v2.0 prioritization would work
**Date:** 2026-01-15

---

## Step 1: Run Automated Classifier

```powershell
# From C:\dev
powershell -File .claude/scripts/Classify-Errors.ps1 -ProjectPath "apps/nova-agent"
```

### Classifier Output

```markdown
═══════════════════════════════════════
The Finisher v2.0 - Error Classifier
═══════════════════════════════════════

🔍 Analyzing errors in: C:\dev\apps\nova-agent

Running TypeScript check...
Running ESLint check...

📊 Classifying 49 errors...

## Error Classification Summary

**Total Errors:** 49

### Priority 1: CRITICAL (Fix First)

**Count:** 7
**Impact:** Blocks build, causes runtime failures

**Sample Errors:**

- error TS2307: Cannot find module './components/missing'
- error TS2322: Type 'string' is not assignable to type 'number' in config.ts
- error TS2304: Cannot find name 'process' in env.ts
- error TS18046: 'window' is possibly 'undefined' in main.ts
- error TS2339: Property 'api' does not exist on type 'Window'
- ... and 2 more

### Priority 2: HIGH (Fix Second)

**Count:** 37
**Impact:** Code quality, maintainability issues

**Sample Errors:**

- React.FC usage in App.tsx
- React.FC usage in Dashboard.tsx
- React.MouseEvent usage in Button.tsx
- React.ChangeEvent usage in Input.tsx
- React.FormEvent usage in Form.tsx
- ... and 32 more

### Priority 3: MEDIUM (Fix Last)

**Count:** 5
**Impact:** Style, warnings only

**Sample Errors:**

- react-hooks/exhaustive-deps warning in useEffect
- no-console warning in debug.ts
- Formatting inconsistency in utils.ts
- ... and 2 more

---

## Recommended Fix Order

1. **Fix CRITICAL errors first** (7 errors)
   - These block build and deployment
   - Highest impact on project completion

2. **Fix HIGH priority errors** (37 errors)
   - Code quality and maintainability
   - Prevents future bugs

3. **Fix MEDIUM priority errors** (5 errors)
   - Style and warnings
   - Can be deferred if time-constrained
```

---

## Step 2: Plan Loop Strategy

Based on classification, create a prioritized loop plan:

```markdown
## Loop Plan (Prioritized)

### Loop 1: CRITICAL Errors (7 errors)

**Target:** Fix all build blockers
**Files:**

- config.ts (type mismatch)
- env.ts (missing 'process')
- main.ts (undefined window)
- components/missing.ts (create or fix import)

**Expected Impact:** Enable successful build

### Loop 2: HIGH Errors - React.FC (12 files)

**Target:** Eliminate React.FC anti-pattern
**Files:**

- App.tsx
- Dashboard.tsx
- Settings.tsx
- [9 more components]

**Expected Impact:** Modern React 19 patterns

### Loop 3: HIGH Errors - React.\* Event Types (25 files)

**Target:** Convert to named type imports
**Files:**

- Button.tsx (React.MouseEvent)
- Input.tsx (React.ChangeEvent)
- Form.tsx (React.FormEvent)
- [22 more components]

**Expected Impact:** Cleaner imports, better types

### Loop 4: MEDIUM Errors (5 errors) - OPTIONAL

**Target:** Fix warnings and style issues
**Action:** Auto-fix with ESLint --fix or defer
**Expected Impact:** Cleaner code (non-blocking)
```

---

## Step 3: Execute Prioritized Loops

### Loop 1 Execution: CRITICAL Errors

````markdown
## Loop 1: CRITICAL Errors

### Batch 1 (2 files)

**Target:** config.ts, env.ts

**Files to fix:**

- config.ts: Fix type mismatch (string → number)
- env.ts: Add process type declaration

**Changes:**

- config.ts: Updated API_PORT type to number
- env.ts: Added `declare const process: NodeJS.Process`

**Incremental Verification:**

```bash
pnpm nx affected:typecheck
```
````

- TypeCheck: ✅ PASS
- Errors remaining: 5 (down from 7)

**Status:** ✅ Complete - 2 critical errors resolved

---

### Batch 2 (2 files)

**Target:** main.ts, components/missing.ts

**Files to fix:**

- main.ts: Add window type guard
- components/missing.ts: Fix broken import path

**Changes:**

- main.ts: Added `if (typeof window !== 'undefined')` guard
- components/missing.ts: Updated import path

**Incremental Verification:**

```bash
pnpm nx affected:typecheck
```

- TypeCheck: ✅ PASS
- Errors remaining: 0 CRITICAL!

**Status:** ✅ Complete - All CRITICAL errors resolved

---

### Loop 1 Results

- **Files Fixed:** 4/4 (100%)
- **CRITICAL errors eliminated:** 7/7
- **Build Status:** Now buildable! ✅
- **Time Saved:** Caught issues early, no full rebuild needed

````

---

### Loop 2 Execution: HIGH Errors (React.FC)

```markdown
## Loop 2: React.FC Elimination

### Strategy
- Fix in batches of 3-4 files (faster than 2)
- All same pattern (predictable)
- Low risk of cascading issues

### Batch 1 (4 files)
**Files:** App.tsx, Dashboard.tsx, Settings.tsx, Profile.tsx

**Incremental Verification:**
```bash
pnpm nx affected:typecheck
pnpm nx affected:lint
````

- TypeCheck: ✅ PASS
- Lint: ✅ PASS
- Cascading Issues: None

### Batch 2 (4 files)

[Repeat pattern]

### Batch 3 (4 files)

[Repeat pattern]

### Loop 2 Results

- **Files Fixed:** 12/12 (100%)
- **React.FC patterns eliminated:** 12
- **Remaining HIGH errors:** 25 (React.\* event types)

````

---

### Loop 3 Execution: HIGH Errors (React.* Event Types)

```markdown
## Loop 3: React.* Event Type Conversion

### Strategy
- Fix in batches of 4-5 files (all same pattern)
- Group by event type for efficiency
  - MouseEvent batch: 8 files
  - ChangeEvent batch: 10 files
  - FormEvent batch: 7 files

### Batch 1 (5 files) - MouseEvent
**Files:** Button.tsx, Link.tsx, Card.tsx, Modal.tsx, Dropdown.tsx

**Changes:**
- Import: `import type { MouseEvent } from 'react'`
- Replace: `React.MouseEvent` → `MouseEvent`

**Incremental Verification:**
```bash
pnpm nx affected:typecheck
pnpm nx affected:lint
````

- TypeCheck: ✅ PASS
- Lint: ✅ PASS

### [Continue for remaining batches...]

### Loop 3 Results

- **Files Fixed:** 25/25 (100%)
- **React.\* event types eliminated:** 25
- **Total HIGH errors resolved:** 37/37

````

---

## Step 4: Test Validation Phase

```markdown
## Test Validation

### Run Affected Tests
```bash
pnpm nx affected:test --parallel=2
````

### Results

- Tests Passed: 143/143 ✅
- Tests Failed: 0
- Coverage: 87% (maintained from 85%)
- Regressions: None detected

### Impact Analysis

- CRITICAL fixes: No test failures (good!)
- React.FC fixes: No test failures (good!)
- React.\* event fixes: No test failures (good!)

### Status

- ✅ All tests passing
- ✅ No breaking changes
- ✅ Safe to build

````

---

## Step 5: Build & Package

```markdown
## Build Phase

### Quality Checks
```bash
pnpm nx typecheck nova-agent  # 0 errors ✅
pnpm nx lint nova-agent        # 0 errors ✅
pnpm nx build nova-agent       # PASSING ✅
````

### Desktop Packaging

```bash
pnpm nx tauri:build nova-agent  # SUCCESS (6m 12s) ✅
```

### Installers Created

- nova-agent_1.0.0_x64_en-US.msi ✅
- nova-agent_1.0.0_x64-setup.exe ✅

### MEDIUM Errors (Deferred)

**Decision:** Skip 5 MEDIUM errors (style warnings)
**Rationale:**

- Not blocking production
- Can be auto-fixed later with ESLint --fix
- User priority is getting to production

**Documented in FINISHER_STATE.md:**

```markdown
## Known Issues (Non-Blocking)

### MEDIUM Priority (5 warnings)

- react-hooks/exhaustive-deps (3 occurrences)
- no-console in debug.ts (1 occurrence)
- Formatting in utils.ts (1 occurrence)

**Status:** Documented for future cleanup
**Impact:** None - style warnings only
**Action:** Can run `pnpm nx lint nova-agent --fix` to auto-resolve
```

```

---

## Final Metrics

| Phase | Time | Errors Fixed | Errors Remaining |
|-------|------|--------------|------------------|
| Initial State | - | - | 49 |
| Loop 1 (CRITICAL) | 8 min | 7 | 42 |
| Loop 2 (HIGH - React.FC) | 12 min | 12 | 30 |
| Loop 3 (HIGH - React.*) | 15 min | 25 | 5 |
| Test Validation | 3 min | 0 (verified) | 5 |
| Build & Package | 8 min | - | 5 (MEDIUM) |
| **TOTAL** | **46 min** | **44** | **5 (acceptable)** |

---

## Comparison: v1.0 vs v2.0 Prioritization

### v1.0 Approach (Without Prioritization)
```

Fix all 49 errors in arbitrary order
↓
Discover build broken halfway through
↓
Go back and fix CRITICAL errors
↓
Re-run tests (may have broken things)
↓
Build finally works
↓
Total Time: ~75 minutes (with rework)

```

### v2.0 Approach (With Prioritization)
```

Classify 49 errors → 7 CRITICAL, 37 HIGH, 5 MEDIUM
↓
Fix 7 CRITICAL errors first (build now works!)
↓
Fix 37 HIGH errors systematically
↓
Test validation (all passing!)
↓
Build successfully
↓
Skip 5 MEDIUM errors (non-blocking)
↓
Total Time: 46 minutes (no rework)

```

### Impact
- **Time Saved:** 29 minutes (39% faster)
- **Rework Cycles:** 0 (vs 2-3 in v1.0)
- **Confidence:** High (tests verified before build)
- **Production Ready:** Yes (MEDIUM warnings acceptable)

---

## Key Takeaways

1. **Prioritization prevents rework**
   - Fixing CRITICAL errors first enabled build early
   - No wasted time fixing HIGH errors when build was broken

2. **Strategic batching improves efficiency**
   - Grouping by error type (React.FC, React.MouseEvent) faster
   - Predictable patterns = faster fixes

3. **Test validation catches regressions**
   - 143 tests passing = confidence in changes
   - No surprises during build phase

4. **MEDIUM errors can be deferred**
   - Style warnings don't block production
   - Can be cleaned up later if needed

5. **Automation saves time**
   - Classifier ran in <1 minute
   - Manual classification would take 10+ minutes
   - Recommended for all projects with 10+ errors

---

## Recommendations

**For next project:**
1. ✅ Use error classifier for any project with 10+ errors
2. ✅ Always fix CRITICAL errors first (build blockers)
3. ✅ Group HIGH errors by pattern for efficiency
4. ✅ Defer MEDIUM errors if time-constrained
5. ✅ Run tests before build to catch regressions

**When prioritization is critical:**
- 50+ errors (mandatory use)
- Mixed error types (build + quality + style)
- Complex projects with dependencies
- Time-constrained situations

**When to skip prioritization:**
- <10 errors (just fix all)
- Single error pattern (e.g., all React.FC)
- Already know fix order intuitively

---

**Status:** Example Complete
**Methodology Version:** v2.0
**Date:** 2026-01-15
```
