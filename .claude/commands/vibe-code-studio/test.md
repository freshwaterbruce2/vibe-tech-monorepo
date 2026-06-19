---
name: code-studio:test
description: Run unit and E2E tests for Vibe Code Studio
model: sonnet
---

# Vibe Code Studio Test Suite

Run the unit (Vitest) and end-to-end (Playwright) suites. Run from `V:\monorepo`.

## Steps

1. Unit / integration tests (Vitest, jsdom):

   ```powershell
   $env:NX_NO_CLOUD='true'; pnpm nx run vibe-code-studio:test
   ```

2. E2E tests (Playwright, Chromium; boots the Vite dev server on port 3001):

   ```powershell
   pnpm --filter vibe-code-studio test:e2e
   ```

   Headed / debug mode: `pnpm --filter vibe-code-studio test:e2e:headed`.

## Notes

- Vitest config: `apps/vibe-code-studio/vitest.config.ts` (v8 coverage provider, thresholds
  60% lines / 60% functions / 50% branches / 60% statements). There is no separate
  `test:coverage` script — run coverage with
  `pnpm --filter vibe-code-studio test -- --coverage`.
- Playwright config: `apps/vibe-code-studio/playwright.config.ts`. E2E specs live in
  `apps/vibe-code-studio/tests/`.

## Expected Output

- Vitest: per-file pass/fail with totals.
- Playwright: HTML report; video + screenshot captured on failure.
