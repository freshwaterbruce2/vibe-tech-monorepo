---
name: electron-ipc-conversion
description: Convert renderer better-sqlite3 direct calls to Electron IPC pattern window.electron.db.query(sql, params)
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: '1.0.0'
  generated_from: learning_system_success_pattern_analysis
  success_rate: 1.0
  category: software-development
  source_pattern: electron_ipc_conversion
  executions_analyzed: 6
  language: typescript
---

# Electron IPC Conversion

**Auto-generated from 6 successful conversions with 100% success rate**

## Overview

This skill captures the proven pattern for migrating Electron renderer processes from direct `better-sqlite3` calls to a safe IPC pattern. Direct database access from the renderer is a security violation in modern Electron; the main process should own the database and expose a typed IPC API.

The conversion follows: identify direct `better-sqlite3` usage in renderer → move handlers to main process → expose `window.electron.db.query(sql, params)` via `contextBridge` → update TypeScript definitions → verify the app launches and queries work.

## Core Capabilities

### 1. Identify Direct Database Calls in Renderer

```bash
# Search for better-sqlite3 imports in renderer/source code
Grep -i "better-sqlite3" path="apps/*/src" glob="*.ts"
Grep -i "new Database" path="apps/*/src" glob="*.ts"
Grep -i "db.prepare" path="apps/*/src" glob="*.ts"
```

### 2. Create Main-Process Database Handler

```typescript
// electron/main/database-handler.ts
import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database(join(process.env.DATABASE_PATH || './data.db'));

ipcMain.handle('db:query', async (_event, sql: string, params: unknown[] = []) => {
  try {
    const stmt = db.prepare(sql);
    const isSelect = /\bSELECT\b/i.test(sql.trim());
    const rows = isSelect ? stmt.all(...params) : stmt.run(...params);
    return { success: true, rows };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
```

### 3. Expose IPC API in Preload

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  storage: {
    /* existing storage APIs */
  },
  db: {
    query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  },
});
```

### 4. Update TypeScript Definitions

```typescript
// src/types/electron.d.ts
export interface WindowElectron {
  storage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
  };
  db: {
    query: (
      sql: string,
      params?: unknown[],
    ) => Promise<{ success: boolean; rows?: unknown[]; error?: string }>;
  };
}

declare global {
  interface Window {
    electron: WindowElectron;
  }
}
```

### 5. Convert Renderer Usage

```typescript
// Before: direct better-sqlite3 in renderer
import Database from 'better-sqlite3';
const db = new Database('./data.db');
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// After: IPC call
const { success, rows, error } = await window.electron.db.query(
  'SELECT * FROM users WHERE id = ?',
  [userId],
);
if (!success) throw new Error(error);
const user = rows?.[0];
```

## Usage Examples

### Example 1: Service migration

```bash
# 1. Find all direct db usage in a service
Grep "better-sqlite3\|new Database\|db.prepare" path="apps/my-app/src/services"

# 2. Move database logic to main-process handler
# Edit electron/main/database-handler.ts

# 3. Expose via preload
# Edit electron/preload.ts

# 4. Update service to use window.electron.db.query
# Edit src/services/DatabaseService.ts

# 5. Typecheck and test
pnpm typecheck
pnpm test --filter=my-app
```

### Example 2: Consistent response format

```typescript
// Use { success, rows, error } consistently across IPC boundary
async function getPatterns() {
  const result = await window.electron.db.query('SELECT * FROM patterns');
  if (!result.success) throw new Error(result.error);
  return result.rows ?? [];
}
```

### Example 3: Fixing preload object nesting

If `window.electron.db` is undefined, check that `db` is a sibling of `storage` in `contextBridge.exposeInMainWorld`, not nested inside `storage`:

```typescript
// Correct
contextBridge.exposeInMainWorld('electron', {
  storage: { ... },
  db: { query: ... },
});

// Incorrect
contextBridge.exposeInMainWorld('electron', {
  storage: { db: { query: ... } },
});
```

## Integration with Monorepo

- **Main handlers**: `apps/<app>/electron/main/database-handler.ts`
- **Preload**: `apps/<app>/electron/preload.ts`
- **Types**: `apps/<app>/src/types/electron.d.ts`
- **Renderer services**: `apps/<app>/src/services/*Service.ts`
- **Tests**: mock `window.electron.db.query` in vitest setup

## Safety Measures

1. **Security**: Renderer never touches the database file directly
2. **Type Safety**: `WindowElectron` interface must match preload exactly
3. **Response Format**: Always return `{ success, rows, error }` from handlers
4. **Parameterization**: Pass params array separately; never interpolate SQL
5. **Object Nesting**: Verify `db` is sibling to `storage` in preload
6. **Validation**: Run `pnpm typecheck` and launch the app after conversion

## Rules Enforcement

- ✅ Move all `better-sqlite3` usage to main process
- ✅ Use `ipcMain.handle` + `ipcRenderer.invoke` for async DB operations
- ✅ Return consistent `{ success, rows, error }` shape
- ✅ Update `WindowElectron` TypeScript definitions for every exposed method
- ❌ NO direct `better-sqlite3` imports in renderer code
- ❌ NO synchronous `ipcRenderer.sendSync` for database calls
- ❌ NO SQL string interpolation in renderer

## Related Skills

- `structured-logger-migration` — migrate console.\* to structured logger
- `powershell-operations` — safe PowerShell for Electron builds
- `workflow-dead-code-sweep` — remove dead code after refactor

## Generation Metadata

- **Source**: Learning system success_patterns table
- **Pattern**: electron_ipc_conversion
- **Language**: TypeScript
- **Total Executions**: 6
- **Success Rate**: 100%
- **Recommended Approach**: "Convert renderer better-sqlite3 calls to IPC pattern: window.electron.db.query(sql, params)"
- **Last Analyzed**: 2026-04-16
- **Confidence**: 1.0
