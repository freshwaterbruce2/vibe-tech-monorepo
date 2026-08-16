import { defineConfig, devices } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

process.env.VIBE_JUSTICE_E2E_RUN_ROOT = join(
  tmpdir(),
  `vibe-justice-e2e-${randomUUID().replaceAll('-', '')}`
)

export default defineConfig({
  testDir: './e2e',
  globalTeardown: '../scripts/cleanup-e2e-data.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pwsh -NoProfile -File ../scripts/run-e2e-backend.ps1',
      url: 'http://127.0.0.1:8000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm run dev',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_URL: 'http://127.0.0.1:8000',
        VITE_VIBE_JUSTICE_API_KEY: 'vibe-justice-e2e-local-only-key-2026',
      },
    },
  ],
})
