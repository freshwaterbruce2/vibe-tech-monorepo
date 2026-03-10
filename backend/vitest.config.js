import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        include: ['**/*.test.mjs'],
        testTimeout: 10000,
    },
});
