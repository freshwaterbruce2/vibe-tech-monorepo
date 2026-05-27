# Orchestrator Instructions: apiFetch Refactoring

**Status**: 🟡 DESIGNED - Ready for implementation  
**Priority**: HIGH  
**Risk Level**: LOW  
**Estimated Time**: 35 minutes

---

## Quick Start for Orchestrator Agent

This is a **mechanical refactor** with zero behavior change. Follow steps exactly.

---

## Step 1: Create Shared Utility (5 min)

**Action**: Create new file `src/lib/apiFetch.ts`

**Full file content** (copy exactly):

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

**Verify**:
```bash
pnpm --filter invoice-automation-saas exec tsc --noEmit src/lib/apiFetch.ts
```

---

## Step 2: Update Service Files (25 min)

### Update Order (risk-sorted, simplest first)

Execute these **in order**, verifying after each:

1. ✅ `src/services/authService.ts`
2. ✅ `src/services/clientService.ts`
3. ✅ `src/services/taxRateService.ts`
4. ✅ `src/services/templateService.ts`
5. ✅ `src/services/expenseService.ts`
6. ✅ `src/services/timeService.ts`
7. ✅ `src/services/recurringService.ts`
8. ✅ `src/services/invoiceService.ts`

---

### Standard Update Pattern (for each file)

#### A. Add Import (after type imports, before class)
```typescript
import { apiFetch } from '../lib/apiFetch'
```

#### B. Delete Local apiFetch Function

**Look for these patterns** (vary slightly by file):

**Pattern 1** (authService, invoiceService, expenseService, templateService):
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
    const message =
      (typeof body?.error === 'string' ? body.error : undefined) ??
      (typeof body?.message === 'string' ? body.message : undefined) ??
      res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}
```

**Pattern 2** (clientService - uses `as any`):
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
    const body = (await res.json().catch(() => null)) as any
    const message = body?.error || body?.message || res.statusText
    throw new Error(message)
  }
  return (await res.json().catch(() => ({}))) as any
}
```

**Delete the ENTIRE function** (typically lines 3-18 or 8-28, check line numbers first).

#### C. Verify No Other Changes

- ✅ Service class methods unchanged
- ✅ All `apiFetch(path, {...})` calls unchanged
- ✅ Type assertions (`as Client`, etc.) unchanged

---

### Verification After Each File

Run these **after EACH service file update**:

```bash
# 1. TypeScript check (must pass)
pnpm --filter invoice-automation-saas exec tsc --noEmit

# 2. ESLint check (must pass with 0 errors/warnings)
pnpm --filter invoice-automation-saas lint

# 3. Visual diff inspection (verify pattern)
git diff apps/invoice-automation-saas/src/services/<filename>.ts
```

**Expected diff**:
```diff
+ import { apiFetch } from '../lib/apiFetch'
+
- const apiFetch = async (path: string, init?: RequestInit) => {
-   // ... 15-20 lines deleted
- }
-
  class SomeService {
    // No changes here
  }
```

**Stop immediately if**:
- ❌ TypeScript errors appear
- ❌ ESLint errors appear
- ❌ Diff shows unexpected changes to service methods

---

## Step 3: Final Validation (10 min)

After all 8 files updated:

```bash
# 1. Full TypeScript build
pnpm --filter invoice-automation-saas exec tsc --noEmit

# 2. Full production build
pnpm --filter invoice-automation-saas build
pnpm --filter invoice-automation-saas build:api

# 3. Run tests (if test suite exists)
pnpm --filter invoice-automation-saas test -- --run

# 4. Start dev servers (manual smoke test)
# Terminal 1:
pnpm --filter invoice-automation-saas dev

# Terminal 2:
pnpm --filter invoice-automation-saas dev:api
```

### Manual Smoke Tests

Open browser to `http://localhost:5173` and test:

1. ✅ **Login** (authService) - `/login`
2. ✅ **List clients** (clientService) - `/clients`
3. ✅ **Create client** (clientService) - Click "Add Client"
4. ✅ **List invoices** (invoiceService) - `/invoices`
5. ✅ **Create invoice** (invoiceService) - Click "New Invoice"

**Verify**:
- ✅ No console errors
- ✅ API calls succeed (check Network tab)
- ✅ Data loads correctly

---

## Rollback Procedure

If any issues arise:

```bash
# Revert all service files
git checkout HEAD -- apps/invoice-automation-saas/src/services/

# Delete shared utility
git rm apps/invoice-automation-saas/src/lib/apiFetch.ts

# Re-verify
pnpm --filter invoice-automation-saas exec tsc --noEmit
pnpm --filter invoice-automation-saas lint
```

---

## Success Metrics

### Must Pass ✅
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors/warnings
- ✅ All tests pass (98 tests)
- ✅ Production build succeeds
- ✅ Smoke tests pass

### Quality Metrics ✅
- ✅ ~89 net lines removed
- ✅ All `as any` removed from service files
- ✅ All service methods unchanged (except removed apiFetch)

---

## Edge Cases (DO NOT MODIFY)

These methods **correctly use raw fetch** (not apiFetch) and should remain unchanged:

1. ✅ `expenseService.createExpense()` - FormData upload (lines ~95-105)
2. ✅ `templateService.uploadLogo()` - FormData upload (lines ~100-113)
3. ✅ `templateService.previewBlobUrl()` - Blob response (lines ~86-98)
4. ✅ `templateService.deleteLogo()` - 204 No Content (lines ~116-124)
5. ✅ `invoiceService.subscribe()` - EventSource (lines ~94-100)

**Verify these are NOT using apiFetch** in final review.

---

## Troubleshooting

### Issue: "Cannot find module '../lib/apiFetch'"
**Fix**: Ensure `src/lib/apiFetch.ts` was created in Step 1

### Issue: TypeScript error "Type 'Record<string, unknown>' is not assignable..."
**Fix**: You likely modified service method logic. Revert and only remove apiFetch function.

### Issue: ESLint error after update
**Fix**: Run `pnpm --filter invoice-automation-saas lint --fix` to auto-fix formatting

### Issue: Smoke test fails (API error)
**Fix**: Check browser console and Network tab. If auth fails, clear cookies and re-login.

---

## Commit Message Template

```
refactor(services): extract shared apiFetch utility

- Create src/lib/apiFetch.ts with type-safe implementation
- Remove duplicated apiFetch from 8 service files
- Standardize on Record<string, unknown> (removes 'as any')
- Net reduction: -89 lines of code

Impact:
- Zero behavior change (mechanical refactor)
- Improved type safety across all services
- Single source of truth for API fetch logic
- Easier to add features (retry, timeout, etc.) in future

Files changed:
- src/lib/apiFetch.ts (new)
- src/services/authService.ts
- src/services/clientService.ts
- src/services/invoiceService.ts
- src/services/expenseService.ts
- src/services/taxRateService.ts
- src/services/templateService.ts
- src/services/timeService.ts
- src/services/recurringService.ts

Addresses: findings.md Issue #1 (HIGH priority)
```

---

## Time Budget

| Phase | Time | Cumulative |
|-------|------|------------|
| Create apiFetch.ts | 5 min | 5 min |
| Update authService | 2 min | 7 min |
| Update clientService | 2 min | 9 min |
| Update taxRateService | 2 min | 11 min |
| Update templateService | 3 min | 14 min |
| Update expenseService | 3 min | 17 min |
| Update timeService | 3 min | 20 min |
| Update recurringService | 3 min | 23 min |
| Update invoiceService | 3 min | 26 min |
| Final validation | 10 min | **36 min** |

**Total**: ~35 minutes for low-risk mechanical refactor

---

## Dependencies

**None** - This refactor is self-contained.

**Blocks**:
- None

**Blocked by**:
- None

---

**Ready for Implementation** ✅

See `REFACTOR_PLAN_APIFETCH.md` for full design details, before/after examples, and risk assessment.
