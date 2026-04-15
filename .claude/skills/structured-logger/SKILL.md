---
name: structured-logger
description: Replace console.error/warn/log with a typed, structured logger utility in React/TypeScript apps. Environment-aware (silent in test, formatted in dev, always-on for errors), persists warn/error to a ring buffer for headless debugging. 1:1 drop-in for console.* calls. Triggers on requests like "replace console.log", "add a logger", "structured logging", "typed logger", or when audit reveals bare console.* calls in service files.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Structured Logger

> Eliminate raw `console.*` calls from production code. Replace with a typed, environment-aware logger that stays silent in tests, formats output in dev, and persists errors for headless (Capacitor/Android) debugging.

---

## Pattern Overview

The structured-logger pattern was extracted from the vibe-tutor refactor (`67e3f36`) where `console.error/warn/log` was replaced across 32 service files with a single utility at `apps/vibe-tutor/src/utils/logger.ts`.

**Core properties:**
- Four log levels: `debug`, `info`, `warn`, `error`
- `debug` and `info` are dev-only (stripped at build time via `import.meta.env.DEV`)
- `warn` and `error` are always active and written to a 50-entry ring buffer in persistent storage
- Exported as a plain object literal (not a class) — tree-shakeable, no instantiation
- Accepts variadic `...args: unknown[]` — 1:1 replacement for all `console.*` signatures
- Extra args JSON-serialized and truncated at 500 chars before storage

---

## When to Apply

Apply this pattern when you see any of these signals:

- `console.error(...)` or `console.warn(...)` in service/utility files
- `console.log(...)` used for runtime diagnostics in production paths
- Error information is lost because DevTools is not attached (Capacitor, Android WebView)
- No way to retrieve logged errors after a crash on a physical device
- Inconsistent logging — some files use `console`, others have ad-hoc wrappers

---

## Step 1 — Audit

Find all bare console calls in service and utility files:

```bash
# Find files with console.* in services
pnpm nx run vibe-tutor:lint 2>&1 | grep "no-console"

# Or grep directly
grep -rn "console\.\(log\|warn\|error\|debug\)" apps/vibe-tutor/src/services/
grep -rn "console\.\(log\|warn\|error\|debug\)" apps/vibe-tutor/src/utils/
```

---

## Step 2 — Create logger.ts

If the project does not have a logger utility, create one. Check first:

```bash
# Search before creating
grep -rn "export.*logger" apps/<project>/src/utils/
```

If none exists, create `src/utils/logger.ts`:

```typescript
/**
 * Production-safe logger.
 *
 * - debug/info: development only
 * - warn/error: always active; persisted to a 50-entry ring buffer in appStore
 *   so errors are retrievable even when DevTools is not attached (Android/Capacitor)
 *
 * Retrieve persisted errors:
 *   import { logger } from '@/utils/logger';
 *   const entries = logger.getLog();   // LogEntry[]
 *   logger.clearLog();
 */

import { appStore } from './electronStore';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: string;     // JSON-serialized, kept small
  timestamp: string;
}

const STORE_KEY = 'appErrorLog';
const BUFFER_SIZE = 50;
const isDev = import.meta.env.DEV;

function persist(level: LogLevel, message: string, extra?: unknown): void {
  try {
    const existing = appStore.get<LogEntry[]>(STORE_KEY) ?? [];
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(extra !== undefined && { data: JSON.stringify(extra).slice(0, 500) }),
    };
    existing.push(entry);
    if (existing.length > BUFFER_SIZE) {
      existing.splice(0, existing.length - BUFFER_SIZE);
    }
    appStore.set(STORE_KEY, existing);
  } catch {
    // Storage unavailable — fail silently to avoid infinite loops
  }
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
  },

  info(message: string, ...args: unknown[]): void {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    if (isDev) console.warn(`[WARN] ${message}`, ...args);
    persist('warn', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
  },

  error(message: string, ...args: unknown[]): void {
    // Always log errors — DevTools will show them when attached
    console.error(`[ERROR] ${message}`, ...args);
    persist('error', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
  },

  /** Retrieve persisted warn/error entries. */
  getLog(): LogEntry[] {
    return appStore.get<LogEntry[]>(STORE_KEY) ?? [];
  },

  /** Clear the persisted log. */
  clearLog(): void {
    appStore.delete(STORE_KEY);
  },
};
```

### Adapting to Projects Without appStore

If the target project does not use `electronStore`, replace the persistence back-end:

**localStorage fallback** (web-only apps):

```typescript
// Replace the persist() function body with:
function persist(level: LogLevel, message: string, extra?: unknown): void {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const existing: LogEntry[] = raw ? (JSON.parse(raw) as LogEntry[]) : [];
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(extra !== undefined && { data: JSON.stringify(extra).slice(0, 500) }),
    };
    existing.push(entry);
    if (existing.length > BUFFER_SIZE) {
      existing.splice(0, existing.length - BUFFER_SIZE);
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(existing));
  } catch {
    // Storage unavailable — fail silently
  }
}

// And update getLog/clearLog:
getLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
},
clearLog(): void {
  localStorage.removeItem(STORE_KEY);
},
```

**No persistence** (simple apps / SSR-safe):

```typescript
// Remove the persist() function entirely and simplify:
export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
  },
  info(message: string, ...args: unknown[]): void {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    if (isDev) console.warn(`[WARN] ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
```

---

## Step 3 — Migrate Services

For each service file with bare `console.*` calls:

### Import

Add at the top of the file (after other imports):

```typescript
import { logger } from '../utils/logger';
// or with path alias:
import { logger } from '@/utils/logger';
```

### Replace calls (1:1 mapping)

| Before | After |
|--------|-------|
| `console.log('msg', data)` | `logger.debug('msg', data)` |
| `console.info('msg', data)` | `logger.info('msg', data)` |
| `console.warn('msg', data)` | `logger.warn('msg', data)` |
| `console.error('msg', data)` | `logger.error('msg', data)` |

### Prefix convention

Tag log messages with the service name in square brackets for easy filtering:

```typescript
// Before
console.error('Failed to fetch homework:', error);

// After
logger.error('[HomeworkService] Failed to fetch homework:', error);
```

### Bulk migration script

For a large codebase, use a targeted sed-equivalent in PowerShell:

```powershell
# Preview changes
$files = Get-ChildItem -Path "apps/vibe-tutor/src/services" -Filter "*.ts" -Recurse
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match "console\.(log|warn|error|debug)") {
        Write-Host $f.FullName
    }
}

# Apply replacements (run one at a time, review after each)
(Get-Content $f.FullName -Raw) `
    -replace "console\.error\(", "logger.error(" `
    -replace "console\.warn\(",  "logger.warn("  `
    -replace "console\.log\(",   "logger.debug(" `
    -replace "console\.debug\(", "logger.debug(" |
Set-Content $f.FullName

# Then add import at top of file (verify it isn't already there)
```

---

## Step 4 — Silence in Tests

In Vitest config, mock the logger to prevent noisy output during test runs:

```typescript
// vitest.setup.ts
import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLog: vi.fn().mockReturnValue([]),
    clearLog: vi.fn(),
  },
}));
```

Or in the test file itself for selective silencing:

```typescript
import { logger } from '@/utils/logger';
import { vi, beforeEach } from 'vitest';

vi.spyOn(logger, 'error').mockImplementation(() => {});
vi.spyOn(logger, 'warn').mockImplementation(() => {});
```

---

## Step 5 — Verify

Run lint to confirm all `no-console` violations are resolved:

```bash
pnpm nx run <project>:lint
# or
pnpm run lint --filter <project>
```

Check TypeScript compiles cleanly:

```bash
pnpm nx run <project>:typecheck
```

---

## Anti-Patterns to Avoid

**Do not use a class with a static instance:**
```typescript
// Avoid — harder to mock in tests
class Logger {
  static error(msg: string) { ... }
}
export default Logger;
```

Use an object literal instead — easier to `vi.mock()` and tree-shake.

**Do not re-export console directly:**
```typescript
// Avoid
export const logger = console;
```

This bypasses environment-aware filtering and provides no persistence.

**Do not log sensitive data:**
```typescript
// Avoid
logger.error('Auth failed', { password, token });

// Correct — log only the error type, not the sensitive value
logger.error('[Auth] Token validation failed');
```

**Do not swallow errors silently without logging:**
```typescript
// Avoid
try { ... } catch { /* nothing */ }

// Correct — at minimum warn on unexpected failure
try { ... } catch (error) {
  logger.warn('[Service] Unexpected failure, proceeding with fallback:', error);
}
```

---

## Retrieving Persisted Errors

For Capacitor/Android debugging when DevTools is not attached:

```typescript
import { logger } from '@/utils/logger';

// Show last 50 errors in a debug panel
const errors = logger.getLog();
console.table(errors.map(e => ({
  level: e.level,
  timestamp: e.timestamp,
  message: e.message,
  data: e.data,
})));

// Clear after reading
logger.clearLog();
```

---

## Checklist

Before marking migration complete:

- [ ] `logger.ts` created at `src/utils/logger.ts`
- [ ] All `console.error` replaced with `logger.error`
- [ ] All `console.warn` replaced with `logger.warn`
- [ ] All `console.log` replaced with `logger.debug` or `logger.info` (as appropriate)
- [ ] Import added to every migrated file
- [ ] Service name prefix added to all log messages (e.g. `[ServiceName]`)
- [ ] Logger mocked in Vitest setup so tests stay quiet
- [ ] `pnpm nx run <project>:lint` passes with zero `no-console` violations
- [ ] `pnpm nx run <project>:typecheck` passes
- [ ] No sensitive data (passwords, tokens) in logged arguments

---

## Evidence in This Codebase

| File | Evidence |
|------|---------|
| `apps/vibe-tutor/src/utils/logger.ts` | Canonical implementation |
| `apps/vibe-tutor/src/services/` (32 files) | All import and use `logger` |
| `apps/vibe-tutor/src/utils/electronStore.ts` | Uses `logger` internally |
| commit `67e3f36` | Migration commit: replaced console.error/warn in 10 services |
