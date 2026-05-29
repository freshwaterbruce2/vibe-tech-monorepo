import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.E2E_PORT ?? 3020);
const apiPort = Number(process.env.E2E_API_PORT ?? 4020);
const host = process.env.E2E_HOST ?? '127.0.0.1';
const baseURL = `http://${host}:${frontendPort}`;
const apiURL = `http://${host}:${apiPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
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
        AUTH_SECRET: 'local-e2e-auth-secret-change-before-production',
        DEMO_USER_EMAIL: 'owner@example.com',
        DEMO_USER_PASSWORD: 'change-this-password',
        DEMO_USER_NAME: 'Vibe Booking Owner',
        PLAYWRIGHT_TEST: '1',
      },
    },
    {
      command: 'pnpm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm nx run vibe-booking:serve',
      url: 'http://localhost:4211',
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
