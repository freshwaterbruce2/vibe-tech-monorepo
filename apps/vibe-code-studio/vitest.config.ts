import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vibetech/types': resolve(__dirname, '../../packages/vibetech-types/src/index.ts'),
      '@vibetech/shared-ipc': resolve(__dirname, '../../packages/shared-ipc/src/index.ts'),
      '@vibetech/shared-utils': resolve(__dirname, '../../packages/shared-utils/src/index.ts'),
      '@vibetech/shared-utils/ai': resolve(__dirname, '../../packages/shared-utils/src/ai/index.ts'),
      '@vibetech/feature-flags-core': resolve(__dirname, '../../packages/feature-flags/core/src/index.ts'),
      '@vibetech/feature-flags-sdk-node': resolve(__dirname, '../../packages/feature-flags/sdk-node/src/index.ts'),
      'monaco-editor': resolve(__dirname, 'src/__tests__/__mocks__/monaco-editor.ts'),
      '@monaco-editor/react': resolve(__dirname, 'src/__tests__/__mocks__/@monaco-editor/react.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [
      '**/node_modules/**',
      'tests/**/*.spec.ts',
      'tests/electron/**',
      '**/dist/**',
      '**/dist-electron/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        'dist/',
        'coverage/',
        'vite.config.ts',
        'vitest.config.ts',
        '.eslintrc.js'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      }
    }
  }
})
