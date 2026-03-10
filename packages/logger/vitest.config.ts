import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@vibetech/shared-config': resolve(__dirname, '../shared-config/src/index.ts'),
        },
    },
});
