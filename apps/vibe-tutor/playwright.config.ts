import { defineConfig, devices } from '@playwright/test';

const fullMatrix = process.env.PW_FULL_MATRIX === '1';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts', '**/*.spec.tsx'],
  testIgnore: ['**/*.test.ts', '**/*.test.tsx'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: fullMatrix
    ? [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
        { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
        {
          name: 'Motorola',
          use: { ...devices['Motorola Moto G4'], viewport: { width: 412, height: 915 } },
        },
      ]
    : [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Start dev server before running tests
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
