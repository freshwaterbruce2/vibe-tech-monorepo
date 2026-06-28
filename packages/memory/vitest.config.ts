import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: [],
    coverage: {
      provider: 'v8',
      // json (coverage-final.json) feeds the repo's diff-coverage gate, which
      // enforces 100% on new/changed code. Whole-project percentage thresholds
      // are intentionally omitted: they were a dormant legacy floor (already
      // below 60% branches) that only surfaced when an unrelated change made
      // this package "affected", producing false pre-commit failures.
      reporter: ['text', 'json', 'html'],
    },
  },
});
