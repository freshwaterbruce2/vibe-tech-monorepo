import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for nova-agent visual regression tests.
 *
 * Closes post-mortem action item P1 from POST-MORTEM-2026-01-31.md: the Jan 31
 * CSS regression (double-escaped `\\:` in responsive selectors) shipped because
 * no visual regression coverage existed at md/lg breakpoints.
 *
 * Runs Playwright against the Vite dev server (`dev:web`) which serves the
 * React frontend that ships inside the Tauri shell.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  expect: {
    // Allow 0.2% pixel diff to absorb font-hinting + antialiasing noise
    // across Windows renders, while still catching real layout breakage.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm run dev:web',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
