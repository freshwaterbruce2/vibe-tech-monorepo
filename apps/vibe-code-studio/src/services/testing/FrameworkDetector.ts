/**
 * Framework Detector
 * Detects available test frameworks in a project
 */

import { ElectronService } from '../ElectronService';
import type { LoggerFunction, TestFrameworkInfo } from './types';

export class FrameworkDetector {
  private readonly workspaceRoot: string;
  private readonly logger: LoggerFunction;

  constructor(workspaceRoot: string, logger: LoggerFunction) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
  }

  /**
   * Detect available test frameworks in the project
   */
  async detectFrameworks(): Promise<TestFrameworkInfo[]> {
    const frameworks: TestFrameworkInfo[] = [];

    const electronService = new ElectronService();
    // Guard: Native API required
    if (!electronService.isElectron() && !electronService.isTauri()) {
      this.logger('Native file system API not available', 'warn');
      return frameworks;
    }

    try {
      const packageJsonPath = `${this.workspaceRoot}/package.json`;

      const exists = await electronService.exists(packageJsonPath);
      if (exists) {
        const content = await electronService.readFile(packageJsonPath);
        const packageJson = JSON.parse(content);
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        // Detect Vitest
        if (allDeps.vitest) {
          frameworks.push(await this.createVitestConfig(allDeps.vitest));
        }

        // Detect Jest
        if (allDeps.jest || allDeps['@jest/core']) {
          frameworks.push(await this.createJestConfig(allDeps.jest ?? allDeps['@jest/core']));
        }

        // Detect Mocha
        if (allDeps.mocha) {
          frameworks.push(await this.createMochaConfig(allDeps.mocha));
        }

        // Detect Playwright
        if (allDeps['@playwright/test']) {
          frameworks.push(await this.createPlaywrightConfig(allDeps['@playwright/test']));
        }

        // Detect Cypress
        if (allDeps.cypress) {
          frameworks.push(await this.createCypressConfig(allDeps.cypress));
        }
      }
    } catch (error) {
      this.logger(
        `Failed to detect frameworks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'warn'
      );
    }

    return frameworks;
  }

  /**
   * Find a config file from a list of possible names
   */
  async findConfigFile(possibleNames: string[]): Promise<string | undefined> {
    const electronService = new ElectronService();
    // Guard: Native API required
    if (!electronService.isElectron() && !electronService.isTauri()) {
      return undefined;
    }

    for (const name of possibleNames) {
      const path = `${this.workspaceRoot}/${name}`;
      const exists = await electronService.exists(path);
      if (exists) {
        return path;
      }
    }
    return undefined;
  }

  /**
   * Select the best framework from available options
   */
  selectFramework(
    preferred?: string,
    available: TestFrameworkInfo[] = []
  ): TestFrameworkInfo | null {
    if (preferred && preferred !== 'auto') {
      const framework = available.find(f => f.name === preferred);
      if (framework) {
        return framework;
      }
      this.logger(`Preferred framework '${preferred}' not found, falling back to auto-detection`, 'warn');
    }

    // Auto-select the best framework
    if (available.length === 0) {
      return null;
    }

    // Prioritize: Vitest > Jest > Playwright > Mocha > Cypress
    const priority = ['vitest', 'jest', 'playwright', 'mocha', 'cypress'];
    for (const name of priority) {
      const framework = available.find(f => f.name === name);
      if (framework) {
        return framework;
      }
    }

    return available[0] ?? null;
  }

  // Framework-specific configurations
  private async createVitestConfig(version: string): Promise<TestFrameworkInfo> {
    return {
      name: 'vitest',
      version,
      configFile: await this.findConfigFile(['vitest.config.ts', 'vitest.config.js', 'vite.config.ts', 'vite.config.js']),
      command: 'npx',
      args: ['vitest'],
      patterns: ['**/*.{test,spec}.{js,ts,jsx,tsx}', '**/__tests__/**/*.{js,ts,jsx,tsx}'],
      supports: {
        coverage: true,
        watch: true,
        filtering: true,
        bail: true,
        parallel: true
      }
    };
  }

  private async createJestConfig(version: string): Promise<TestFrameworkInfo> {
    return {
      name: 'jest',
      version,
      configFile: await this.findConfigFile(['jest.config.js', 'jest.config.ts', 'jest.config.json']),
      command: 'npx',
      args: ['jest'],
      patterns: ['**/*.{test,spec}.{js,ts,jsx,tsx}', '**/__tests__/**/*.{js,ts,jsx,tsx}'],
      supports: {
        coverage: true,
        watch: true,
        filtering: true,
        bail: true,
        parallel: true
      }
    };
  }

  private async createMochaConfig(version: string): Promise<TestFrameworkInfo> {
    return {
      name: 'mocha',
      version,
      configFile: await this.findConfigFile(['.mocharc.json', '.mocharc.js', 'mocha.opts']),
      command: 'npx',
      args: ['mocha'],
      patterns: ['test/**/*.{js,ts}', '**/*.test.{js,ts}'],
      supports: {
        coverage: false, // Requires nyc
        watch: true,
        filtering: true,
        bail: true,
        parallel: false
      }
    };
  }

  private async createPlaywrightConfig(version: string): Promise<TestFrameworkInfo> {
    return {
      name: 'playwright',
      version,
      configFile: await this.findConfigFile(['playwright.config.ts', 'playwright.config.js']),
      command: 'npx',
      args: ['playwright', 'test'],
      patterns: ['tests/**/*.{js,ts}', 'e2e/**/*.{js,ts}'],
      supports: {
        coverage: true,
        watch: false,
        filtering: true,
        bail: true,
        parallel: true
      }
    };
  }

  private async createCypressConfig(version: string): Promise<TestFrameworkInfo> {
    return {
      name: 'cypress',
      version,
      configFile: await this.findConfigFile(['cypress.config.ts', 'cypress.config.js', 'cypress.json']),
      command: 'npx',
      args: ['cypress', 'run'],
      patterns: ['cypress/e2e/**/*.{js,ts}', 'cypress/integration/**/*.{js,ts}'],
      supports: {
        coverage: true,
        watch: false,
        filtering: true,
        bail: false,
        parallel: false
      }
    };
  }
}
