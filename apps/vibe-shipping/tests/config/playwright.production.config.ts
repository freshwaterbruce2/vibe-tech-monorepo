/**
 * Playwright Configuration for Production Tests
 * Enhanced configuration for E2E, performance, security, and mobile tests
 */

import { defineConfig, devices } from '@playwright/test';
import { getTestConfig, testUtils } from './test-environment.config';

const config = getTestConfig();

export default defineConfig({
  // Test directory
  testDir: '../',
  testMatch: [
    '**/e2e/**/*.spec.ts',
    '**/performance/**/*.test.ts',
    '**/security/**/*.spec.ts',
    '**/mobile/**/*.spec.ts'
  ],

  // Global configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: testUtils.getRetryCount(),
  workers: testUtils.getWorkerCount(),

  // Timeouts
  timeout: config.timeout.default,
  expect: {
    timeout: 10000
  },

  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),

  // Test configuration
  use: {
    // Base URL
    baseURL: config.baseUrl,

    // Browser context options
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,

    // Screenshot and video settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    video: {
      mode: config.reporting.includeVideos ? 'retain-on-failure' : 'off',
      size: { width: 1280, height: 720 }
    },
    trace: config.reporting.includeTraces ? 'retain-on-failure' : 'off',

    // Network and timing
    navigationTimeout: config.timeout.navigation,
    actionTimeout: 10000,

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (compatible; PWA-Test-Suite/1.0)'
    },

    // Permissions for PWA and voice features
    permissions: ['microphone', 'camera', 'geolocation', 'notifications'],

    // Geolocation for location-based features
    geolocation: { latitude: 40.7128, longitude: -74.0060 }, // New York area

    // Color scheme
    colorScheme: 'light',
  },

  // Project configurations for different test types
  projects: [
    // Desktop browsers - E2E tests
    {
      name: 'chromium-e2e',
      testMatch: '**/e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--enable-features=VaapiVideoDecoder',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },
    {
      name: 'firefox-e2e',
      testMatch: '**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-e2e',
      testMatch: '**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile devices - Mobile compatibility tests
    {
      name: 'mobile-chrome',
      testMatch: '**/mobile/**/*.spec.ts',
      use: {
        ...devices['Pixel 5'],
        hasTouch: true,
        isMobile: true
      },
    },
    {
      name: 'mobile-safari',
      testMatch: '**/mobile/**/*.spec.ts',
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true
      },
    },
    {
      name: 'tablet-ipad',
      testMatch: '**/mobile/**/*.spec.ts',
      use: {
        ...devices['iPad Air'],
        hasTouch: true
      },
    },

    // Performance testing
    {
      name: 'performance-chrome',
      testMatch: '**/performance/**/*.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--enable-features=VaapiVideoDecoder',
            '--remote-debugging-port=9222',
            '--disable-background-timer-throttling'
          ]
        }
      },
    },

    // Security testing
    {
      name: 'security-tests',
      testMatch: '**/security/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        extraHTTPHeaders: {
          'X-Security-Test': 'true'
        }
      },
    },

    // Accessibility testing
    {
      name: 'accessibility',
      testMatch: '**/e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        forcedColors: 'active'
      },
      grep: /@accessibility/,
    },

    // Cross-browser compatibility
    {
      name: 'edge',
      testMatch: '**/e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge'
      },
      grep: /@crossbrowser/,
    },
  ],

  // Reporters
  reporter: [
    // HTML reporter for detailed results
    ['html', {
      outputFolder: `${config.reporting.outputDir  }/playwright-report`,
      open: process.env.CI ? 'never' : 'on-failure'
    }],

    // JSON reporter for programmatic analysis
    ['json', {
      outputFile: `${config.reporting.outputDir  }/playwright-results.json`
    }],

    // JUnit reporter for CI integration
    ['junit', {
      outputFile: `${config.reporting.outputDir  }/playwright-junit.xml`
    }],

    // GitHub Actions reporter (if running in GitHub Actions)
    ...(process.env.GITHUB_ACTIONS ? [['github']] : []),

    // Console reporter for development
    ['list', { printSteps: true }],

    // Custom reporter for performance metrics
    ['./reporters/performance-reporter.ts'],

    // Custom reporter for security findings
    ['./reporters/security-reporter.ts'],
  ],

  // Web servers to start before running tests
  webServer: [
    // Main application server
    {
      command: 'npm run preview',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        VITE_FIREBASE_USE_EMULATOR: config.external.firebase.useEmulator.toString(),
        VITE_SQUARE_ENVIRONMENT: config.external.square.useSandbox ? 'sandbox' : 'production',
        VITE_SENTRY_ENVIRONMENT: config.external.sentry.environment
      }
    },

    // Mock API server for testing
    {
      command: 'npm run server:dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60000
    },

    // Firebase emulator (if needed)
    ...(config.external.firebase.useEmulator ? [{
      command: 'npx firebase emulators:start --only firestore,auth --project demo-test',
      port: config.external.firebase.emulatorPort,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }] : []),
  ],

  // Global expect configuration
  expect: {
    // Custom timeout for expect assertions
    timeout: 10000,

    // Playwright-specific expect options
    toHaveScreenshot: {
      threshold: 0.3,
      mode: 'strict'
    },
    toMatchSnapshot: {
      threshold: 0.3
    }
  },

  // Output directory
  outputDir: `${config.reporting.outputDir  }/test-artifacts`,

  // Metadata
  metadata: {
    testEnvironment: config.external.firebase.useEmulator ? 'emulated' : 'live',
    baseUrl: config.baseUrl,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  },

  // Global test configuration
  globalTimeout: 15 * 60 * 1000, // 15 minutes total

  // Shard configuration for parallel execution
  shard: config.parallel.shard ? {
    current: parseInt(config.parallel.shard.split('/')[0]),
    total: parseInt(config.parallel.shard.split('/')[1])
  } : null,

  // Test file ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.d.ts'
  ],
});