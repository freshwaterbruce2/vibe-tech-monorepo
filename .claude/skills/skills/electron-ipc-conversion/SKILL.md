---
name: electron-ipc-conversion
description: Convert renderer-process better-sqlite3 calls to the Electron IPC pattern window.electron.db.query(sql, params). Triggers on "renderer is calling better-sqlite3 directly", "module is not defined in renderer", "convert sqlite to IPC", "electron db IPC", "contextBridge db", or any crash caused by native modules being imported in the renderer bundle.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
use_when:
  - A renderer file imports better-sqlite3 or new Database() directly
  - You see "module is not defined" or "Cannot find module 'better-sqlite3'" in the renderer console
  - A component or service calls SQLite synchronously from the renderer process
  - You are adding database access to a new renderer service in an Electron app
  - A code review flags native-module usage in a renderer bundle
avoid_when:
  - The file is in the Electron main process (src-electron/, electron/, main.ts outside src/)
  - The project is Tauri (use invoke('db_execute_query', ...) instead)
  - The project is a pure web app with no Electron context
  - The existing code already uses window.electron.db.query and is working correctly
---

# Electron IPC Conversion

> Renderer processes cannot load native Node modules. Move all SQLite access to the main process and call it through the preload bridge: `window.electron.db.query(sql, params)`.

---

## Pattern Overview

This pattern was observed 5 times with confidence 1.0 in `apps/vibe-code-studio` (recorded in `D:\databases\agent_learning.db`, pattern id 2). The root cause is always the same: a renderer file imports or instantiates `better-sqlite3` directly, which crashes because Node's native module loader is not available in a renderer context.

**The canonical call site (correct IPC pattern):**

```typescript
// In renderer process (src/**/*.ts, src/**/*.tsx)
const result = await window.electron.db.query(
  'SELECT * FROM chat_messages WHERE workspace_path = ? LIMIT ?',
  [workspacePath, limit]
);
if (result.success && Array.isArray(result.data)) {
  return result.data as ChatMessage[];
}
```

**The anti-pattern that breaks builds:**

```typescript
// WRONG — crashes renderer with "module is not defined"
import Database from 'better-sqlite3';
const db = new Database('D:\\databases\\database.db');
const rows = db.prepare('SELECT * FROM chat_messages WHERE workspace_path = ?').all(workspacePath);
```

**What happens in the main process (do not modify this):**

The Electron main process hosts `better-sqlite3` and exposes it via `contextBridge` in `preload.cjs`. The `window.electron.db` object is the IPC proxy — every method is async and returns `{ success: boolean; data: unknown; error?: string }`.

**Evidence in this codebase:**

| File | Conversion state | Notes |
|------|-----------------|-------|
| `src/services/DatabaseService.ts` | Completed | Uses `this.edb.query(sql, params)` via `ElectronDbProxy`; comment "DO NOT import better-sqlite3 directly in renderer" |
| `src/components/Justice/BrainScan.tsx` | Mixed — partial | Uses `window.electron.db.getPatterns()` (correct) but also `window.electron.ipcRenderer.invoke('db:savePattern', ...)` (legacy channel, should migrate to `window.electron.db.query`) |
| `src/types/electron.d.ts` | Type definitions | `WindowElectron.db` is typed with `query`, `initialize`, `execute`, `close`, `getPatterns` |
| `src/services/tauriShim.ts` | Tauri shim | Routes `ipcRenderer.invoke('db:query', ...)` to `invoke('db_execute_query', ...)` for Tauri builds |

---

## When to Apply

Apply this pattern when:

- Webpack/Vite/esbuild bundles a file that imports `better-sqlite3` into the renderer chunk
- The app crashes at startup with `Uncaught Error: Module not found: 'better-sqlite3'` or similar native module errors
- A new service needs database access and the developer is unsure whether to use IPC or direct import
- A code review or lint rule (`electron-security/no-native-module-in-renderer`) fires on a renderer file
- You find any `require('better-sqlite3')` or `import Database from 'better-sqlite3'` outside the `electron/` or `src-electron/` directories

**Do not apply when:**

- The file is already inside `electron/` or `src-electron/` — those run in the main process and can use `better-sqlite3` directly
- The project uses Tauri — use `invoke('db_execute_query', { sql, queryParams })` instead
- The call already routes through `window.electron.db.query` and is working

---

## Step 1 — Locate All Renderer SQLite Calls

```bash
# Find any direct better-sqlite3 import outside the main process folders
grep -rn "better-sqlite3\|new Database(" \
  apps/vibe-code-studio/src \
  --include="*.ts" --include="*.tsx" \
  | grep -v "__tests__" | grep -v "\.test\."

# Find legacy ipcRenderer.invoke for db channels (should migrate to window.electron.db)
grep -rn "ipcRenderer\.invoke\|ipc\.invoke" \
  apps/vibe-code-studio/src \
  --include="*.ts" --include="*.tsx" \
  | grep "db:"
```

Expected output for a clean codebase: none. Any match is a conversion candidate.

---

## Step 2 — Understand the IPC Proxy Shape

The preload bridge exposes `window.electron.db` with these methods. Read `src/types/electron.d.ts` to confirm the current shape before writing any code:

```typescript
// From src/types/electron.d.ts
window.electron.db = {
  // Run any SQL (INSERT, UPDATE, DELETE, SELECT)
  query(sql: string, params?: unknown[]): Promise<{
    success: boolean;
    data: unknown;         // RunResult for write ops; Row[] for SELECT
    error?: string;
  }>;

  // Initialize the main-process database connection
  initialize(): Promise<{ success: boolean; error?: string }>;

  // Run a write statement (alias for query on non-SELECT SQL)
  execute(sql: string, params?: unknown[]): Promise<{
    success: boolean;
    data: unknown;
    error?: string;
  }>;

  // Close the database (call on app quit)
  close(): Promise<void>;

  // Fetch strategy_memory patterns (domain-specific method)
  getPatterns(): Promise<{ patterns: Pattern[] }>;
};
```

---

## Step 3 — Replace Direct SQLite Calls

### Before (broken renderer code)

```typescript
import Database from 'better-sqlite3';  // ← crashes renderer

const db = new Database('D:\\databases\\database.db');

function getHistory(workspace: string): ChatMessage[] {
  return db.prepare(
    'SELECT * FROM chat_messages WHERE workspace_path = ? ORDER BY timestamp DESC LIMIT 100'
  ).all(workspace) as ChatMessage[];
}
```

### After (correct IPC code)

```typescript
// No import of better-sqlite3 — it stays in the main process

async function getHistory(workspace: string): Promise<ChatMessage[]> {
  if (!window.electron?.db) {
    // Graceful degradation: fall back to localStorage in web/Tauri mode
    return [];
  }
  const result = await window.electron.db.query(
    'SELECT * FROM chat_messages WHERE workspace_path = ? ORDER BY timestamp DESC LIMIT 100',
    [workspace]
  );
  if (!result.success || !Array.isArray(result.data)) {
    return [];
  }
  return result.data as ChatMessage[];
}
```

### Key differences

| Property | Direct (broken) | IPC (correct) |
|----------|----------------|---------------|
| Synchronous? | Yes — `.all()`, `.get()`, `.run()` | No — always `await` |
| Return type | Row object directly | `{ success, data, error }` wrapper |
| Error handling | `try/catch` on sync call | Check `result.success` |
| Availability guard | None needed in main process | `window.electron?.db` optional chain |
| Module import | `import Database from 'better-sqlite3'` | None in renderer |

---

## Step 4 — Migrate Legacy `ipcRenderer.invoke` DB Calls

Some older code uses `window.electron.ipcRenderer.invoke('db:savePattern', ...)`. These are routed through `tauriShim.ts` for Tauri compatibility but should be migrated to the structured `window.electron.db.query` API for consistency.

```typescript
// BEFORE — legacy channel call
await window.electron.ipcRenderer.invoke('db:savePattern', {
  pattern: newPattern,
  tags: 'user-override'
});

// AFTER — structured IPC proxy
await window.electron.db.query(
  'INSERT INTO strategy_memory (pattern_hash, pattern_data, success_rate, usage_count, created_at) VALUES (?, ?, ?, ?, ?)',
  [hashPattern(newPattern), newPattern, 0, 0, new Date().toISOString()]
);
```

---

## Step 5 — Guard Against Web / Tauri Mode

Every renderer call to `window.electron.db` must gracefully degrade when the app runs in a browser or Tauri context. The pattern used by `DatabaseService.ts`:

```typescript
// Detect mode once at service initialization
private detectElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electron?.isElectron;
}

// Use guard in every method
async query(sql: string, params?: unknown[]): Promise<unknown[]> {
  if (!this.isElectron || !window.electron?.db) {
    // Web/Tauri fallback — return empty or throw with clear message
    return [];
  }
  const result = await window.electron.db.query(sql, params);
  if (!result.success) {
    logger.error('[DatabaseService] query failed:', result.error);
    return [];
  }
  return Array.isArray(result.data) ? (result.data as unknown[]) : [];
}
```

---

## Step 6 — Verify No Renderer Bundle Contains Native Modules

After converting all calls, verify the renderer build does not bundle `better-sqlite3`:

```bash
# Build and check for native module references in renderer chunk
pnpm --filter vibe-code-studio build 2>&1 | grep -i "better-sqlite3\|native module"

# If using Vite, check rollup output for node: externals
grep -r "better-sqlite3" apps/vibe-code-studio/dist/ 2>/dev/null | head -5
# Expected: no output
```

---

## Decision Table

| Situation | Action |
|-----------|--------|
| File is in `src/` (renderer) and imports `better-sqlite3` | Convert to `window.electron.db.query` |
| File is in `electron/` or `src-electron/` (main) and imports `better-sqlite3` | Leave as-is |
| File uses `ipcRenderer.invoke('db:*', ...)` | Migrate to `window.electron.db.query` for consistency |
| Tauri build: need database query from renderer | Use `invoke('db_execute_query', { sql, queryParams })` |
| Web build: need database from renderer | Use `localStorage` or `IndexedDB` fallback |
| Need to add a new domain-specific method (e.g. `getPatterns`) | Add handler to main process, expose via `contextBridge`, update `src/types/electron.d.ts` |
| `window.electron?.db` returns undefined | The preload is not loading — check `preload.cjs` path in `vite.config.ts` or `electron-builder.yml` |

---

## Anti-Patterns

**Never import better-sqlite3 in renderer:**

```typescript
// NEVER in src/**/*.ts or src/**/*.tsx
import Database from 'better-sqlite3';
const db = new Database(path);
```

**Never hardcode the database path in renderer:**

```typescript
// WRONG — path is an implementation detail of the main process
const result = await window.electron.db.query(sql, ['D:\\databases\\database.db']);
// CORRECT — path is configured in main process, renderer never sees it
const result = await window.electron.db.query(sql, [workspacePath]);
```

**Never call synchronous SQLite methods from async IPC:**

```typescript
// WRONG — db.query is async, cannot call .all() on the result
const rows = (await window.electron.db.query(sql, params)).all();
// CORRECT — result.data is already the row array
const rows = (await window.electron.db.query(sql, params)).data as Row[];
```

**Never omit the `result.success` check:**

```typescript
// RISKY — silently returns undefined if query fails
const data = (await window.electron.db.query(sql, params)).data;
// SAFE — explicit check, log on failure
const result = await window.electron.db.query(sql, params);
if (!result.success) {
  logger.error('[MyService] query failed:', result.error);
  return fallback;
}
const data = result.data;
```

---

## Checklist

Before marking the conversion complete:

- [ ] No `import ... from 'better-sqlite3'` in any `src/` renderer file
- [ ] No `new Database(...)` constructor call in any `src/` renderer file
- [ ] All `ipcRenderer.invoke('db:...')` calls migrated to `window.electron.db.query`
- [ ] Every `window.electron.db.query` call awaited (it is async)
- [ ] Every call checks `result.success` before using `result.data`
- [ ] Every call guarded with `window.electron?.db` optional chain for web/Tauri compatibility
- [ ] `src/types/electron.d.ts` updated if new db methods were added to the preload
- [ ] `pnpm --filter vibe-code-studio build` passes with no native module warnings
- [ ] New code has no `@ts-expect-error` comments hiding type mismatches on the db proxy
- [ ] If legacy `ipcRenderer.invoke` calls were removed, verify `tauriShim.ts` still handles the channel for Tauri parity (or remove the dead shim branch)

---

## Session Integration

When starting work in `apps/vibe-code-studio`:

1. Run the grep from Step 1 to identify any unconverted renderer SQLite calls
2. Read `src/types/electron.d.ts` to confirm the current `window.electron.db` shape
3. Check that `DatabaseService.ts` is used as the singleton rather than calling `window.electron.db` directly from components (single point of database access)
4. If adding a new db operation, add it through `DatabaseService` — do not scatter `window.electron.db.query` across components

The `DatabaseService` singleton (`databaseService`) is the correct abstraction: it handles Electron vs. web fallback, manages the connection lifecycle, and logs errors consistently. Call `databaseService.saveChatMessage(...)` etc., not `window.electron.db.query(...)` directly from components.
