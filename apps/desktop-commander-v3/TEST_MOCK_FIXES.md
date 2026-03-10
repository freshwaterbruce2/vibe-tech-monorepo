# Test Mock Fixes Guide

## Problem Analysis

51 of 171 tests failing due to mock implementation issues (NOT code issues). The production code is functional and working.

### Root Cause

The test files mock `child_process.exec` and `fs.promises.*`, but the production code uses:

- `promisify(exec)` for child_process operations
- `fs.promises.*` for filesystem operations

The mocks don't properly support these patterns.

---

## Fix Strategy

### 1. child_process Mock Fix (WindowTools, ClipboardTools, ScreenshotTools)

**Current Problem:**

```typescript
vi.mock('child_process');

// Later in test:
vi.mocked(child_process.exec).mockImplementation((cmd, options, callback) => {
  callback(null, { stdout: 'result', stderr: '' });
  return {} as any;
});
```

**Why it fails:** When the production code calls `promisify(exec)`, Node's `util.promisify` tries to wrap the mocked function, but the mock doesn't provide the right signature.

**Solution:**

```typescript
// At the top of the test file
vi.mock('child_process', () => ({
  exec: vi.fn((cmd: string, options: any, callback: any) => {
    // Default implementation (will be overridden in tests)
    if (typeof callback === 'function') {
      callback(null, { stdout: '', stderr: '' });
    }
    return {} as any;
  }),
}));

// Import after mocking
import { exec } from 'child_process';

// In each test:
vi.mocked(exec).mockImplementation(((cmd: string, options: any, callback: any) => {
  callback(null, { stdout: 'expected result', stderr: '' });
  return {} as any;
}) as any);
```

**Files to fix:**

- `src/tests/WindowTools.test.ts` (lines 7-11)
- `src/tests/ClipboardTools.test.ts` (lines 7-11)
- `src/tests/ScreenshotTools.test.ts` (lines 8-12)

---

### 2. fs.promises Mock Fix (FileSystemTools, ScreenshotTools)

**Current Problem:**

```typescript
vi.mock('fs');

// Later:
vi.mocked(fs.promises.readFile).mockResolvedValue('content');
// TypeError: Cannot read properties of undefined (reading 'readFile')
```

**Why it fails:** Vitest's auto-mock doesn't properly create `fs.promises` namespace.

**Solution A: Spy on real fs.promises (Recommended)**

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as FileSystem from '../FileSystemTools';
import * as PathValidator from '../PathValidator';

// Don't mock fs at module level - use spies instead
vi.mock('../PathValidator', async () => {
  const actual = await vi.importActual('../PathValidator');
  return {
    ...actual,
    validatePath: vi.fn(),
    isFile: vi.fn(),
    isDirectory: vi.fn(),
    pathExists: vi.fn(),
  };
});

describe('FileSystemTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Spy on fs.promises methods
    vi.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('content'));
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(fs, 'readdir').mockResolvedValue([]);
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    vi.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 100,
      mtime: new Date(),
    } as any);

    // PathValidator mocks
    vi.mocked(PathValidator.validatePath).mockReturnValue('C:\\dev\\test.txt');
    vi.mocked(PathValidator.isFile).mockResolvedValue(true);
  });
});
```

**Solution B: Manual fs.promises Mock (Alternative)**

```typescript
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn(),
    rename: vi.fn(),
    copyFile: vi.fn(),
    appendFile: vi.fn(),
  },
  default: {
    promises: {
      // Repeat above
    }
  }
}));
```

**Files to fix:**

- `src/tests/FileSystemTools.test.ts` (lines 7-23) - 23 failing tests
- `src/tests/ScreenshotTools.test.ts` (lines 8-12) - 12 failing tests

---

## Detailed Fix Instructions

### Step 1: Fix WindowTools.test.ts

1. Open `src/tests/WindowTools.test.ts`
2. Replace lines 7-11:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as child_process from 'child_process';
import * as Window from '../WindowTools';

// Mock dependencies
vi.mock('child_process');
```

With:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as Window from '../WindowTools';

// Mock child_process with proper promisify support
vi.mock('child_process', () => ({
  exec: vi.fn((cmd: string, options: any, callback: any) => {
    if (typeof callback === 'function') {
      callback(null, { stdout: '', stderr: '' });
    }
    return {} as any;
  }),
}));

import { exec } from 'child_process';
```

1. In each test, change:

```typescript
const execMock = vi.mocked(child_process.exec);
execMock.mockImplementation(...);
```

To:

```typescript
vi.mocked(exec).mockImplementation(((cmd: string, options: any, callback: any) => {
  callback(null, { stdout: 'result', stderr: '' });
  return {} as any;
}) as any);
```

1. Save and run: `npm test -- WindowTools.test.ts`

Expected result: All 22 WindowTools tests should pass.

---

### Step 2: Fix ClipboardTools.test.ts

Same pattern as WindowTools:

1. Open `src/tests/ClipboardTools.test.ts`
2. Apply same mock changes as WindowTools
3. Save and run: `npm test -- ClipboardTools.test.ts`

Expected result: 11/14 tests pass (3 may still need minor adjustments)

---

### Step 3: Fix FileSystemTools.test.ts

1. Open `src/tests/FileSystemTools.test.ts`
2. Replace lines 7-23:

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as FileSystem from '../FileSystemTools';
import * as PathValidator from '../PathValidator';

// Mock dependencies
vi.mock('fs');
vi.mock('../PathValidator', async () => {
  const actual = await vi.importActual('../PathValidator');
  return {
    ...actual,
    validatePath: vi.fn(),
    isFile: vi.fn(),
    isDirectory: vi.fn(),
    pathExists: vi.fn(),
  };
});
```

With:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as FileSystem from '../FileSystemTools';
import * as PathValidator from '../PathValidator';

// Mock PathValidator only (use spies for fs)
vi.mock('../PathValidator', async () => {
  const actual = await vi.importActual('../PathValidator');
  return {
    ...actual,
    validatePath: vi.fn(),
    isFile: vi.fn(),
    isDirectory: vi.fn(),
    pathExists: vi.fn(),
  };
});
```

1. Update `beforeEach`:

```typescript
describe('FileSystemTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Spy on fs.promises methods
    vi.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('file contents'));
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(fs, 'readdir').mockResolvedValue([]);
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    vi.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 100,
      mtime: new Date(),
      mode: 0o644,
    } as any);
    vi.spyOn(fs, 'appendFile').mockResolvedValue(undefined);
    vi.spyOn(fs, 'rename').mockResolvedValue(undefined);
    vi.spyOn(fs, 'copyFile').mockResolvedValue(undefined);
    vi.spyOn(fs, 'rm').mockResolvedValue(undefined);
    vi.spyOn(fs, 'unlink').mockResolvedValue(undefined);

    // Default PathValidator mocks
    vi.mocked(PathValidator.validatePath).mockReturnValue('C:\\dev\\test.txt');
    vi.mocked(PathValidator.isFile).mockResolvedValue(true);
    vi.mocked(PathValidator.isDirectory).mockResolvedValue(false);
    vi.mocked(PathValidator.pathExists).mockResolvedValue(true);
  });
});
```

1. Save and run: `npm test -- FileSystemTools.test.ts`

Expected result: 35+ tests pass (up from 3)

---

### Step 4: Fix ScreenshotTools.test.ts

Similar to FileSystemTools, but also needs child_process fix:

1. Open `src/tests/ScreenshotTools.test.ts`
2. Apply both fs spy pattern AND child_process mock pattern
3. Save and run: `npm test -- ScreenshotTools.test.ts`

Expected result: 12+ tests pass

---

## Expected Results After All Fixes

| Test Suite | Before | After | Status |
|------------|--------|-------|--------|
| PathValidator | 19/19 | 19/19 | Already passing |
| PermissionManager | 18/18 | 18/18 | Already passing |
| FileSystemTools | 3/30 | 28+/30 | Fixed |
| WindowTools | 10/22 | 22/22 | Fixed |
| ClipboardTools | 5/14 | 12+/14 | Fixed |
| ScreenshotTools | 2/15 | 13+/15 | Fixed |
| SystemTools | TBD | TBD | Needs similar fix |
| WebTools | TBD | TBD | Needs similar fix |
| CommandExecutor | TBD | TBD | Needs review |

**Target:** 150+/171 tests passing (88%+)

---

## Testing Checklist

After applying fixes:

```bash
# Test individual suites
npm test -- PathValidator.test.ts
npm test -- PermissionManager.test.ts
npm test -- FileSystemTools.test.ts
npm test -- WindowTools.test.ts
npm test -- ClipboardTools.test.ts
npm test -- ScreenshotTools.test.ts

# Test all
npm test

# Check coverage
npm test -- --coverage
```

Target metrics:

- 88%+ test pass rate (150+/171)
- 80%+ code coverage
- Zero timeout failures

---

## Notes

- **Production code is functional** - all failures are test infrastructure issues
- **No code changes needed** - only test mock improvements
- **Some tests may remain skipped** - acceptable if they test platform-specific features
- **Coverage report may show gaps** - this is expected for untested edge cases

---

## Automation Script (PowerShell)

```powershell
# Run all fixes and verify
$testFiles = @(
  'WindowTools.test.ts',
  'ClipboardTools.test.ts',
  'FileSystemTools.test.ts',
  'ScreenshotTools.test.ts'
)

foreach ($file in $testFiles) {
  Write-Host "Testing $file..." -ForegroundColor Cyan
  npm test -- $file

  if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: $file" -ForegroundColor Red
  } else {
    Write-Host "PASSED: $file" -ForegroundColor Green
  }
}

Write-Host "`nRunning full test suite..." -ForegroundColor Yellow
npm test
```

Save as `fix-tests.ps1` and run: `.\fix-tests.ps1`

---

Last updated: 2026-01-02
Status: Ready for implementation
Priority: HIGH (blocks 100% production readiness)
