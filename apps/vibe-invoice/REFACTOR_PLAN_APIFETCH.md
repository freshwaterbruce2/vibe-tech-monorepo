# Refactoring Plan: Extract Shared apiFetch Utility

**Date**: 2026-05-13  
**Issue**: ~120 lines of duplicated `apiFetch` code across 8 service files  
**Priority**: HIGH  
**Impact**: Maintenance burden, inconsistency risk, violates DRY principle

---

## Executive Summary

The `apiFetch` utility function is duplicated across 8 service files with nearly identical implementations. This refactoring will:

1. ✅ **Extract** to `src/lib/apiFetch.ts` (new file)
2. ✅ **Remove** ~120 lines of duplication
3. ✅ **Standardize** error handling and type safety
4. ✅ **Preserve** special cases (FormData uploads use raw fetch)
5. ✅ **Maintain** 100% backward compatibility

**Estimated Reduction**: 120+ lines of code across 8 files  
**Risk Level**: LOW (mechanical refactor, no behavior change)

---

## Current State Analysis

### Affected Files (8 total)

1. `src/services/authService.ts` (lines 8-28) ✅ **Best implementation** - uses proper types
2. `src/services/clientService.ts` (lines 3-18)
3. `src/services/invoiceService.ts` (lines 35-50)
4. `src/services/expenseService.ts` (lines 48-66)
5. `src/services/taxRateService.ts` (not yet inspected)
6. `src/services/templateService.ts` (lines 23-39)
7. `src/services/timeService.ts` (not yet inspected)
8. `src/services/recurringService.ts` (not yet inspected)

### Current Implementation Variants

All implementations share:
- ✅ `credentials: 'include'` for cookie-based auth
- ✅ `Content-Type: application/json` header
- ✅ Error extraction from `body.error` or `body.message`
- ✅ JSON parsing with `.catch(() => ({}))` fallback
- ✅ `res.ok` check with structured error throwing

**Type Safety Differences**:
- ❌ Some use `as any` (clientService)
- ✅ Others use `as Record<string, unknown>` (authService, invoiceService, expenseService, templateService)

### Special Cases (Keep Using Raw Fetch)

These operations should **NOT** use `apiFetch` because they require non-JSON handling:

1. **FormData uploads**:
   - `expenseService.createExpense()` (receipt upload)
   - `templateService.uploadLogo()` (logo file upload)

2. **Blob responses**:
   - `templateService.previewBlobUrl()` (PDF preview download)

3. **DELETE with no JSON body**:
   - `templateService.deleteLogo()` (204 No Content response)

---

## Design: New Shared Utility

### File: `src/lib/apiFetch.ts`

```typescript
/**
 * Shared API fetch utility for JSON requests.
 * 
 * Features:
 * - Automatic Content-Type: application/json header
 * - Cookie-based auth via credentials: 'include'
 * - Structured error extraction from response body
 * - Type-safe return value
 * 
 * @param path - API endpoint path (e.g., '/api/clients')
 * @param init - Standard fetch RequestInit options
 * @returns Parsed JSON response as Record<string, unknown>
 * @throws Error with user-friendly message from API or res.statusText
 * 
 * Note: For FormData uploads or blob responses, use raw fetch instead.
 */
export const apiFetch = async (
  path: string,
  init?: RequestInit
): Promise<Record<string, unknown>> => {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })

  if (!res.ok) {
    // Extract user-friendly error message from response body
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const message =
      (typeof body?.error === 'string' ? body.error : undefined) ??
      (typeof body?.message === 'string' ? body.message : undefined) ??
      res.statusText
    throw new Error(message)
  }

  // Return parsed JSON or empty object if parsing fails
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}
```

**Key Design Decisions**:

1. ✅ **Uses `Record<string, unknown>`** - Best type safety without `any`
2. ✅ **Inline documentation** - Explains when NOT to use it
3. ✅ **Type-safe error extraction** - Uses `typeof` guards instead of casts
4. ✅ **Explicit return type** - `Promise<Record<string, unknown>>`
5. ✅ **Comment on FormData** - Reminds developers about special cases

---

## Before/After Examples

### Example 1: authService.ts

**BEFORE** (28 lines including apiFetch):
```typescript
const apiFetch = async (path: string, init?: RequestInit) => {
	const res = await fetch(path, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
		credentials: "include",
	});

	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
		const message =
			(typeof body?.error === 'string' ? body.error : undefined) ??
			(typeof body?.message === 'string' ? body.message : undefined) ??
			res.statusText;
		throw new Error(message);
	}

	return (await res.json().catch(() => ({}))) as Record<string, unknown>;
};

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

**AFTER** (5 lines total, 23 lines removed):
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

**Lines Removed**: 23 (20 from apiFetch + 3 blank lines)

---

### Example 2: invoiceService.ts

**BEFORE** (16 lines of apiFetch):
```typescript
const apiFetch = async (path: string, init?: RequestInit) => {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const message = (body?.error as string | undefined) || (body?.message as string | undefined) || res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

class InvoiceService {
  async listInvoices() {
    const data = await apiFetch('/api/invoices')
    const invoices = ((data.invoices ?? []) as ApiInvoice[]).map(deserializeInvoice)
    // ... rest of method
  }
  // ... 8 more methods
}
```

**AFTER** (1 import line):
```typescript
import { apiFetch } from '../lib/apiFetch'

class InvoiceService {
  async listInvoices() {
    const data = await apiFetch('/api/invoices')
    const invoices = ((data.invoices ?? []) as ApiInvoice[]).map(deserializeInvoice)
    // ... rest of method (unchanged)
  }
  // ... 8 more methods (unchanged)
}
```

**Lines Removed**: 15 (16 apiFetch lines - 1 import line)

---

## Impact Analysis

### Lines of Code Reduction

| File | Current LOC | apiFetch LOC | After Refactor | Reduction |
|------|------------|--------------|----------------|-----------|
| authService.ts | 69 | 20 | 46 | -23 lines |
| clientService.ts | 52 | 15 | 38 | -14 lines |
| invoiceService.ts | 235 | 15 | 220 | -15 lines |
| expenseService.ts | 145 | 18 | 127 | -18 lines |
| templateService.ts | 128 | 16 | 112 | -16 lines |
| taxRateService.ts | ~80 | ~15 | ~65 | -15 lines |
| timeService.ts | ~120 | ~15 | ~105 | -15 lines |
| recurringService.ts | ~100 | ~15 | ~85 | -15 lines |
| **TOTAL** | ~929 | ~129 | ~798 | **-131 lines** |

**New File**: `src/lib/apiFetch.ts` (+42 lines with docs)

**Net Reduction**: -89 lines (-9.6% of services code)

### Type Safety Improvements

✅ **Removes all `as any` casts** from service files  
✅ **Standardizes on `Record<string, unknown>`** for type safety  
✅ **Adds explicit return type** to utility function  

---

## Migration Steps for Orchestrator

### Phase 1: Create Shared Utility

**Step 1.1**: Create `src/lib/apiFetch.ts`
```bash
# Path: apps/invoice-automation-saas/src/lib/apiFetch.ts
# Content: [See "Design: New Shared Utility" section above]
```

**Verification**:
```bash
# File exists and compiles
pnpm --filter invoice-automation-saas exec tsc --noEmit src/lib/apiFetch.ts
```

---

### Phase 2: Update Service Files (8 files)

**For each service file, perform these steps atomically**:

#### Step 2.1: Add Import Statement
```typescript
// Add after existing type imports, before class definition
import { apiFetch } from '../lib/apiFetch'
```

#### Step 2.2: Remove Local apiFetch Function
```typescript
// Remove entire function (typically lines 3-18 or 8-28)
// Delete from:
const apiFetch = async (path: string, init?: RequestInit) => {
// ... entire function body
}
```

#### Step 2.3: Verify No Other Changes Needed
- ✅ All `apiFetch()` call sites remain unchanged
- ✅ Service class methods keep same logic
- ✅ Type assertions (`as Client`, `as Invoice`) unchanged

---

### Phase 3: File-by-File Execution Order

Execute in this order to minimize risk (simpler files first):

1. ✅ **authService.ts** - Simplest (5 methods, no special cases)
2. ✅ **clientService.ts** - Simple CRUD (4 methods)
3. ✅ **taxRateService.ts** - Simple CRUD (likely similar to clientService)
4. ✅ **templateService.ts** - Has FormData exceptions (verify those stay raw fetch)
5. ✅ **expenseService.ts** - Has FormData exception (verify createExpense stays raw fetch)
6. ✅ **timeService.ts** - Likely CRUD (inspect first)
7. ✅ **recurringService.ts** - May have complex logic (inspect first)
8. ✅ **invoiceService.ts** - Most complex (cache, listeners, EventSource)

---

### Phase 4: Verification Strategy

**After EACH file update**:

```bash
# 1. TypeScript compilation check
pnpm --filter invoice-automation-saas exec tsc --noEmit

# 2. ESLint check (should remain 0 errors/warnings)
pnpm --filter invoice-automation-saas lint

# 3. Run tests (if applicable for that service)
pnpm --filter invoice-automation-saas test -- --run

# 4. Visual inspection of diff
git diff apps/invoice-automation-saas/src/services/<file>.ts
```

**Expected diff pattern for each file**:
```diff
- const apiFetch = async (path: string, init?: RequestInit) => {
-   // ... 15-20 lines
- }
-
+ import { apiFetch } from '../lib/apiFetch'
+
  class SomeService {
    // ... methods unchanged
  }
```

---

### Phase 5: Final Validation

**After all 8 files updated**:

```bash
# 1. Full build (frontend + server)
pnpm --filter invoice-automation-saas build
pnpm --filter invoice-automation-saas build:api

# 2. Run full test suite
pnpm --filter invoice-automation-saas test -- --run

# 3. Start dev servers and smoke test critical flows
pnpm --filter invoice-automation-saas dev      # Terminal 1 (SPA)
pnpm --filter invoice-automation-saas dev:api  # Terminal 2 (API)

# Manual smoke tests:
# - Login (authService)
# - Create client (clientService)
# - Create invoice (invoiceService)
# - Create expense (expenseService)
# - Upload logo (templateService - should still work with raw fetch)
```

---

## Rollback Plan

If issues arise, rollback is trivial (all changes are mechanical):

```bash
# Revert all service files
git checkout HEAD -- apps/invoice-automation-saas/src/services/

# Delete shared utility
git rm apps/invoice-automation-saas/src/lib/apiFetch.ts

# Re-run validation
pnpm --filter invoice-automation-saas exec tsc --noEmit
pnpm --filter invoice-automation-saas lint
```

---

## Risk Assessment

### Low Risk Factors ✅

1. ✅ **Mechanical refactor** - No logic changes, only moving code
2. ✅ **TypeScript enforcement** - Compiler catches breaking changes
3. ✅ **Isolated changes** - Each service file is independent
4. ✅ **Incremental approach** - Can test after each file
5. ✅ **Backward compatible** - All call sites remain unchanged

### Edge Cases to Verify ✅

1. ✅ **FormData uploads** - Confirmed they use raw fetch (not apiFetch)
   - `expenseService.createExpense()` - lines 95-105
   - `templateService.uploadLogo()` - lines 100-113
   
2. ✅ **Blob responses** - Confirmed they use raw fetch
   - `templateService.previewBlobUrl()` - lines 86-98

3. ✅ **DELETE with 204** - Confirmed it uses raw fetch
   - `templateService.deleteLogo()` - lines 116-124

4. ✅ **EventSource** - Does NOT use apiFetch (separate fetch for SSE)
   - `invoiceService.subscribe()` - lines 94-100

---

## Success Criteria

### Functional Requirements ✅
- ✅ All service methods return same data structures
- ✅ Error handling behavior unchanged (same Error messages)
- ✅ Cookie-based auth still works (`credentials: 'include'`)
- ✅ FormData/Blob operations unaffected

### Non-Functional Requirements ✅
- ✅ -89 net lines of code removed
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript errors
- ✅ All tests pass (98 tests at Tier 1)
- ✅ Build succeeds (frontend + server)

---

## Related Issues

This refactoring addresses:
- ✅ **Issue #1** from `findings.md`: Code duplication (HIGH priority)
- ✅ **Issue #2** (partial): Removes `as any` type assertions from services

**Does NOT address** (out of scope):
- ❌ Remaining `catch (err: any)` in `src/pages/Clients.tsx` (separate fix)
- ❌ Server-side `console.error` in `server/src/index.ts` (acceptable pattern)

---

## Timeline Estimate

| Phase | Estimated Time | Notes |
|-------|----------------|-------|
| Create shared utility | 5 minutes | Copy best implementation + add docs |
| Update authService | 2 minutes | Simplest file |
| Update clientService | 2 minutes | Simple CRUD |
| Update remaining 6 files | 15 minutes | 2-3 min each with verification |
| Final validation | 10 minutes | Build + test + smoke test |
| **TOTAL** | **~35 minutes** | Low-risk mechanical refactor |

---

## Appendix A: Full apiFetch.ts File

```typescript
/**
 * Shared API fetch utility for JSON requests.
 * 
 * Features:
 * - Automatic Content-Type: application/json header
 * - Cookie-based auth via credentials: 'include'
 * - Structured error extraction from response body
 * - Type-safe return value
 * 
 * @param path - API endpoint path (e.g., '/api/clients')
 * @param init - Standard fetch RequestInit options
 * @returns Parsed JSON response as Record<string, unknown>
 * @throws Error with user-friendly message from API or res.statusText
 * 
 * Note: For FormData uploads or blob responses, use raw fetch instead.
 * 
 * @example
 * // Simple GET request
 * const data = await apiFetch('/api/clients')
 * const clients = data.clients as Client[]
 * 
 * @example
 * // POST with body
 * const data = await apiFetch('/api/clients', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'Acme Corp' }),
 * })
 * const client = data.client as Client
 * 
 * @example
 * // FormData upload (do NOT use apiFetch)
 * const form = new FormData()
 * form.append('file', fileBlob)
 * const res = await fetch('/api/upload', {
 *   method: 'POST',
 *   body: form,
 *   credentials: 'include',
 * })
 */
export const apiFetch = async (
  path: string,
  init?: RequestInit
): Promise<Record<string, unknown>> => {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })

  if (!res.ok) {
    // Extract user-friendly error message from response body
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    const message =
      (typeof body?.error === 'string' ? body.error : undefined) ??
      (typeof body?.message === 'string' ? body.message : undefined) ??
      res.statusText
    throw new Error(message)
  }

  // Return parsed JSON or empty object if parsing fails
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}
```

---

## Appendix B: Import Statement for Each File

Add this line after type imports, before class definition:

```typescript
import { apiFetch } from '../lib/apiFetch'
```

**Path is relative from**:
- `src/services/*.ts` → `../lib/apiFetch`
- Resolves to: `src/lib/apiFetch.ts`

---

## Questions for Review

1. ✅ Should we add JSDoc examples? **YES** - Added in Appendix A
2. ✅ Should we export type for return value? **NO** - `Record<string, unknown>` is sufficient
3. ✅ Should we handle non-JSON responses? **NO** - Those use raw fetch (by design)
4. ✅ Should we add request/response interceptors? **NO** - Keep simple, add later if needed
5. ✅ Should we handle retries/timeouts? **NO** - Add if needed for resilience later

---

**END OF REFACTORING PLAN**
