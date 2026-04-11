# No Mock, Temporary, or Placeholder Code

Priority: MANDATORY
Scope: All production code — applies to any AI agent (Claude, Gemini, Augment, Codex, etc.)

---

## Core Rule

**Never write mock, temporary, or placeholder code in production files.**

Every line of code written must be real, complete, and production-ready. If something cannot be fully implemented right now, say so — do not paper over it with fake code.

---

## Prohibited Patterns

The following are never acceptable outside of test files:

**Placeholder logic:**
```ts
// TODO: implement this
function processPayment() { return true; }

// Hardcoded stub
const user = { id: 1, name: 'Test User' };

// Fake delay standing in for real work
await sleep(1000);
return { success: true };
```

**Mock data in production paths:**
```ts
// "temporary" hardcoded response
const data = [{ id: 1, title: 'Placeholder item' }];

// Fake API response
return { status: 200, body: 'OK' };
```

**Deferred implementation markers:**
```ts
throw new Error('Not implemented');
console.log('TODO: connect to real API');
return null; // placeholder
```

**Commented-out stubs left in place:**
```ts
// Real implementation coming soon
// fetchFromDatabase(id)
return mockData;
```

---

## The Only Exception: Test Files

Mock code, stubs, and fake data are **required and correct** inside:
- `*.test.ts` / `*.test.tsx`
- `*.spec.ts` / `*.spec.tsx`
- `__tests__/` directories
- `tests/` directories
- Files that explicitly set up test fixtures

---

## Required Behavior

1. **Implement fully or not at all.** If a feature requires 5 steps, complete all 5. Do not implement 3 and stub the rest.

2. **If a real implementation is not yet possible** (e.g., waiting on an external API, a database schema, or a decision from the user), stop and say so explicitly. Do not write placeholder code as a stand-in.

3. **No TODO comments that defer real work.** A `// TODO` in production code means incomplete work was shipped. Fix it now or do not write it.

4. **No hardcoded values standing in for real logic.** Hardcoded IDs, fake responses, magic strings used as data — all prohibited.

5. **Remove all temporary code before finishing a task.** Debug logging, test values, and workarounds added during development must be cleaned up before the task is marked complete.

---

## When You Are Tempted to Write Placeholder Code

Ask instead:
- "I need X before I can implement this — should I pause here?"
- "This depends on a schema that doesn't exist yet. Should I create it first?"
- "Fully implementing this requires Y. Do you want me to proceed?"

Incomplete real work communicated honestly is always better than complete fake work silently shipped.
