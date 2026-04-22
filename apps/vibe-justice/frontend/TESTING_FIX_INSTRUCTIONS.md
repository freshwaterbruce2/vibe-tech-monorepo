# React 19 Testing Fix Instructions for Claude Code

## Problem Summary

React 19 moved `act` from `react-dom/test-utils` to `react` directly. The current `@testing-library/react@16.1.0` still imports from the deprecated path, causing all 57 component/hook tests to fail with:

```
TypeError: React.act is not a function
```

## Current State

- **Tests Passing:** 8 (API service tests without React rendering)
- **Tests Failing:** 57 (all React component/hook tests)
- **Root Cause:** `@testing-library/react` uses `require('react-dom/test-utils')` internally

## Failed Attempts (Do Not Repeat)

1. ❌ Vitest alias in `resolve.alias` - doesn't intercept node_modules imports
2. ❌ `deps.inline: ['@testing-library/react']` - still doesn't apply aliases
3. ❌ Shim file at `src/test/react-dom-test-utils-shim.ts` - not picked up

## Solution Options (Try In Order)

### Option 1: Upgrade @testing-library/react (PREFERRED)

```powershell
cd C:\dev\apps\vibe-justice\frontend
pnpm add @testing-library/react@latest
pnpm test
```

Check if version 17+ exists with React 19 support. If tests pass, done.

### Option 2: Use patch-package

```powershell
# Install patch-package
pnpm add -D patch-package

# Manually edit node_modules/@testing-library/react/dist/act-compat.js
# Find: require('react-dom/test-utils')
# Replace with: require('react')

# Then create patch
pnpm patch-package @testing-library/react

# Add to package.json scripts:
# "postinstall": "patch-package"
```

### Option 3: Vitest Module Mock (Nuclear Option)

In `vitest.config.ts`, try:

```typescript
export default defineConfig({
  test: {
    deps: {
      optimizer: {
        web: {
          include: ['@testing-library/react']
        }
      }
    },
    alias: {
      'react-dom/test-utils': 'react'
    }
  }
})
```

Or create `src/test/setup.ts`:

```typescript
import { vi } from 'vitest';
import { act } from 'react';

vi.mock('react-dom/test-utils', () => ({
  act: act
}));
```

And add to vitest.config.ts:

```typescript
setupFiles: ['./src/test/setup.ts']
```

## Secondary Issue

6 API tests fail with `response.text is not a function`. This is separate from the React issue - likely a fetch mock problem. Fix after React tests work.

## Verification

Run:

```powershell
cd C:\dev\apps\vibe-justice\frontend
pnpm test
```

Target: All 63 tests passing (or at minimum, 57 React tests no longer failing on `act`).

## Key Files

- `C:\dev\apps\vibe-justice\frontend\vitest.config.ts`
- `C:\dev\apps\vibe-justice\frontend\package.json`
- `C:\dev\apps\vibe-justice\frontend\src\test\setup.ts` (create if needed)
