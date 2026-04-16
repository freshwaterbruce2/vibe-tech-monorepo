# Electron IPC Conversion — Test Scenarios

These scenarios validate that an agent applying the electron-ipc-conversion skill follows the correct workflow. Each scenario describes the setup, expected agent actions, and observable outcomes confirming compliance.

---

## Scenario 1 — Renderer Direct Import Detection

**Setup:** A new service file `apps/vibe-code-studio/src/services/AnalyticsDB.ts` contains:

```typescript
import Database from 'better-sqlite3';
const db = new Database('D:\\databases\\database.db');
export function logAnalytics(event: string) {
  db.prepare('INSERT INTO events (type) VALUES (?)').run(event);
}
```

**Correct agent behavior:**

1. Run grep to confirm `better-sqlite3` import is in a renderer file (path is under `src/`)
2. Check `src/types/electron.d.ts` to confirm the `window.electron.db` shape
3. Rewrite `AnalyticsDB.ts` to use `window.electron.db.query` with `async/await`
4. Add `window.electron?.db` optional chain guard
5. Add `result.success` check before using `result.data`

**Observable outcomes:**

- No `import Database from 'better-sqlite3'` in the converted file
- New function is `async` and returns `Promise<void>`
- `await window.electron.db.query(...)` replaces `.prepare(...).run(...)`
- Guard present: `if (!window.electron?.db) { return; }`

**Failure signal:** Agent keeps the `better-sqlite3` import and adds IPC on top of it, creating a mixed-mode file.

---

## Scenario 2 — IPC Proxy Query Result Handling

**Setup:** Converted code reads:

```typescript
const result = await window.electron.db.query('SELECT * FROM events', []);
return result.data; // missing success check
```

**Correct agent behavior:**

1. Identify missing `result.success` check
2. Add guard: `if (!result.success) { logger.error(...); return []; }`
3. Type-assert `result.data` as the expected row array type

**Observable outcomes:**

- `result.success` checked before `result.data` is accessed
- Error logged on failure path using `logger.error` (not `console.error`)
- Return type is the domain type, not `unknown`

**Failure signal:** Agent leaves `result.data` access without the success guard, which silently returns `undefined` on query errors.

---

## Scenario 3 — Mode Detection: Electron vs. Web

**Setup:** A new hook `useUserSettings.ts` is being written. It needs to read/write settings both in Electron (SQLite) and in a web browser (localStorage).

**Correct agent behavior:**

1. Detect mode: `const isElectron = typeof window !== 'undefined' && !!window.electron?.isElectron`
2. In Electron path: use `window.electron.db.query('SELECT value FROM settings WHERE key = ?', [key])`
3. In web path: use `localStorage.getItem('setting_' + key)` with `eslint-disable-next-line` for the `electron-security/no-localstorage-electron` rule
4. Wrap both paths in a shared async function

**Observable outcomes:**

- Single `isElectron` detection at the top of the hook
- Both code paths implemented (no TODO or stub for web mode)
- ESLint disable comment on localStorage usage if in Electron context

**Failure signal:** Agent implements only the Electron path and leaves a TODO for web mode, violating the no-placeholder-code rule.

---

## Scenario 4 — Legacy `ipcRenderer.invoke` Migration

**Setup:** `apps/vibe-code-studio/src/components/Justice/BrainScan.tsx` line 43 contains:

```typescript
// @ts-expect-error - legacy database API
await window.electron.ipcRenderer.invoke('db:savePattern', { pattern: newPattern, tags: 'user-override' });
```

**Correct agent behavior:**

1. Read `src/types/electron.d.ts` to find the `window.electron.db.query` shape
2. Determine the correct SQL for the `strategy_memory` table (from `DatabaseService.ts`)
3. Replace the `ipcRenderer.invoke` call with `window.electron.db.query(sql, params)`
4. Remove the `@ts-expect-error` comment (the new call is fully typed)
5. Verify `tauriShim.ts` still handles `'db:savePattern'` channel for Tauri parity OR remove the dead branch if no Tauri support is needed

**Observable outcomes:**

- `ipcRenderer.invoke('db:savePattern', ...)` removed
- `window.electron.db.query(...)` with correct INSERT SQL in its place
- `@ts-expect-error` comment removed
- TypeScript compiles without errors on that file

**Failure signal:** Agent migrates the call but leaves the `@ts-expect-error` comment, hiding future type errors.

---

## Scenario 5 — Tauri Build: Do Not Convert

**Setup:** `apps/vibe-code-studio/src/services/tauriShim.ts` contains:

```typescript
case 'db:query':
  return await invoke('db_execute_query', { sql: args[0], queryParams: args[1] });
```

**Correct agent behavior:**

1. Recognize this file is the Tauri shim — it does NOT use `window.electron.db.query`
2. Leave this file unchanged
3. Do NOT replace the `invoke('db_execute_query', ...)` call with `window.electron.db.query`

**Observable outcomes:**

- `tauriShim.ts` is NOT modified
- Agent notes this is in the Tauri path and outside the conversion scope

**Failure signal:** Agent applies the Electron IPC pattern to the Tauri shim, breaking all Tauri database calls.

---

## Scenario 6 — TypeScript Type Safety

**Setup:** A converted file calls:

```typescript
const result = await window.electron.db.query(sql, params);
const rows = result.data as any[]; // typed as any
```

**Correct agent behavior:**

1. Define a proper interface for the row type (e.g., `interface EventRow { id: number; type: string; timestamp: string; }`)
2. Replace `any[]` with `EventRow[]`
3. Confirm `src/types/electron.d.ts` `window.electron.db.query` returns `Promise<{ success: boolean; data: unknown; error?: string }>` (not `any`)
4. Use TypeScript type guards or assertions, not `as any`

**Observable outcomes:**

- No `as any` casts on the result data
- Row type interface defined near the usage
- TypeScript strict mode passes on the file

**Failure signal:** Agent keeps `result.data as any[]` to avoid defining a row type, which defeats TypeScript's value.

---

## Scenario 7 — Concurrent Queries

**Setup:** A service needs to run three queries in parallel at startup:

```typescript
const chatHistory = await window.electron.db.query('SELECT * FROM chat_messages LIMIT 10', []);
const settings = await window.electron.db.query('SELECT * FROM settings', []);
const events = await window.electron.db.query('SELECT * FROM analytics_events LIMIT 20', []);
```

**Correct agent behavior:**

1. Use `Promise.all` to parallelize the three queries
2. Check each result's `success` independently (one failure should not suppress others)
3. Handle partial failure gracefully (return empty array for failed query, not throw)

**Observable outcomes:**

- Three queries wrapped in `Promise.all([...])`
- Each destructured result checked for `success` separately
- No single-point-of-failure: one failing query returns `[]` for that result only

**Failure signal:** Agent leaves sequential `await` calls, which is correct but not the agent's job to flag as a mistake — only flag if agent introduces `Promise.all` without checking individual `result.success` flags.

---

## Scenario 8 — Build Bundle Verification

**Setup:** After converting all renderer files, the Vite build outputs a renderer chunk.

**Correct agent behavior:**

1. Run `pnpm --filter vibe-code-studio build`
2. If build warns about native modules or `better-sqlite3` in renderer chunk, trace back to unconverted import
3. Run `grep -r "better-sqlite3" apps/vibe-code-studio/dist/ 2>/dev/null` — expect no output
4. Confirm the `window.electron.db.query` calls compile without TypeScript errors

**Observable outcomes:**

- Build succeeds with no `better-sqlite3` in renderer output
- No `Module not found: 'better-sqlite3'` error in build log
- TypeScript build (`pnpm --filter vibe-code-studio build`) exits 0

**Failure signal:** Agent marks conversion complete without running the build verification step. Native module leak is discovered later at runtime.
