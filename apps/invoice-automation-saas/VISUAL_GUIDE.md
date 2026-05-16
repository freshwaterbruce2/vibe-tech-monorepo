# Visual Guide: apiFetch Refactoring

This visual guide illustrates the transformation of duplicated `apiFetch` code into a shared utility.

---

## Current State: Duplication Across 8 Files

```
┌─────────────────────────────────────────────────────────────┐
│  apps/invoice-automation-saas/src/services/                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  authService.ts                                              │
│  ┌───────────────────────────────────────────┐              │
│  │ const apiFetch = async (...) => {         │  20 lines    │
│  │   // fetch, error handling, JSON parse    │              │
│  │ }                                          │              │
│  └───────────────────────────────────────────┘              │
│  class AuthService { ... }                                   │
│                                                               │
│  clientService.ts                                            │
│  ┌───────────────────────────────────────────┐              │
│  │ const apiFetch = async (...) => {         │  15 lines    │
│  │   // fetch, error handling, JSON parse    │              │
│  │ }                                          │              │
│  └───────────────────────────────────────────┘              │
│  class ClientService { ... }                                 │
│                                                               │
│  invoiceService.ts                                           │
│  ┌───────────────────────────────────────────┐              │
│  │ const apiFetch = async (...) => {         │  15 lines    │
│  │   // fetch, error handling, JSON parse    │              │
│  │ }                                          │              │
│  └───────────────────────────────────────────┘              │
│  class InvoiceService { ... }                                │
│                                                               │
│  expenseService.ts                                           │
│  ┌───────────────────────────────────────────┐              │
│  │ const apiFetch = async (...) => {         │  18 lines    │
│  │   // fetch, error handling, JSON parse    │              │
│  │ }                                          │              │
│  └───────────────────────────────────────────┘              │
│  class ExpenseService { ... }                                │
│                                                               │
│  ... (4 more files with identical duplication)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Total Duplication: ~120 lines across 8 files
```

---

## Target State: Single Shared Utility

```
┌─────────────────────────────────────────────────────────────┐
│  apps/invoice-automation-saas/src/lib/                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  apiFetch.ts ⭐ NEW FILE                                     │
│  ┌───────────────────────────────────────────┐              │
│  │ /**                                        │              │
│  │  * Shared API fetch utility               │              │
│  │  * - JSON requests only                   │  42 lines    │
│  │  * - Cookie auth                          │  (with docs) │
│  │  * - Type-safe                            │              │
│  │  */                                        │              │
│  │ export const apiFetch = async (           │              │
│  │   path: string,                            │              │
│  │   init?: RequestInit                       │              │
│  │ ): Promise<Record<string, unknown>> => {  │              │
│  │   // Single canonical implementation      │              │
│  │ }                                          │              │
│  └───────────────────────────────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┴───────────────────┐
        │                                        │
        │  All 8 services import from here      │
        │                                        │
        └────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  apps/invoice-automation-saas/src/services/                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  authService.ts                                              │
│  import { apiFetch } from '../lib/apiFetch' ⭐               │
│  class AuthService { ... }                                   │
│                                                               │
│  clientService.ts                                            │
│  import { apiFetch } from '../lib/apiFetch' ⭐               │
│  class ClientService { ... }                                 │
│                                                               │
│  invoiceService.ts                                           │
│  import { apiFetch } from '../lib/apiFetch' ⭐               │
│  class InvoiceService { ... }                                │
│                                                               │
│  expenseService.ts                                           │
│  import { apiFetch } from '../lib/apiFetch' ⭐               │
│  class ExpenseService { ... }                                │
│                                                               │
│  ... (4 more files, all import from shared utility)         │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Net Change: +42 lines (new file) - 131 lines (removed) = -89 lines
```

---

## Transformation Per File

### Example: authService.ts

```diff
+ import { apiFetch } from '../lib/apiFetch'
+
  export interface LocalUser {
    id: string;
    email: string;
    // ...
  }

- const apiFetch = async (path: string, init?: RequestInit) => {
-   const res = await fetch(path, {
-     ...init,
-     headers: {
-       'Content-Type': 'application/json',
-       ...(init?.headers ?? {}),
-     },
-     credentials: 'include',
-   });
-
-   if (!res.ok) {
-     const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
-     const message =
-       (typeof body?.error === 'string' ? body.error : undefined) ??
-       (typeof body?.message === 'string' ? body.message : undefined) ??
-       res.statusText;
-     throw new Error(message);
-   }
-
-   return (await res.json().catch(() => ({}))) as Record<string, unknown>;
- };
-
  class AuthService {
    async signUp(email: string, password: string, fullName?: string) {
      const data = await apiFetch("/api/auth/signup", {  // ⭐ No change
        method: "POST",
        body: JSON.stringify({ email, password, fullName }),
      });
      return { user: data.user as LocalUser, session: null };
    }
    // ... 4 more methods (all unchanged)
  }
```

**Key Points**:
- ✅ Only 2 changes: add import, remove function
- ✅ Service class methods completely unchanged
- ✅ All `apiFetch()` calls work identically

---

## LOC Reduction Breakdown

```
┌──────────────────────┬─────────┬──────────┬────────┬────────────┐
│ File                 │ Before  │ apiFetch │ After  │ Reduction  │
├──────────────────────┼─────────┼──────────┼────────┼────────────┤
│ authService.ts       │   69    │    20    │   46   │   -23      │
│ clientService.ts     │   52    │    15    │   38   │   -14      │
│ invoiceService.ts    │  235    │    15    │  220   │   -15      │
│ expenseService.ts    │  145    │    18    │  127   │   -18      │
│ templateService.ts   │  128    │    16    │  112   │   -16      │
│ taxRateService.ts    │  ~80    │   ~15    │  ~65   │   -15      │
│ timeService.ts       │ ~120    │   ~15    │ ~105   │   -15      │
│ recurringService.ts  │ ~100    │   ~15    │  ~85   │   -15      │
├──────────────────────┼─────────┼──────────┼────────┼────────────┤
│ TOTAL (services)     │  929    │   129    │  798   │  -131      │
│ NEW: apiFetch.ts     │    0    │    -     │   42   │   +42      │
├──────────────────────┼─────────┼──────────┼────────┼────────────┤
│ NET CHANGE           │  929    │    -     │  840   │   -89      │
└──────────────────────┴─────────┴──────────┴────────┴────────────┘

Net Reduction: -89 lines (-9.6%)
```

---

## Call Flow Comparison

### Before: Each Service Has Own apiFetch

```
┌──────────────┐          ┌──────────────┐
│ Component    │──────────│ authService  │
└──────────────┘   call   │              │
                           │ apiFetch()   │────┐
                           └──────────────┘    │
                                               │ fetch()
┌──────────────┐          ┌──────────────┐    │
│ Component    │──────────│clientService │    │
└──────────────┘   call   │              │    │
                           │ apiFetch()   │────┤
                           └──────────────┘    │
                                               │
┌──────────────┐          ┌──────────────┐    ▼
│ Component    │──────────│invoiceService│   API
└──────────────┘   call   │              │
                           │ apiFetch()   │────┘
                           └──────────────┘

Problem: 8 identical apiFetch implementations
```

### After: All Services Share apiFetch

```
┌──────────────┐          ┌──────────────┐
│ Component    │──────────│ authService  │
└──────────────┘   call   └──────────────┘
                                  │
┌──────────────┐          ┌──────────────┐
│ Component    │──────────│clientService │
└──────────────┘   call   └──────────────┘
                                  │
┌──────────────┐          ┌──────────────┐    ┌───────────────┐
│ Component    │──────────│invoiceService│────│ lib/apiFetch  │────► API
└──────────────┘   call   └──────────────┘    │               │
                                  │            │ Single source │
                          (8 services)         │ of truth      │
                                  │            └───────────────┘
                                  │
                           (all import)

Solution: Single canonical implementation
```

---

## Type Safety Improvement

### Before: Inconsistent Types

```typescript
// clientService.ts
return (await res.json().catch(() => ({}))) as any  // ❌ Unsafe

// authService.ts
return (await res.json().catch(() => ({}))) as Record<string, unknown>  // ✅ Safe

// invoiceService.ts
return (await res.json().catch(() => ({}))) as Record<string, unknown>  // ✅ Safe
```

**Problem**: Mixed use of `any` vs proper types

### After: Consistent Safe Types

```typescript
// lib/apiFetch.ts
export const apiFetch = async (
  path: string,
  init?: RequestInit
): Promise<Record<string, unknown>> => {  // ✅ Always type-safe
  // ...
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

// All 8 services
const data = await apiFetch('/api/clients')  // ✅ Type: Record<string, unknown>
```

**Solution**: Single type-safe implementation used everywhere

---

## Edge Cases: Keep Using Raw Fetch

These operations **do NOT use** `apiFetch` because they need special handling:

```
┌─────────────────────────────────────────────────────────────┐
│  Operations That Use Raw fetch()                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. FormData Uploads ⚠️                                      │
│     ┌─────────────────────────────────────┐                 │
│     │ expenseService.createExpense()      │                 │
│     │   - Receipt file upload             │                 │
│     │   - Uses: new FormData()            │                 │
│     └─────────────────────────────────────┘                 │
│     ┌─────────────────────────────────────┐                 │
│     │ templateService.uploadLogo()        │                 │
│     │   - Logo file upload                │                 │
│     │   - Uses: new FormData()            │                 │
│     └─────────────────────────────────────┘                 │
│                                                               │
│  2. Blob Responses ⚠️                                        │
│     ┌─────────────────────────────────────┐                 │
│     │ templateService.previewBlobUrl()    │                 │
│     │   - PDF preview download            │                 │
│     │   - Uses: res.blob()                │                 │
│     └─────────────────────────────────────┘                 │
│                                                               │
│  3. 204 No Content ⚠️                                        │
│     ┌─────────────────────────────────────┐                 │
│     │ templateService.deleteLogo()        │                 │
│     │   - DELETE returns no body          │                 │
│     │   - Checks: res.status !== 204      │                 │
│     └─────────────────────────────────────┘                 │
│                                                               │
│  4. EventSource (SSE) ⚠️                                     │
│     ┌─────────────────────────────────────┐                 │
│     │ invoiceService.subscribe()          │                 │
│     │   - Server-Sent Events              │                 │
│     │   - Uses: new EventSource()         │                 │
│     └─────────────────────────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

⚠️ These methods are CORRECTLY using raw fetch and should NOT be modified.
```

---

## Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│  After Each Service File Update                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. TypeScript Check                                         │
│     ┌─────────────────────────────────┐                     │
│     │ pnpm exec tsc --noEmit          │                     │
│     └─────────────────────────────────┘                     │
│                    │                                         │
│                    ▼                                         │
│               ✅ No errors?                                  │
│                    │                                         │
│  2. ESLint Check   ▼                                         │
│     ┌─────────────────────────────────┐                     │
│     │ pnpm lint                       │                     │
│     └─────────────────────────────────┘                     │
│                    │                                         │
│                    ▼                                         │
│               ✅ 0 errors/warnings?                          │
│                    │                                         │
│  3. Visual Diff    ▼                                         │
│     ┌─────────────────────────────────┐                     │
│     │ git diff <file>.ts              │                     │
│     └─────────────────────────────────┘                     │
│                    │                                         │
│                    ▼                                         │
│               ✅ Expected pattern?                           │
│                    │                                         │
│                    ▼                                         │
│            NEXT FILE ───────────┐                           │
│                                  │                           │
│  After All 8 Files               ▼                           │
│     ┌─────────────────────────────────┐                     │
│     │ Full Build + Tests               │                     │
│     │ Manual Smoke Tests               │                     │
│     └─────────────────────────────────┘                     │
│                    │                                         │
│                    ▼                                         │
│               ✅ All pass?                                   │
│                    │                                         │
│                    ▼                                         │
│               COMMIT ✅                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Git Diff Pattern (Expected)

For each service file, the diff should look like this:

```diff
 import type { Client } from '../types/invoice'
+import { apiFetch } from '../lib/apiFetch'

-const apiFetch = async (path: string, init?: RequestInit) => {
-  const res = await fetch(path, {
-    ...init,
-    headers: {
-      'Content-Type': 'application/json',
-      ...(init?.headers ?? {}),
-    },
-    credentials: 'include',
-  })
-  if (!res.ok) {
-    const body = (await res.json().catch(() => null)) as any
-    const message = body?.error || body?.message || res.statusText
-    throw new Error(message)
-  }
-  return (await res.json().catch(() => ({}))) as any
-}
-
 class ClientService {
   async listClients(): Promise<Client[]> {
```

**Key Signs of Correct Diff**:
- ✅ One import line added (+1)
- ✅ Entire apiFetch function removed (-15 to -20 lines)
- ✅ Empty line removed (-1)
- ✅ Class definition unchanged (no diff)
- ✅ All methods unchanged (no diff)

**Signs of INCORRECT Diff**:
- ❌ Service methods modified
- ❌ Call sites changed
- ❌ Type assertions changed
- ❌ More than just import + function removal

---

## Success Visual

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Refactoring Complete                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Before:                                                      │
│    8 service files × ~15-20 lines each = ~120 lines          │
│    ❌ Duplication                                            │
│    ❌ Inconsistent types (some use 'any')                   │
│    ❌ Hard to maintain                                       │
│                                                               │
│  After:                                                       │
│    1 shared utility = 42 lines (with docs)                   │
│    ✅ Single source of truth                                 │
│    ✅ Type-safe everywhere                                   │
│    ✅ Easy to maintain                                       │
│                                                               │
│  Net Change: -89 lines (-9.6%)                               │
│                                                               │
│  Quality Metrics:                                             │
│    ✅ 0 TypeScript errors                                    │
│    ✅ 0 ESLint errors/warnings                               │
│    ✅ All 98 tests passing                                   │
│    ✅ Production build successful                            │
│    ✅ Smoke tests passing                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

**Visual Guide Complete** ✅

Use this guide alongside:
- `REFACTOR_PLAN_APIFETCH.md` - Full design details
- `ORCHESTRATOR_INSTRUCTIONS.md` - Step-by-step execution
- `REFACTOR_SUMMARY.md` - Executive summary
