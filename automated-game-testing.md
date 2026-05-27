# Automated Game Testing Plan

## Goal
Implement a state-of-the-art automated testing suite for Vibe Tutor's educational games (Sudoku, Word Search) using Playwright E2E and visual regression testing, following 2026 industry best practices.

## Tasks
- [ ] Task 1: Update Playwright configuration for Vibe Tutor (`apps/vibe-tutor/playwright.config.ts`) to configure visual regression thresholds, disable animations, and ignore small anti-aliasing variations → Verify: Check file properties.
- [ ] Task 2: Create a new E2E test file `apps/vibe-tutor/tests/games.spec.ts` targeting Brain Gym hub and game containers → Verify: Verify file exists.
- [ ] Task 3: Implement game selection and gameplay interaction tests (filtering game zones, rendering Sudoku board, and selecting words in Word Search) → Verify: Code is syntactically valid and compiles.
- [ ] Task 4: Integrate visual regression screenshot assertions (`toHaveScreenshot()`) with masked dynamic parts (timer, random puzzle IDs) → Verify: Tests runs and creates visual reference files.
- [ ] Task 5: Execute and compile baseline snapshot outputs → Verify: Run `pnpm nx run vibe-tutor:test` or specific Playwright target.

## Done When
- [ ] Playwright config is loaded with robust `toHaveScreenshot` defaults.
- [ ] Automated game test suite is written, running, and passes 100% of game-loop assertions.
- [ ] Initial visual regression baselines are compiled.
