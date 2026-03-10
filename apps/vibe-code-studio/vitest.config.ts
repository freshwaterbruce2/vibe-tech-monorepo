import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
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
      '**/.deploy-test/**',
      '**/.deploy/**',
      '**/_backups/**',
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
      ]
    }
  }
})
