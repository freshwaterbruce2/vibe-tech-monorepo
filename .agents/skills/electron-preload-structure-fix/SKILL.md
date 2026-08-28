---
name: electron-preload-structure-fix
description: Fix object nesting in Electron preload contextBridge so exposed APIs like window.electron.db are accessible in the renderer
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: '1.0.0'
  generated_from: learning_system_success_pattern_analysis
  success_rate: 0.99
  category: software-development
  source_pattern: electron_preload_structure_fix
  executions_analyzed: 3
  language: typescript
---

# Electron Preload Structure Fix

**Auto-generated from 3 successful fixes with 99% success rate**

## Overview

This skill fixes the most common Electron preload mistake: APIs exposed via `contextBridge.exposeInMainWorld` end up nested under the wrong property, causing `window.electron.db` (or similar) to be `undefined` in the renderer. The fix is to ensure each exposed API is a sibling at the top level of the `electron` object, and that TypeScript definitions match the actual runtime structure.

## Core Capabilities

### 1. Diagnose Missing API in Renderer

```typescript
// In renderer DevTools
console.log(window.electron);
// Expected: { storage: {...}, db: {...} }
// Bug:      { storage: { db: {...} } }  or  { storage: {...} }  (db missing)
```

### 2. Correct Preload Structure

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Each API is a sibling at the top level
  storage: {
    getItem: (key: string) => ipcRenderer.invoke('storage:getItem', key),
    setItem: (key: string, value: string) => ipcRenderer.invoke('storage:setItem', key, value),
  },
  db: {
    query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  },
});
```

### 3. Match TypeScript Definitions

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

## Common Bug Patterns

### Bug: Nested `db` inside `storage`

```typescript
// WRONG
contextBridge.exposeInMainWorld('electron', {
  storage: {
    getItem: ...,
    setItem: ...,
    db: { query: ... },
  },
});
```

### Bug: Mismatched interface

```typescript
// WRONG: interface says db exists, but preload doesn't expose it
export interface WindowElectron {
  storage: { ... };
  // db missing here
}
```

### Bug: Using `ipcRenderer` directly in renderer

```typescript
// WRONG: renderer should not import electron directly
import { ipcRenderer } from 'electron';
ipcRenderer.invoke('db:query', sql);
```

## Usage Examples

### Example 1: Fix a nested preload

```typescript
// Before
contextBridge.exposeInMainWorld('electron', {
  storage: {
    getItem: ...,
    setItem: ...,
    db: { query: ... },  // nested!
  },
});

// After
contextBridge.exposeInMainWorld('electron', {
  storage: {
    getItem: ...,
    setItem: ...,
  },
  db: { query: ... },  // sibling!
});
```

### Example 2: Add a missing API

```typescript
// Add db API alongside storage
contextBridge.exposeInMainWorld('electron', {
  storage: { ... },
  db: {
    query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  },
});
```

## Integration with Monorepo

- **Preload**: `apps/<app>/electron/preload.ts`
- **Types**: `apps/<app>/src/types/electron.d.ts`
- **Renderer usage**: `apps/<app>/src/**/*.tsx`
- **Validation**: `pnpm typecheck` + launch app + check `window.electron` in DevTools

## Safety Measures

1. **Runtime check**: Always verify `window.electron.<api>` exists in renderer DevTools
2. **Type parity**: Every key in `WindowElectron` must be exposed in preload
3. **No direct imports**: Renderer must never `import { ipcRenderer } from 'electron'`
4. **Atomic changes**: Fix preload and types in the same commit to avoid mismatches

## Rules Enforcement

- ✅ Keep exposed APIs as siblings at the top level
- ✅ Update `WindowElectron` interface for every exposed API
- ✅ Test with `window.electron?.db` guard in renderer
- ❌ NO nested APIs inside unrelated groups
- ❌ NO renderer imports from `electron`
- ❌ NO type definitions without matching preload exposure

## Related Skills

- `electron-ipc-conversion` — convert better-sqlite3 to IPC pattern
- `structured-logger-migration` — structured logging setup
- `powershell-operations` — Electron build scripts

## Generation Metadata

- **Source**: Learning system success_patterns table
- **Pattern**: electron_preload_structure_fix
- **Language**: TypeScript
- **Total Executions**: 3
- **Success Rate**: 99%
- **Recommended Approach**: "Fix object nesting in preload contextBridge to expose APIs correctly"
- **Last Analyzed**: 2026-04-16
- **Confidence**: 0.99
