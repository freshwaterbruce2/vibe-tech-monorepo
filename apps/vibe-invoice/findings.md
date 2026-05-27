# Code Quality Audit Report
**Date**: 2026-05-13  
**App**: invoice-automation-saas  
**Status**: ✅ All automated checks passed

## Summary

### Automated Checks
- ✅ **ESLint**: Passed (0 errors, 0 warnings)
- ✅ **TypeScript (Frontend)**: Passed (0 errors)
- ✅ **TypeScript (Server)**: Passed (0 errors)

### Manual Code Review Results
- ⚠️ **6 instances** of `any` type usage (should be fixed)
- ⚠️ **1 instance** of `console.log` in production code
- 🔴 **Code Duplication**: `apiFetch` utility duplicated across 8 files
- ✅ **No major error handling issues** detected

---

## Code Quality Issues

### 1. Type Safety - `any` Type Usage

**Priority**: Medium  
**Impact**: Reduces type safety and IntelliSense support

#### Frontend Issues

**File**: `src/pages/Clients.tsx`
- **Line 32**: `catch (err: any)` - should use `catch (err)` or `catch (err: unknown)`
- **Line 81**: Cast `as any` for client object - should define proper type or use `satisfies`
- **Line 95**: `catch (err: any)` - should use `catch (err)` or `catch (err: unknown)`
- **Line 108**: `catch (err: any)` - should use `catch (err)` or `catch (err: unknown)`

**File**: `src/services/clientService.ts`
- **Line 13**: `as any` type assertion in error body parsing
- **Line 17**: `return (await res.json().catch(() => ({}))) as any`

**File**: `src/services/invoiceService.ts`
- **Line 95**: `EventSource` constructor options cast `as any` (known browser API quirk, acceptable)

#### Server Issues

**File**: `server/src/index.ts`
- **Line 103**: `send = (payload: any)` - should be typed as `send = (payload: unknown)` or define a proper EventPayload type
- **Line 110**: `onUserEvent = (event: any)` - should match the event type from EventEmitter

**Recommendation**:
```typescript
// Instead of:
catch (err: any) {
  toast.error(err.message ?? 'Failed')
}

// Use:
catch (err) {
  const message = err instanceof Error ? err.message : 'Failed'
  toast.error(message)
}
```

---

### 2. Console Usage in Production Code

**Priority**: Medium  
**Impact**: Can expose sensitive data, affects performance

**File**: `src/hooks/usePerformanceMonitor.ts`
- **Line 12**: `console.log(\`[Perf] ${name}: ${durationMs.toFixed(1)}ms\`)`

**Current Mitigation**: Guarded by `import.meta.env.DEV` check (✅ Acceptable pattern)

**File**: `server/src/index.ts`
- **Line 163**: `console.error(err)` in top-level error handler

**Note**: The server-side `console.error` is acceptable for top-level error logging before exit, as Fastify's logger is not yet initialized. Consider adding a comment explaining this.

---

### 3. Code Duplication - Critical Issue ✅ DESIGNED

**Priority**: HIGH  
**Impact**: Maintenance burden, inconsistency risk, violates DRY principle  
**Status**: 🟡 DESIGNED - Ready for implementation  
**Design Doc**: `REFACTOR_PLAN_APIFETCH.md`  
**Implementation Guide**: `ORCHESTRATOR_INSTRUCTIONS.md`

#### Duplicate `apiFetch` Utility

The `apiFetch` function is **duplicated across 8 service files** with nearly identical implementations:

1. ✅ `src/services/authService.ts` (lines 8-28) - **BEST IMPLEMENTATION**
2. `src/services/clientService.ts` (lines 3-18) - Uses `any` types
3. `src/services/invoiceService.ts` (lines 35-50)
4. `src/services/expenseService.ts` (lines 48-66)
5. `src/services/taxRateService.ts`
6. `src/services/templateService.ts` (lines 23-39)
7. `src/services/timeService.ts`
8. `src/services/recurringService.ts`

**Differences**:
- Most implementations are identical in logic
- Some use `as any`, others use `as Record<string, unknown>`
- All handle credentials, JSON parsing, and error extraction the same way

**Designed Solution** (see full details in `REFACTOR_PLAN_APIFETCH.md`):

1. ✅ Extract to `src/lib/apiFetch.ts` with full JSDoc
2. ✅ Use best implementation (from authService) with `Record<string, unknown>`
3. ✅ Remove ~120 lines across 8 files
4. ✅ Add import statement to each service file
5. ✅ Net reduction: -89 lines of code

**Implementation Estimate**: ~35 minutes (mechanical refactor, low risk)

**Next Step**: Execute via orchestrator using `ORCHESTRATOR_INSTRUCTIONS.md`

---

### 4. Silent Error Swallowing (Informational)

**Priority**: Low (by design)  
**Pattern**: `.catch(() => ({}))` or `.catch(() => null)` for JSON parsing

**Locations**: All service files in `apiFetch` implementation

**Analysis**: This pattern is **acceptable** because:
- Used only for parsing response bodies that may not be valid JSON
- Always follows a `res.ok` check, so failed parsing is expected for some error responses
- Returns empty object/null as fallback, which is handled by subsequent code
- Does not hide network or fetch errors (those propagate)

**No action required** - this is a defensive programming pattern for malformed API responses.

---

## Recommendations Summary

### High Priority
1. **Extract `apiFetch` to shared utility** - Eliminate 120+ lines of duplication across 8 files

### Medium Priority
2. **Replace `any` with proper types** - 6 instances across 3 files
3. **Add explanatory comment** to `console.error` in server/src/index.ts (line 163)

### Low Priority (Optional)
4. Consider extracting error message extraction logic to a helper
5. Consider defining EventPayload type for SSE events

---

## Code Smell Patterns (None Critical)

✅ **Error Handling**: Consistent `try-catch` blocks with user-friendly messages  
✅ **Async/Await**: No floating promises detected  
✅ **Resource Cleanup**: EventSource properly cleaned up in unsubscribe  
✅ **Type Assertions**: Most are necessary (date reviving, API deserialization)  
⚠️ **Duplication**: High duplication in apiFetch (see above)

---

## Job System Hardening — DESIGN COMPLETE ✅

**Date**: 2026-05-13  
**Status**: 🟢 READY FOR IMPLEMENTATION  
**Priority**: HIGH  
**Design Docs**: 
- `JOB_HARDENING_DESIGN.md` — Complete implementation design with schema changes, code changes, and testing approach
- `task_plan.md` — Step-by-step implementation plan with phases and checklist

### Scope

Three critical job system improvements designed in detail:

1. **Dead-Letter Queue (DLQ)** — Capture permanently failed jobs for manual inspection and retry
   - New `jobs_dlq` table with resolution tracking
   - REST API endpoints for DLQ management (`/api/dlq`)
   - Automatic cleanup of old completed jobs

2. **Execution Timeouts** — Prevent runaway jobs from blocking the system
   - Per-job `timeout_ms` configuration with default 5-minute timeout
   - Stale job cleanup cron (every 5 minutes)
   - Graceful timeout handling with retry logic

3. **Recurring Invoice Idempotency** — Prevent duplicate invoices on retry
   - Idempotency key on `jobs` table with UNIQUE constraint
   - `last_generated_at` tracking on `recurring_schedules`
   - Transaction-safe invoice generation with deduplication

### Migration Strategy

- **3 new migrations**: `0013_jobs_dlq.sql`, `0014_jobs_timeout.sql`, `0015_recurring_idempotency.sql`
- **Backward compatible**: Old code ignores new columns/tables
- **Phased rollout**: DLQ → Timeout → Idempotency (can deploy independently)

### Testing Plan

- **Unit tests**: DLQ operations, timeout enforcement, idempotency checks
- **Integration tests**: Full recurring flow with forced failures
- **Manual QA**: Create schedule, force failures, verify no duplicates

### Next Steps

1. Read `JOB_HARDENING_DESIGN.md` for complete implementation details
2. Follow `task_plan.md` phase-by-phase checklist
3. Run full test suite after each phase
4. Deploy to staging, soak for 24 hours, then production

---

## Suggested Action Items

1. ✅ **DONE**: Job system hardening design (DLQ, timeouts, idempotency) — See `JOB_HARDENING_DESIGN.md` and `task_plan.md`
2. Create `src/lib/apiFetch.ts` with the shared utility
3. Update all 8 service files to import the shared `apiFetch`
4. Replace `catch (err: any)` with proper error handling in Clients.tsx
5. Add comment to server console.error explaining why it's acceptable
6. Consider defining ServerSentEvent type for SSE payload

---

## Notes

- The app follows consistent patterns across files
- Most type assertions are necessary for API boundary deserialization
- The codebase is generally well-structured with clear separation of concerns
- No security issues detected (credentials properly included, HTTPS assumed)
- Job system hardening design is complete and ready for implementation — no code changes have been applied yet, only design and documentation
