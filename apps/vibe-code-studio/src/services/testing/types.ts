/**
 * Test Runner Types
 * Type definitions for the testing module
 */

// Enhanced interfaces for comprehensive test support
export interface TestResult {
  passed: boolean;
  testName: string;
  output: string;
  error?: string;
  duration: number;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  assertions?: number;
  retries?: number;
}

export interface TestSuite {
  name: string;
  file?: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests?: number;
  todoTests?: number;
  duration: number;
  coverage?: CoverageInfo;
}

export interface CoverageInfo {
  lines: { covered: number; total: number; percentage: number };
  functions: { covered: number; total: number; percentage: number };
  branches: { covered: number; total: number; percentage: number };
  statements: { covered: number; total: number; percentage: number };
  files?: CoverageFileInfo[];
}

export interface CoverageFileInfo {
  file: string;
  lines: { covered: number; total: number; percentage: number };
  functions: { covered: number; total: number; percentage: number };
  branches: { covered: number; total: number; percentage: number };
  statements: { covered: number; total: number; percentage: number };
  uncoveredLines?: number[];
}

export interface TestFrameworkInfo {
  name: string;
  version?: string;
  configFile?: string;
  command: string;
  args: string[];
  patterns: string[];
  supports: {
    coverage: boolean;
    watch: boolean;
    filtering: boolean;
    bail: boolean;
    parallel: boolean;
  };
}

export interface TestRunnerOptions {
  testFramework?: 'jest' | 'vitest' | 'mocha' | 'cypress' | 'playwright' | 'auto';
  pattern?: string;
  verbose?: boolean;
  coverage?: boolean;
  timeout?: number;
  bail?: boolean;
  parallel?: boolean;
  watch?: boolean;
  maxWorkers?: number;
  reporter?: string;
  setupFiles?: string[];
  testMatch?: string[];
  testIgnore?: string[];
  env?: Record<string, string>;
  workingDirectory?: string;
}

export interface TestDiscoveryResult {
  framework: TestFrameworkInfo;
  testFiles: string[];
  totalTests: number;
  configFiles: string[];
}

export type LoggerFunction = (message: string, level?: 'info' | 'warn' | 'error') => void;

// Default coverage structure
export function getDefaultCoverage(): CoverageInfo {
  return {
    lines: { covered: 0, total: 0, percentage: 0 },
    functions: { covered: 0, total: 0, percentage: 0 },
    branches: { covered: 0, total: 0, percentage: 0 },
    statements: { covered: 0, total: 0, percentage: 0 },
    files: []
  };
}
