import { defineConfig, devices } from '@playwright/test'

const isPlaywrightRuntime = process.argv.some((argument) =>
  /@playwright[\\/]test[\\/]cli\.js/i.test(argument) ||
  /(?:^|[\\/])playwright(?:\.cmd|\.js)?$/i.test(argument)
)

if (isPlaywrightRuntime && !process.env.VIBE_JUSTICE_E2E_RUN_ROOT) {
  throw new Error('Run Playwright through `pnpm run e2e` so one isolated data root is shared by every test process.')
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/backend-harness.setup.ts',
  globalTeardown: './e2e/backend-harness.teardown.ts',
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
