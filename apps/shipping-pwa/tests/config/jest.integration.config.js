/**
 * Jest Configuration for Integration Tests
 * Specialized configuration for Firebase, Sentry, and Square integration tests
 */

const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.tsx'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/jest.integration.setup.ts'
  ],
  testEnvironment: 'jsdom',
  testTimeout: 60000, // Longer timeout for integration tests
  maxWorkers: 1, // Run integration tests sequentially to avoid conflicts

  // Module mapping for Node.js modules in browser environment
  moduleNameMapping: {
    '^crypto$': 'crypto-browserify',
    '^stream$': 'stream-browserify',
    '^buffer$': 'buffer',
    '^util$': 'util'
  },

  // Environment variables for integration tests
  setupFiles: [
    '<rootDir>/tests/config/jest.env.setup.js'
  ],

  // Coverage configuration for integration tests
  collectCoverageFrom: [
    'src/firebase/**/*.{ts,tsx}',
    'src/lib/sentry.ts',
    'src/services/squarePaymentService.ts',
    'src/hooks/useFirebase*.{ts,tsx}',
    'src/hooks/useAuth*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}'
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Specific thresholds for critical integration modules
    'src/firebase/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/services/squarePaymentService.ts': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Reporters for integration test results
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-results/integration',
      filename: 'integration-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Shipping PWA - Integration Test Report'
    }],
    ['jest-junit', {
      outputDirectory: './test-results/integration',
      outputName: 'junit-integration.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Global configuration for integration tests
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        target: 'es2020',
        lib: ['es2020', 'dom', 'dom.iterable']
      }
    },
    // Integration test specific globals
    INTEGRATION_TEST_MODE: true,
    FIREBASE_EMULATOR_HOST: 'localhost:8080',
    SQUARE_SANDBOX_MODE: true,
    SENTRY_TEST_MODE: true
  },

  // Transform configuration for integration tests
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.test.json'
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Mock modules for integration tests
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    // Mock heavy dependencies that aren't needed for integration tests
    '^@radix-ui/(.*)$': '<rootDir>/tests/__mocks__/radix-ui.mock.js',
    '^framer-motion$': '<rootDir>/tests/__mocks__/framer-motion.mock.js',
    '^recharts$': '<rootDir>/tests/__mocks__/recharts.mock.js'
  },

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling for integration tests
  errorOnDeprecated: true,
  verbose: true,

  // Test sequencing for integration tests
  testSequencer: '<rootDir>/tests/config/integration-test-sequencer.js'
};