/**
 * Testing Module
 * Exports all testing-related components and types
 */

// Types
export type {
    CoverageFileInfo,
    CoverageInfo,
    LoggerFunction,
    TestDiscoveryResult,
    TestFrameworkInfo,
    TestResult,
    TestRunnerOptions,
    TestSuite
} from './types';

export { getDefaultCoverage } from './types';

// Components
export { FrameworkDetector } from './FrameworkDetector';
export { OutputParser } from './OutputParser';
export { TestDiscovery } from './TestDiscovery';
export { TestGenerator } from './TestGenerator';
export { TestRunner } from './TestRunner';
