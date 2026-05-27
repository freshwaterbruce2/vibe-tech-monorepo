/**
 * Test Environment Configuration
 * Centralized configuration for all test environments and CI/CD integration
 */

export interface TestEnvironmentConfig {
  baseUrl: string;
  apiUrl: string;
  timeout: {
    default: number;
    slow: number;
    navigation: number;
  };
  retries: {
    ci: number;
    local: number;
  };
  parallel: {
    workers: number;
    shard: string | null;
  };
  browsers: string[];
  mobileDevices: string[];
  performance: {
    budgets: {
      initialPageLoad: number;
      timeToInteractive: number;
      cumulativeLayoutShift: number;
      firstContentfulPaint: number;
    };
    lighthouse: {
      performanceThreshold: number;
      accessibilityThreshold: number;
      bestPracticesThreshold: number;
      seoThreshold: number;
    };
  };
  security: {
    enableSecurityHeaders: boolean;
    enableCspTesting: boolean;
    enablePenetrationTesting: boolean;
  };
  features: {
    enableVoiceCommands: boolean;
    enableOfflineTesting: boolean;
    enablePwaInstallation: boolean;
    enableMultiTenantTesting: boolean;
  };
  external: {
    firebase: {
      useEmulator: boolean;
      emulatorPort: number;
      projectId: string;
    };
    square: {
      useSandbox: boolean;
      webhookEndpoint: string;
    };
    sentry: {
      enableErrorTracking: boolean;
      environment: string;
    };
  };
  reporting: {
    outputDir: string;
    formats: string[];
    includeScreenshots: boolean;
    includeVideos: boolean;
    includeTraces: boolean;
  };
}

// Base configuration
const baseConfig: TestEnvironmentConfig = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3001',
  timeout: {
    default: 30000,
    slow: 60000,
    navigation: 10000
  },
  retries: {
    ci: 2,
    local: 0
  },
  parallel: {
    workers: process.env.CI ? 1 : undefined,
    shard: process.env.SHARD || null
  },
  browsers: ['chromium', 'firefox', 'webkit'],
  mobileDevices: ['iPhone 12', 'Pixel 5', 'Samsung Galaxy S21'],
  performance: {
    budgets: {
      initialPageLoad: 3000,
      timeToInteractive: 5000,
      cumulativeLayoutShift: 0.25,
      firstContentfulPaint: 1800
    },
    lighthouse: {
      performanceThreshold: 90,
      accessibilityThreshold: 95,
      bestPracticesThreshold: 90,
      seoThreshold: 85
    }
  },
  security: {
    enableSecurityHeaders: true,
    enableCspTesting: true,
    enablePenetrationTesting: true
  },
  features: {
    enableVoiceCommands: true,
    enableOfflineTesting: true,
    enablePwaInstallation: true,
    enableMultiTenantTesting: true
  },
  external: {
    firebase: {
      useEmulator: process.env['NODE_ENV'] !== 'production',
      emulatorPort: 8080,
      projectId: process.env.FIREBASE_PROJECT_ID || 'test-project'
    },
    square: {
      useSandbox: process.env['NODE_ENV'] !== 'production',
      webhookEndpoint: process.env.SQUARE_WEBHOOK_URL || 'http://localhost:3001/webhooks/square'
    },
    sentry: {
      enableErrorTracking: process.env['NODE_ENV'] === 'production',
      environment: process.env['NODE_ENV'] || 'test'
    }
  },
  reporting: {
    outputDir: 'test-results',
    formats: ['html', 'json', 'junit'],
    includeScreenshots: true,
    includeVideos: true,
    includeTraces: true
  }
};

// Environment-specific configurations
const environments = {
  development: {
    ...baseConfig,
    baseUrl: 'http://localhost:5173',
    retries: { ci: 0, local: 0 },
    external: {
      ...baseConfig.external,
      firebase: {
        ...baseConfig.external.firebase,
        useEmulator: true
      },
      square: {
        ...baseConfig.external.square,
        useSandbox: true
      },
      sentry: {
        ...baseConfig.external.sentry,
        enableErrorTracking: false
      }
    }
  },

  staging: {
    ...baseConfig,
    baseUrl: process.env.STAGING_URL || 'https://staging.dc8980-shipping.com',
    retries: { ci: 2, local: 1 },
    parallel: { workers: 2, shard: null },
    external: {
      ...baseConfig.external,
      firebase: {
        ...baseConfig.external.firebase,
        useEmulator: false,
        projectId: 'dc8980-shipping-staging'
      },
      square: {
        ...baseConfig.external.square,
        useSandbox: true
      },
      sentry: {
        ...baseConfig.external.sentry,
        enableErrorTracking: true,
        environment: 'staging'
      }
    }
  },

  production: {
    ...baseConfig,
    baseUrl: process.env.PRODUCTION_URL || 'https://app.dc8980-shipping.com',
    retries: { ci: 3, local: 2 },
    parallel: { workers: 4, shard: process.env.SHARD || null },
    browsers: ['chromium'], // Only Chrome for production tests to be fast
    security: {
      ...baseConfig.security,
      enablePenetrationTesting: false // Don't run penetration tests on production
    },
    features: {
      ...baseConfig.features,
      enableMultiTenantTesting: false // Don't create test tenants in production
    },
    external: {
      ...baseConfig.external,
      firebase: {
        ...baseConfig.external.firebase,
        useEmulator: false,
        projectId: 'dc8980-shipping-prod'
      },
      square: {
        ...baseConfig.external.square,
        useSandbox: false
      },
      sentry: {
        ...baseConfig.external.sentry,
        enableErrorTracking: true,
        environment: 'production'
      }
    }
  },

  ci: {
    ...baseConfig,
    baseUrl: process.env.CI_DEPLOY_URL || 'http://localhost:5173',
    timeout: {
      default: 45000,
      slow: 90000,
      navigation: 15000
    },
    retries: { ci: 3, local: 0 },
    parallel: { workers: 1, shard: process.env.SHARD || null },
    browsers: process.env.BROWSER ? [process.env.BROWSER] : ['chromium'],
    reporting: {
      ...baseConfig.reporting,
      formats: ['html', 'json', 'junit', 'github'],
      includeVideos: false // Save space in CI
    }
  }
};

// Get current environment
export function getCurrentEnvironment(): string {
  if (process.env.CI) return 'ci';
  return process.env['NODE_ENV'] || 'development';
}

// Get configuration for current environment
export function getTestConfig(): TestEnvironmentConfig {
  const env = getCurrentEnvironment();
  const config = environments[env as keyof typeof environments] || environments.development;

  // Override with environment variables
  return {
    ...config,
    baseUrl: process.env.TEST_BASE_URL || config.baseUrl,
    apiUrl: process.env.TEST_API_URL || config.apiUrl,
    parallel: {
      workers: process.env.TEST_WORKERS ? parseInt(process.env.TEST_WORKERS) : config.parallel.workers,
      shard: process.env.SHARD || config.parallel.shard
    },
    retries: {
      ci: process.env.TEST_RETRIES ? parseInt(process.env.TEST_RETRIES) : config.retries.ci,
      local: process.env.TEST_RETRIES ? parseInt(process.env.TEST_RETRIES) : config.retries.local
    }
  };
}

// Test data configuration
export const testData = {
  users: {
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@warehouse.test',
      password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
      role: 'admin'
    },
    supervisor: {
      email: process.env.TEST_SUPERVISOR_EMAIL || 'supervisor@warehouse.test',
      password: process.env.TEST_SUPERVISOR_PASSWORD || 'SupervisorPassword123!',
      role: 'supervisor'
    },
    operator: {
      email: process.env.TEST_OPERATOR_EMAIL || 'operator@warehouse.test',
      password: process.env.TEST_OPERATOR_PASSWORD || 'OperatorPassword123!',
      role: 'operator'
    }
  },
  shipping: {
    validDoorNumbers: [332, 333, 340, 350, 400, 454],
    validDestinations: ['6024', '6070', '6039', '6040', '7045'],
    validFreightTypes: ['23/43', '28', 'XD'],
    validTrailerStatuses: ['partial', 'empty', 'shipload']
  },
  performance: {
    largeDoorDataset: Array.from({ length: 100 }, (_, i) => ({
      doorNumber: 332 + i,
      destination: ['6024', '6070', '6039', '6040', '7045'][i % 5],
      timestamp: new Date(Date.now() - i * 60000)
    })),
    largePalletDataset: Array.from({ length: 50 }, (_, i) => ({
      doorNumber: 332 + (i * 2),
      count: Math.floor(Math.random() * 50) + 1,
      timestamp: new Date(Date.now() - i * 120000)
    }))
  }
};

// Utility functions for test configuration
export const testUtils = {
  // Check if a feature is enabled
  isFeatureEnabled: (feature: keyof TestEnvironmentConfig['features']): boolean => {
    return getTestConfig().features[feature];
  },

  // Check if we're running in CI
  isCi: (): boolean => {
    return !!process.env.CI;
  },

  // Check if we're running on a specific browser
  isBrowser: (browser: string): boolean => {
    return process.env.BROWSER === browser;
  },

  // Get retry count for current environment
  getRetryCount: (): number => {
    const config = getTestConfig();
    return testUtils.isCi() ? config.retries.ci : config.retries.local;
  },

  // Get worker count for parallel execution
  getWorkerCount: (): number | undefined => {
    const config = getTestConfig();
    return config.parallel.workers;
  },

  // Check if external service should be mocked
  shouldMockFirebase: (): boolean => {
    return getTestConfig().external.firebase.useEmulator;
  },

  shouldMockSquare: (): boolean => {
    return getTestConfig().external.square.useSandbox;
  },

  shouldMockSentry: (): boolean => {
    return !getTestConfig().external.sentry.enableErrorTracking;
  },

  // Generate test identifiers
  generateTestId: (prefix: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  },

  // Get test timeout for specific operation
  getTimeout: (operation: 'default' | 'slow' | 'navigation' = 'default'): number => {
    return getTestConfig().timeout[operation];
  },

  // Check performance budgets
  checkPerformanceBudget: (metric: keyof TestEnvironmentConfig['performance']['budgets'], value: number): boolean => {
    const budget = getTestConfig().performance.budgets[metric];
    return value <= budget;
  },

  // Get Lighthouse thresholds
  getLighthouseThreshold: (category: keyof TestEnvironmentConfig['performance']['lighthouse']): number => {
    return getTestConfig().performance.lighthouse[category];
  }
};

// Export default configuration
export default getTestConfig();