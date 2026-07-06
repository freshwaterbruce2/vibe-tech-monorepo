/**
 * TestController tests — spec 08 Phase 1. Pure mappers (result/suite/diagnostic
 * shaping) plus orchestration against the REAL testExplorer + problems stores
 * with a fake injected TestRunnerLike.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TEST_DIAGNOSTIC_SOURCE,
  discoverTests,
  failuresToDiagnostics,
  resultToCaseNode,
  runAllTests,
  runTestFile,
  runnerFactory,
  suiteToFileNode,
} from '../../../services/testing/TestController';
import type { TestRunnerLike } from '../../../services/testing/TestController';
import { TestRunner } from '../../../services/testing/TestRunner';
import type { TestDiscoveryResult, TestResult, TestSuite } from '../../../services/testing/types';
import type { Diagnostic } from '../../../services/tasks/types';
import { useProblemsStore } from '../../../stores/problemsStore';
import { useTestExplorerStore } from '../../../stores/testExplorerStore';

const makeResult = (overrides: Partial<TestResult> = {}): TestResult => ({
  passed: true,
  testName: 'adds numbers',
  output: '',
  duration: 12,
  ...overrides,
});

const makeSuite = (overrides: Partial<TestSuite> = {}): TestSuite => ({
  name: 'math suite',
  tests: [],
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  duration: 0,
  ...overrides,
});

const makeDiscovery = (overrides: Partial<TestDiscoveryResult> = {}): TestDiscoveryResult => ({
  framework: {
    name: 'vitest',
    command: 'vitest',
    args: [],
    patterns: ['**/*.test.ts'],
    supports: { coverage: true, watch: true, filtering: true, bail: true, parallel: true },
  },
  testFiles: ['a.test.ts', 'b.test.ts'],
  totalTests: 4,
  configFiles: ['vitest.config.ts'],
  ...overrides,
});

const makeDiag = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  file: 'other.test.ts',
  line: 3,
  column: 2,
  severity: 'error',
  message: 'pre-existing failure',
  source: TEST_DIAGNOSTIC_SOURCE,
  ...overrides,
});

const makeRunner = (overrides: Partial<TestRunnerLike> = {}): TestRunnerLike => ({
  discoverTests: vi.fn().mockResolvedValue(makeDiscovery()),
  runTests: vi.fn().mockResolvedValue(makeSuite()),
  runAllTests: vi.fn().mockResolvedValue([]),
  ...overrides,
});

beforeEach(() => {
  useTestExplorerStore.setState({
    framework: null,
    files: [],
    discovering: false,
    runningAll: false,
    panelOpen: false,
    error: null,
  });
  useProblemsStore.getState().actions.clearAll();
});

describe('resultToCaseNode', () => {
  it('maps a passed result with a location (id composition + line passthrough)', () => {
    const node = resultToCaseNode(makeResult({ location: { file: 'a.test.ts', line: 7 } }), 2);
    expect(node).toEqual({
      id: 'a.test.ts::adds numbers::2',
      name: 'adds numbers',
      status: 'passed',
      duration: 12,
      error: undefined,
      line: 7,
    });
  });

  it('maps a failed result without location to the unknown-file id', () => {
    const node = resultToCaseNode(makeResult({ passed: false, error: 'boom' }), 0);
    expect(node.id).toBe('unknown::adds numbers::0');
    expect(node.status).toBe('failed');
    expect(node.error).toBe('boom');
    expect(node.line).toBeUndefined();
  });
});

describe('suiteToFileNode', () => {
  it('marks the file failed when any test failed and uses suite.file', () => {
    const node = suiteToFileNode(
      makeSuite({
        file: 'a.test.ts',
        tests: [makeResult({ passed: false, error: 'nope' })],
        totalTests: 1,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 2,
        duration: 40,
      })
    );
    expect(node.file).toBe('a.test.ts');
    expect(node.status).toBe('failed');
    expect(node.tests).toHaveLength(1);
    expect(node.skipped).toBe(2);
    expect(node.duration).toBe(40);
  });

  it('marks the file passed when all tests pass and defaults skipped to 0', () => {
    const node = suiteToFileNode(
      makeSuite({ file: 'b.test.ts', tests: [makeResult()], totalTests: 1, passedTests: 1 })
    );
    expect(node.status).toBe('passed');
    expect(node.skipped).toBe(0);
  });

  it('marks an empty suite idle and falls back to the suite name for file', () => {
    const node = suiteToFileNode(makeSuite());
    expect(node.file).toBe('math suite');
    expect(node.status).toBe('idle');
    expect(node.tests).toEqual([]);
  });
});

describe('failuresToDiagnostics', () => {
  it('skips passed tests and maps failed ones with full location + error message', () => {
    const diagnostics = failuresToDiagnostics([
      makeSuite({
        file: 'a.test.ts',
        tests: [
          makeResult(),
          makeResult({
            passed: false,
            testName: 'divides',
            error: 'expected 2',
            location: { file: 'src/math.ts', line: 9, column: 5 },
          }),
        ],
      }),
    ]);
    expect(diagnostics).toEqual([
      {
        file: 'src/math.ts',
        line: 9,
        column: 5,
        severity: 'error',
        message: 'divides: expected 2',
        source: TEST_DIAGNOSTIC_SOURCE,
      },
    ]);
  });

  it('falls back to suite.file then 1/1 and "test failed" when details are missing', () => {
    const diagnostics = failuresToDiagnostics([
      makeSuite({ file: 'a.test.ts', tests: [makeResult({ passed: false })] }),
    ]);
    expect(diagnostics[0]).toEqual({
      file: 'a.test.ts',
      line: 1,
      column: 1,
      severity: 'error',
      message: 'adds numbers: test failed',
      source: TEST_DIAGNOSTIC_SOURCE,
    });
  });

  it('falls back to suite.name when neither test location nor suite.file exist', () => {
    const diagnostics = failuresToDiagnostics([
      makeSuite({ tests: [makeResult({ passed: false, error: 'x' })] }),
    ]);
    expect(diagnostics[0]?.file).toBe('math suite');
  });
});

describe('discoverTests', () => {
  it('sets the framework and idle nodes, toggling discovering true then false', async () => {
    const runner = makeRunner({
      discoverTests: vi.fn(async () => {
        expect(useTestExplorerStore.getState().discovering).toBe(true);
        return makeDiscovery();
      }),
    });
    await discoverTests(runner);

    const state = useTestExplorerStore.getState();
    expect(state.framework).toBe('vitest');
    expect(state.discovering).toBe(false);
    expect(state.error).toBeNull();
    expect(state.files).toEqual([
      {
        file: 'a.test.ts',
        status: 'idle',
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
      {
        file: 'b.test.ts',
        status: 'idle',
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
    ]);
  });

  it('records the Error message and clears discovering on failure', async () => {
    const runner = makeRunner({
      discoverTests: vi.fn().mockRejectedValue(new Error('no framework')),
    });
    await discoverTests(runner);
    const state = useTestExplorerStore.getState();
    expect(state.error).toBe('no framework');
    expect(state.discovering).toBe(false);
  });

  it('uses the fallback message for non-Error throws', async () => {
    const runner = makeRunner({ discoverTests: vi.fn().mockRejectedValue('nope') });
    await discoverTests(runner);
    expect(useTestExplorerStore.getState().error).toBe('Test discovery failed.');
  });
});

describe('runTestFile', () => {
  it('upserts the node under the forced file key and merges per-file diagnostics', async () => {
    // Seed another file's diagnostics plus a stale one for this file.
    useProblemsStore
      .getState()
      .actions.setSource(TEST_DIAGNOSTIC_SOURCE, [
        makeDiag(),
        makeDiag({ file: 'a.test.ts', message: 'stale: should be replaced' }),
      ]);
    const suite = makeSuite({
      // no `file` — the controller must force the requested key anyway
      name: 'renamed suite',
      tests: [
        makeResult(),
        makeResult({
          passed: false,
          testName: 'fails',
          error: 'bad',
          location: { file: 'a.test.ts', line: 4, column: 2 },
        }),
      ],
      totalTests: 2,
      passedTests: 1,
      failedTests: 1,
    });
    const runner = makeRunner({ runTests: vi.fn().mockResolvedValue(suite) });

    await runTestFile(runner, 'a.test.ts');

    expect(runner.runTests).toHaveBeenCalledWith('a.test.ts');
    const files = useTestExplorerStore.getState().files;
    expect(files).toHaveLength(1);
    expect(files[0]?.file).toBe('a.test.ts');
    expect(files[0]?.status).toBe('failed');

    const diagnostics = useProblemsStore.getState().bySource[TEST_DIAGNOSTIC_SOURCE];
    expect(diagnostics).toHaveLength(2);
    // The other file's diagnostic survives the merge...
    expect(diagnostics?.[0]).toEqual(makeDiag());
    // ...while this file's stale entry was replaced by the fresh failure.
    expect(diagnostics?.[1]?.file).toBe('a.test.ts');
    expect(diagnostics?.[1]?.message).toBe('fails: bad');
  });

  it('starts from an empty diagnostics source without crashing', async () => {
    const runner = makeRunner({
      runTests: vi
        .fn()
        .mockResolvedValue(
          makeSuite({ file: 'b.test.ts', tests: [makeResult()], totalTests: 1, passedTests: 1 })
        ),
    });
    await runTestFile(runner, 'b.test.ts');
    expect(useProblemsStore.getState().bySource[TEST_DIAGNOSTIC_SOURCE]).toEqual([]);
    expect(useTestExplorerStore.getState().files[0]?.status).toBe('passed');
  });

  it('marks the file failed and records the Error message on a thrown run', async () => {
    const runner = makeRunner({ runTests: vi.fn().mockRejectedValue(new Error('spawn fail')) });
    await runTestFile(runner, 'a.test.ts');
    const state = useTestExplorerStore.getState();
    expect(state.files[0]).toMatchObject({ file: 'a.test.ts', status: 'failed' });
    expect(state.error).toBe('spawn fail');
  });

  it('uses the fallback message for non-Error throws', async () => {
    const runner = makeRunner({ runTests: vi.fn().mockRejectedValue('nope') });
    await runTestFile(runner, 'a.test.ts');
    expect(useTestExplorerStore.getState().error).toBe('Test run failed.');
  });
});

describe('runAllTests', () => {
  it('upserts every suite and replaces the whole problems source', async () => {
    // Pre-seed a diagnostic that must NOT survive the run-all replacement.
    useProblemsStore
      .getState()
      .actions.setSource(TEST_DIAGNOSTIC_SOURCE, [makeDiag({ file: 'gone.test.ts' })]);
    const suites = [
      makeSuite({ file: 'a.test.ts', tests: [makeResult()], totalTests: 1, passedTests: 1 }),
      makeSuite({
        file: 'b.test.ts',
        tests: [makeResult({ passed: false, testName: 'fails', error: 'bad' })],
        totalTests: 1,
        failedTests: 1,
      }),
    ];
    const runner = makeRunner({
      runAllTests: vi.fn(async () => {
        expect(useTestExplorerStore.getState().runningAll).toBe(true);
        return suites;
      }),
    });

    await runAllTests(runner);

    const state = useTestExplorerStore.getState();
    expect(state.runningAll).toBe(false);
    expect(state.files.map(node => [node.file, node.status])).toEqual([
      ['a.test.ts', 'passed'],
      ['b.test.ts', 'failed'],
    ]);
    const diagnostics = useProblemsStore.getState().bySource[TEST_DIAGNOSTIC_SOURCE];
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics?.[0]?.file).toBe('b.test.ts');
    expect(diagnostics?.[0]?.message).toBe('fails: bad');
  });

  it('records the Error message and clears runningAll on failure', async () => {
    const runner = makeRunner({ runAllTests: vi.fn().mockRejectedValue(new Error('exploded')) });
    await runAllTests(runner);
    const state = useTestExplorerStore.getState();
    expect(state.error).toBe('exploded');
    expect(state.runningAll).toBe(false);
  });

  it('uses the fallback message for non-Error throws', async () => {
    const runner = makeRunner({ runAllTests: vi.fn().mockRejectedValue('nope') });
    await runAllTests(runner);
    expect(useTestExplorerStore.getState().error).toBe('Test run failed.');
  });
});

describe('runnerFactory', () => {
  it('creates a real TestRunner for the workspace (constructor does no I/O)', () => {
    const runner = runnerFactory.create('V:\\ws');
    expect(runner).toBeInstanceOf(TestRunner);
  });
});
