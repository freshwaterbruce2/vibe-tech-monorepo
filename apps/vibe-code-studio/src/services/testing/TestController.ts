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

/**
 * Problems-panel source keys are namespaced per file ('test:<file>') so they
 * cannot collide with a user-defined .vcs/tasks.json task label (which is used
 * raw as a source key) and so per-file re-runs replace cleanly without a
 * read-modify-write race. Mirrors the LSP convention ('lsp:<path>').
 */
export const TEST_DIAGNOSTIC_PREFIX = 'test:';

/** Source key for one test file's diagnostics. */
export function testSourceKey(file: string): string {
  return `${TEST_DIAGNOSTIC_PREFIX}${file}`;
}

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

/** A test's tree status: passed, skipped (todo/pending), or a real failure. */
function caseStatus(result: TestResult): TestNodeStatus {
  if (result.passed) return 'passed';
  return result.skipped ? 'skipped' : 'failed';
}

/** Map one TestResult to a tree leaf. */
export function resultToCaseNode(result: TestResult, index: number): TestCaseNode {
  return {
    id: `${result.location?.file ?? 'unknown'}::${result.testName}::${index}`,
    name: result.testName,
    status: caseStatus(result),
    duration: result.duration,
    error: result.error,
    line: result.location?.line,
  };
}

/** Map a run TestSuite to a file node. Counts are recomputed from the mapped
 * nodes so skipped tests never inflate the failure count (parsers fold
 * skipped into failedTests). */
export function suiteToFileNode(suite: TestSuite): TestFileNode {
  const tests = suite.tests.map(resultToCaseNode);
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const skipped = tests.filter(t => t.status === 'skipped').length;
  return {
    file: suite.file ?? suite.name,
    status: failed > 0 ? 'failed' : tests.length > 0 ? 'passed' : 'idle',
    tests,
    passed,
    failed,
    skipped,
    duration: suite.duration,
  };
}

/** Failures → Problems panel diagnostics (file/line best-effort). Skipped
 * (todo/pending) tests are not failures and produce no diagnostic. */
export function failuresToDiagnostics(suites: TestSuite[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const suite of suites) {
    for (const test of suite.tests) {
      if (test.passed || test.skipped) {
        continue;
      }
      diagnostics.push({
        file: test.location?.file ?? suite.file ?? suite.name,
        line: test.location?.line ?? 1,
        column: test.location?.column ?? 1,
        severity: 'error',
        message: `${test.testName}: ${test.error ?? 'test failed'}`,
        source: testSourceKey(suite.file ?? suite.name),
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
    // Per-file source key: replaces THIS file's diagnostics only, no shared
    // read-modify-write, no cross-file clobber.
    problems().setSource(testSourceKey(file), failuresToDiagnostics([suite]));
  } catch (error) {
    logger.error('[TestController] run failed', error);
    explorer().setFileStatus(file, 'failed');
    explorer().setError(error instanceof Error ? error.message : 'Test run failed.');
  }
}

/** Run everything; each file's diagnostics land under its own source key. */
export async function runAllTests(runner: TestRunnerLike): Promise<void> {
  explorer().setRunningAll(true);
  try {
    const suites = await runner.runAllTests();
    clearTestDiagnostics();
    for (const suite of suites) {
      explorer().upsertFileNode(suiteToFileNode(suite));
      problems().setSource(testSourceKey(suite.file ?? suite.name), failuresToDiagnostics([suite]));
    }
  } catch (error) {
    logger.error('[TestController] run-all failed', error);
    explorer().setError(error instanceof Error ? error.message : 'Test run failed.');
  } finally {
    explorer().setRunningAll(false);
  }
}

/** Clear every per-file test diagnostic source (used before a full run). */
function clearTestDiagnostics(): void {
  const bySource = useProblemsStore.getState().bySource;
  for (const key of Object.keys(bySource)) {
    if (key.startsWith(TEST_DIAGNOSTIC_PREFIX)) {
      problems().clearSource(key);
    }
  }
}
