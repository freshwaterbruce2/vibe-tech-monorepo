import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Vibe Code Studio (web mode on port 3001).
 * See https://playwright.dev/docs/test-configuration
 *
 * Artifacts (test-results, HTML report) are redirected to D:\ per the
 * workspace paths policy — they must not land inside V:\monorepo.
 */
const ARTIFACT_ROOT = process.env.PLAYWRIGHT_ARTIFACT_DIR ?? 'D:/temp/playwright/vibe-code-studio';

export default defineConfig({
  testDir: './tests',

  /* Keep Playwright artifacts out of the repo */
  outputDir: `${ARTIFACT_ROOT}/test-results`,

  /*
   * First page load on a cold Vite dev server can exceed the 30s default
   * while the module graph (Monaco etc.) is transformed for parallel workers.
   */
  timeout: 120_000,

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporters: terminal list + HTML report outside the repo */
  reporter: [['list'], ['html', { outputFolder: `${ARTIFACT_ROOT}/html-report`, open: 'never' }]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run the Vite dev server (web mode) before starting the tests */
  webServer: {
    command: 'pnpm run dev:web',
    url: 'http://localhost:3001',
    reuseExistingServer: true, // Allow tests to run against already-running dev server
    timeout: 120000,
  },
});
