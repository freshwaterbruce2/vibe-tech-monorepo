import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    // forks pool gives each test file its own process — required because the
    // agent files have top-level side effects (reviewCode(), qualityGate()) and
    // module state must not bleed between files.
    pool: 'forks',
  },
});
