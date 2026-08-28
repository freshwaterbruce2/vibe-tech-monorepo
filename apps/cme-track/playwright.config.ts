import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.E2E_PORT ?? 4360);
const apiPort = Number(process.env.E2E_API_PORT ?? 5360);
const host = process.env.E2E_HOST ?? '127.0.0.1';
const baseURL = `http://${host}:${frontendPort}`;
const apiURL = `http://${host}:${apiPort}`;

// Login authenticates against the central workspace auth store. Use a throwaway
// DB isolated from the real D:\databases\auth.db, seeded by global-setup.ts with
// the operator below. The API server (webServer) reads the same AUTH_DB_PATH.
const operatorEmail = 'owner@example.com';
const operatorPassword = 'change-this-password';
const operatorName = 'CME Track Owner';
const testAuthDbPath = process.env.E2E_AUTH_DB_PATH ?? 'D:\\databases\\cme-track-e2e-auth.db';

// Exposed to global-setup.ts, which runs in this Playwright runner process.
process.env.AUTH_DB_PATH = testAuthDbPath;
process.env.E2E_OPERATOR_EMAIL = operatorEmail;
process.env.E2E_OPERATOR_PASSWORD = operatorPassword;
process.env.E2E_OPERATOR_NAME = operatorName;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm exec tsx server/src/index.ts',
      url: `${apiURL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: String(apiPort),
        HOST: host,
        APP_BASE_URL: baseURL,
        APP_DB_PATH: 'D:\\databases\\cme-track-test.db',
        AUTH_DB_PATH: testAuthDbPath,
        AUTH_SECRET: 'local-e2e-auth-secret-change-before-production',
        DEMO_USER_EMAIL: operatorEmail,
        DEMO_USER_PASSWORD: operatorPassword,
        DEMO_USER_NAME: operatorName,
        DEMO_PLAN: 'pro',
      },
    },
    {
      command: 'pnpm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
