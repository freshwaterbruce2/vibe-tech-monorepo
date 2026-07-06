/**
 * TestController — spec 08 Phase 1: thin aggregation over the EXISTING
 * testing services (TestRunner/TestDiscovery/OutputParser are reused, not
 * reimplemented). Maps discovery + run results into the Test Explorer tree,
 * mirrors failures into problemsStore ('tests' source, replace semantics),
 * and owns run orchestration. The runner is injected for testability.
 * Spec: FEATURE_SPECS/competitive-gaps/08-TEST-EXPLORER.md
 */
import { useProblemsStore } from '../../stores/problemsStore';
import { useTestExplorerStore } from '../../stores/testExplorerStore';
import { logger } from '../Logger';
import type { Diagnostic } from '../tasks/types';
import { TestRunner } from './TestRunner';
import type { TestDiscoveryResult, TestResult, TestRunnerOptions, TestSuite } from './types';

export const TEST_DIAGNOSTIC_SOURCE = 'tests';

/** Runner factory seam — tests swap `create` for a fake. */
export const runnerFactory: { create: (workspaceRoot: string) => TestRunnerLike } = {
  create: workspaceRoot => new TestRunner(workspaceRoot),
};

export interface TestRunnerLike {
  discoverTests(options?: TestRunnerOptions): Promise<TestDiscoveryResult>;
  runTests(filePattern: string, options?: TestRunnerOptions): Promise<TestSuite>;
  runAllTests(options?: TestRunnerOptions): Promise<TestSuite[]>;
}

export type TestNodeStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';

/** Tree status glyphs (lives here — .tsx files must only export components). */
export const STATUS_ICONS: Record<TestNodeStatus, string> = {
  idle: '○',
  running: '◌',
  passed: '✓',
  failed: '✗',
  skipped: '–',
};

export interface TestCaseNode {
  id: string;
  name: string;
  status: TestNodeStatus;
  duration: number;
  error?: string;
  line?: number;
}

export interface TestFileNode {
  file: string;
  status: TestNodeStatus;
  tests: TestCaseNode[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

/** Map one TestResult to a tree leaf. */
export function resultToCaseNode(result: TestResult, index: number): TestCaseNode {
  return {
    id: `${result.location?.file ?? 'unknown'}::${result.testName}::${index}`,
    name: result.testName,
    status: result.passed ? 'passed' : 'failed',
    duration: result.duration,
    error: result.error,
    line: result.location?.line,
  };
}

/** Map a run TestSuite to a file node. */
export function suiteToFileNode(suite: TestSuite): TestFileNode {
  const tests = suite.tests.map(resultToCaseNode);
  const failed = suite.failedTests;
  return {
    file: suite.file ?? suite.name,
    status: failed > 0 ? 'failed' : suite.totalTests > 0 ? 'passed' : 'idle',
    tests,
    passed: suite.passedTests,
    failed,
    skipped: suite.skippedTests ?? 0,
    duration: suite.duration,
  };
}

/** Failures → Problems panel diagnostics (file/line best-effort). */
export function failuresToDiagnostics(suites: TestSuite[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const suite of suites) {
    for (const test of suite.tests) {
      if (test.passed) {
        continue;
      }
      diagnostics.push({
        file: test.location?.file ?? suite.file ?? suite.name,
        line: test.location?.line ?? 1,
        column: test.location?.column ?? 1,
        severity: 'error',
        message: `${test.testName}: ${test.error ?? 'test failed'}`,
        source: TEST_DIAGNOSTIC_SOURCE,
      });
    }
  }
  return diagnostics;
}

const explorer = () => useTestExplorerStore.getState().actions;
const problems = () => useProblemsStore.getState().actions;

/** Discover test files and populate the tree with idle nodes. */
export async function discoverTests(runner: TestRunnerLike): Promise<void> {
  explorer().setDiscovering(true);
  try {
    const discovery = await runner.discoverTests();
    explorer().setDiscovery(
      discovery.framework.name,
      discovery.testFiles.map(file => ({
        file,
        status: 'idle' as const,
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      }))
    );
  } catch (error) {
    logger.error('[TestController] discovery failed', error);
    explorer().setError(error instanceof Error ? error.message : 'Test discovery failed.');
  } finally {
    explorer().setDiscovering(false);
  }
}

/** Run a single file and fold results into the tree + Problems panel. */
export async function runTestFile(runner: TestRunnerLike, file: string): Promise<void> {
  explorer().setFileStatus(file, 'running');
  try {
    const suite = await runner.runTests(file);
    const node = { ...suiteToFileNode(suite), file };
    explorer().upsertFileNode(node);
    mergeFileDiagnostics(file, failuresToDiagnostics([suite]));
  } catch (error) {
    logger.error('[TestController] run failed', error);
    explorer().setFileStatus(file, 'failed');
    explorer().setError(error instanceof Error ? error.message : 'Test run failed.');
  }
}

/** Run everything; Problems panel gets the full replaced set. */
export async function runAllTests(runner: TestRunnerLike): Promise<void> {
  explorer().setRunningAll(true);
  try {
    const suites = await runner.runAllTests();
    for (const suite of suites) {
      explorer().upsertFileNode(suiteToFileNode(suite));
    }
    problems().setSource(TEST_DIAGNOSTIC_SOURCE, failuresToDiagnostics(suites));
  } catch (error) {
    logger.error('[TestController] run-all failed', error);
    explorer().setError(error instanceof Error ? error.message : 'Test run failed.');
  } finally {
    explorer().setRunningAll(false);
  }
}

/** Replace only this file's diagnostics, keeping other files' entries. */
function mergeFileDiagnostics(file: string, fileDiagnostics: Diagnostic[]): void {
  const current = useProblemsStore.getState().bySource[TEST_DIAGNOSTIC_SOURCE] ?? [];
  const others = current.filter(diagnostic => diagnostic.file !== file);
  problems().setSource(TEST_DIAGNOSTIC_SOURCE, [...others, ...fileDiagnostics]);
}
