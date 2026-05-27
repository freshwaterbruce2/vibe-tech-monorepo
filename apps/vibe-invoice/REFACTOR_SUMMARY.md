# Refactoring Summary: apiFetch Extraction

**Date**: 2026-05-13  
**Status**: 🟡 DESIGNED - Ready for Implementation  
**Agent**: Refactoring Implementation Agent

---

## Executive Summary

Successfully designed the extraction of duplicated `apiFetch` utility function from 8 service files into a single shared module. This is a **mechanical, zero-risk refactor** with significant code quality benefits.

### Key Metrics

- **LOC Reduction**: -89 lines net (-9.6% of services code)
- **Files Affected**: 9 total (1 new, 8 modified)
- **Risk Level**: LOW (mechanical refactor, no logic changes)
- **Estimated Time**: 35 minutes
- **Type Safety**: Removes all `as any` from service files

---

## Deliverables

### 1. Design Document ✅
**File**: `REFACTOR_PLAN_APIFETCH.md`

**Contents**:
- Complete analysis of current duplication (8 files, ~120 lines)
- Full design of new `src/lib/apiFetch.ts` utility
- Before/after examples (authService, invoiceService)
- LOC reduction breakdown by file
- Risk assessment and edge case handling
- Rollback procedure
- Success criteria

### 2. Implementation Guide ✅
**File**: `ORCHESTRATOR_INSTRUCTIONS.md`

**Contents**:
- Step-by-step execution plan (3 phases)
- File-by-file update order (risk-sorted)
- Verification commands after each step
- Standard update pattern (copy-paste ready)
- Rollback procedure
- Troubleshooting guide
- Commit message template
- 35-minute time budget

### 3. New Shared Utility ✅
**File**: `src/lib/apiFetch.ts` (designed, not created yet)

**Features**:
- ✅ Type-safe: `Promise<Record<string, unknown>>`
- ✅ Full JSDoc with examples
- ✅ Error extraction from `body.error` or `body.message`
- ✅ Cookie-based auth (`credentials: 'include'`)
- ✅ JSON-only (FormData/Blob use raw fetch)

---

## Before/After Comparison

### Before (authService.ts - 69 lines total)
```typescript
const apiFetch = async (path: string, init?: RequestInit) => {
  // ... 20 lines of duplicated code
}

class AuthService {
  async signUp(email: string, password: string, fullName?: string) {
    const data = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    });
    return { user: data.user as LocalUser, session: null };
  }
  // ... 4 more methods
}
```

### After (authService.ts - 46 lines total)
```typescript
import { apiFetch } from '../lib/apiFetch'

class AuthService {
  async signUp(email: string, password: string, fullName?: string) {
    const data = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    });
    return { user: data.user as LocalUser, session: null };
  }
  // ... 4 more methods (unchanged)
}
```

**Result**: -23 lines from authService alone

---

## Impact Analysis

### Code Quality Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total LOC (services) | 929 | 798 | -131 lines |
| New utility LOC | 0 | 42 | +42 lines |
| Net LOC change | 929 | 840 | **-89 lines (-9.6%)** |
| `as any` count | 2 | 0 | -2 |
| Duplication | 8 copies | 1 canonical | -7 copies |

### Type Safety

**Before**:
```typescript
// clientService.ts
return (await res.json().catch(() => ({}))) as any  // ❌ Unsafe
```

**After**:
```typescript
// All services
return (await res.json().catch(() => ({}))) as Record<string, unknown>  // ✅ Type-safe
```

---

## Files Modified

### New File
- `src/lib/apiFetch.ts` (+42 lines)

### Modified Files (8 total)
1. `src/services/authService.ts` (-23 lines)
2. `src/services/clientService.ts` (-14 lines)
3. `src/services/invoiceService.ts` (-15 lines)
4. `src/services/expenseService.ts` (-18 lines)
5. `src/services/taxRateService.ts` (-15 lines)
6. `src/services/templateService.ts` (-16 lines)
7. `src/services/timeService.ts` (-15 lines)
8. `src/services/recurringService.ts` (-15 lines)

---

## Implementation Steps (Quick Reference)

### Phase 1: Create Utility (5 min)
```bash
# Create src/lib/apiFetch.ts with full content
# Verify: pnpm --filter invoice-automation-saas exec tsc --noEmit src/lib/apiFetch.ts
```

### Phase 2: Update Services (25 min)
For each of 8 service files:
1. Add: `import { apiFetch } from '../lib/apiFetch'`
2. Delete: Entire local `apiFetch` function (15-20 lines)
3. Verify: `tsc --noEmit` and `lint` pass

**Order**: authService → clientService → taxRateService → templateService → expenseService → timeService → recurringService → invoiceService

### Phase 3: Final Validation (10 min)
```bash
pnpm --filter invoice-automation-saas build
pnpm --filter invoice-automation-saas build:api
pnpm --filter invoice-automation-saas test -- --run
# Manual smoke tests in browser
```

---

## Edge Cases Verified ✅

These operations **correctly use raw fetch** and will remain unchanged:

1. ✅ **FormData uploads**
   - `expenseService.createExpense()` - receipt file upload
   - `templateService.uploadLogo()` - logo file upload

2. ✅ **Blob responses**
   - `templateService.previewBlobUrl()` - PDF preview download

3. ✅ **204 No Content**
   - `templateService.deleteLogo()` - DELETE with no response body

4. ✅ **EventSource**
   - `invoiceService.subscribe()` - Server-Sent Events (SSE)

**Verification**: All these methods will still call raw `fetch()` directly, not `apiFetch()`.

---

## Risk Mitigation

### Low-Risk Factors ✅
- ✅ Mechanical refactor (move code, no logic changes)
- ✅ TypeScript catches breaking changes at compile time
- ✅ Incremental approach (verify after each file)
- ✅ All call sites unchanged (backward compatible)
- ✅ Easy rollback (git checkout)

### Testing Strategy
```bash
# After each file update
tsc --noEmit  # Type safety
lint          # Code quality
git diff      # Visual inspection

# After all updates
build         # Production build
test -- --run # Test suite (98 tests)
smoke tests   # Manual browser testing
```

---

## Success Criteria

### Functional ✅
- ✅ All service methods return same data
- ✅ Error messages unchanged
- ✅ Auth still works (cookies preserved)
- ✅ FormData/Blob operations unaffected

### Quality ✅
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors/warnings
- ✅ All 98 tests pass
- ✅ Production build succeeds
- ✅ Smoke tests pass

---

## Next Steps for Orchestrator

1. **Read**: `ORCHESTRATOR_INSTRUCTIONS.md` (complete step-by-step guide)
2. **Read**: `REFACTOR_PLAN_APIFETCH.md` (full design and rationale)
3. **Execute**: Follow 3-phase plan from instructions
4. **Commit**: Use provided commit message template

**Estimated Execution Time**: 35 minutes  
**No blockers, ready to proceed** ✅

---

## Related Documents

- **Design**: `REFACTOR_PLAN_APIFETCH.md` - Full design, examples, analysis
- **Implementation**: `ORCHESTRATOR_INSTRUCTIONS.md` - Step-by-step execution
- **Issue Tracking**: `findings.md` - Marked as DESIGNED, Issue #1
- **Project Context**: `CLAUDE.md` - App overview, stack, rules

---

## Questions Addressed

### Q: Should we handle non-JSON responses?
**A**: No. FormData/Blob operations use raw fetch (by design).

### Q: Should we add retry logic?
**A**: No. Keep simple for now. Add later if needed.

### Q: What about request/response interceptors?
**A**: Out of scope. This is a mechanical extraction only.

### Q: Do we need tests for apiFetch?
**A**: No new tests needed. Existing service tests cover it indirectly.

### Q: Can we skip some verification steps?
**A**: No. TypeScript + lint must pass after EACH file update.

---

## Orchestrator Checklist

Before starting:
- [ ] Read `ORCHESTRATOR_INSTRUCTIONS.md` completely
- [ ] Understand the 3-phase plan
- [ ] Note the 8-file execution order
- [ ] Prepare verification commands

During execution:
- [ ] Create `src/lib/apiFetch.ts` exactly as designed
- [ ] Update each service file in order
- [ ] Run `tsc --noEmit` after each file
- [ ] Run `lint` after each file
- [ ] Check diff matches expected pattern

After completion:
- [ ] Full build passes
- [ ] All tests pass
- [ ] Smoke tests pass
- [ ] Commit with provided message

On any issue:
- [ ] Stop immediately
- [ ] Review troubleshooting guide
- [ ] Use rollback procedure if needed

---

**Status**: Ready for orchestrator execution  
**Confidence**: HIGH (mechanical refactor, well-designed, low risk)

---

**END OF SUMMARY**
