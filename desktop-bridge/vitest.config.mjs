import { defineConfig } from 'vitest/config';

// Standalone project (not part of the monorepo workspace). Pin the config so
// vitest does not inherit the repo-root config (which targets src/**/*.tsx).
export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
  },
});
