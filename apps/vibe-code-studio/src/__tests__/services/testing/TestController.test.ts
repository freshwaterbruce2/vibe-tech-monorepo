/**
 * TestController tests — spec 08 Phase 1. Pure mappers (result/suite/diagnostic
 * shaping) plus orchestration against the REAL testExplorer + problems stores
 * with a fake injected TestRunnerLike.
 *
 * Diagnostics are now namespaced per file ('test:<file>') via testSourceKey:
 * runTestFile replaces only that file's source; runAllTests first clears every
 * stale 'test:'-prefixed source then writes one source per suite. Skipped
 * (todo/pending) tests map to a 'skipped' node, never inflate the failure
 * count, and emit no diagnostic.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TEST_DIAGNOSTIC_PREFIX,
  discoverTests,
  failuresToDiagnostics,
  resultToCaseNode,
  runAllTests,
  runTestFile,
  runnerFactory,
  suiteToFileNode,
  testSourceKey,
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
  source: testSourceKey('other.test.ts'),
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

describe('testSourceKey / TEST_DIAGNOSTIC_PREFIX', () => {
  it('namespaces a file under the test: prefix', () => {
    expect(TEST_DIAGNOSTIC_PREFIX).toBe('test:');
    expect(testSourceKey('a.test.ts')).toBe('test:a.test.ts');
  });
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

  it('maps a skipped result to a skipped node (not failed)', () => {
    const node = resultToCaseNode(
      makeResult({ passed: false, skipped: true, testName: 'todo' }),
      1
    );
    expect(node.status).toBe('skipped');
    expect(node.name).toBe('todo');
  });
});

describe('suiteToFileNode', () => {
  it('recomputes passed/failed/skipped from the mapped nodes, ignoring suite counts', () => {
    const node = suiteToFileNode(
      makeSuite({
        file: 'a.test.ts',
        tests: [
          makeResult(),
          makeResult({ passed: false, error: 'nope', testName: 'breaks' }),
          makeResult({ passed: false, skipped: true, testName: 'skips' }),
        ],
        // Deliberately wrong suite-level counts — the parser folds skipped into
        // failedTests, so the node must derive its own counts from the nodes.
        totalTests: 3,
        passedTests: 99,
        failedTests: 99,
        skippedTests: 99,
        duration: 40,
      })
    );
    expect(node.file).toBe('a.test.ts');
    expect(node.status).toBe('failed');
    expect(node.tests).toHaveLength(3);
    expect(node.passed).toBe(1);
    expect(node.failed).toBe(1);
    expect(node.skipped).toBe(1);
    expect(node.duration).toBe(40);
  });

  it('marks the file passed when all tests pass and defaults skipped to 0', () => {
    const node = suiteToFileNode(
      makeSuite({ file: 'b.test.ts', tests: [makeResult()], totalTests: 1, passedTests: 1 })
    );
    expect(node.status).toBe('passed');
    expect(node.skipped).toBe(0);
  });

  it('counts a skip-only suite as passed (no failures) with the right skipped count', () => {
    const node = suiteToFileNode(
      makeSuite({
        file: 'c.test.ts',
        tests: [
          makeResult({ passed: false, skipped: true }),
          makeResult({ passed: false, skipped: true }),
        ],
      })
    );
    expect(node.status).toBe('passed');
    expect(node.failed).toBe(0);
    expect(node.skipped).toBe(2);
  });

  it('marks an empty suite idle and falls back to the suite name for file', () => {
    const node = suiteToFileNode(makeSuite());
    expect(node.file).toBe('math suite');
    expect(node.status).toBe('idle');
    expect(node.tests).toEqual([]);
  });
});

describe('failuresToDiagnostics', () => {
  it('skips passed AND skipped tests, mapping only real failures with full location', () => {
    const diagnostics = failuresToDiagnostics([
      makeSuite({
        file: 'a.test.ts',
        tests: [
          makeResult(),
          makeResult({ passed: false, skipped: true, testName: 'todo later' }),
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
        source: testSourceKey('a.test.ts'),
      },
    ]);
  });

  it('emits no diagnostic when every failing test is actually skipped', () => {
    const diagnostics = failuresToDiagnostics([
      makeSuite({
        file: 'a.test.ts',
        tests: [makeResult({ passed: false, skipped: true })],
      }),
    ]);
    expect(diagnostics).toEqual([]);
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
      source: testSourceKey('a.test.ts'),
    });
  });

  it('falls back to suite.name when neither test location nor suite.file exist', () => {
    const diagnostics = failuresToDiagnostics([
      makeSuite({ tests: [makeResult({ passed: false, error: 'x' })] }),
    ]);
    expect(diagnostics[0]?.file).toBe('math suite');
    expect(diagnostics[0]?.source).toBe(testSourceKey('math suite'));
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
  it("replaces only THIS file's per-file diagnostics source, leaving others intact", async () => {
    // Another file's source (must survive) + a stale entry under this file's key.
    useProblemsStore.getState().actions.setSource(testSourceKey('other.test.ts'), [makeDiag()]);
    useProblemsStore.getState().actions.setSource(testSourceKey('a.test.ts'), [
      makeDiag({
        file: 'a.test.ts',
        message: 'stale: should be replaced',
        source: testSourceKey('a.test.ts'),
      }),
    ]);
    const suite = makeSuite({
      // no `file` — the controller must force the requested file key anyway
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

    const bySource = useProblemsStore.getState().bySource;
    // The other file's source is untouched.
    expect(bySource[testSourceKey('other.test.ts')]).toEqual([makeDiag()]);
    // This file's source was fully replaced by the fresh failure.
    const fresh = bySource[testSourceKey('a.test.ts')];
    expect(fresh).toHaveLength(1);
    expect(fresh?.[0]?.file).toBe('a.test.ts');
    expect(fresh?.[0]?.message).toBe('fails: bad');
  });

  it('writes an empty per-file source for a fully passing run', async () => {
    const runner = makeRunner({
      runTests: vi
        .fn()
        .mockResolvedValue(
          makeSuite({ file: 'b.test.ts', tests: [makeResult()], totalTests: 1, passedTests: 1 })
        ),
    });
    await runTestFile(runner, 'b.test.ts');
    expect(useProblemsStore.getState().bySource[testSourceKey('b.test.ts')]).toEqual([]);
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
  it('clears stale test: sources, keeps non-test sources, and writes one source per suite', async () => {
    // A stale test: source (must be cleared) + a non-test source (must survive).
    useProblemsStore
      .getState()
      .actions.setSource(testSourceKey('gone.test.ts'), [
        makeDiag({ file: 'gone.test.ts', source: testSourceKey('gone.test.ts') }),
      ]);
    useProblemsStore
      .getState()
      .actions.setSource('lsp:keep.ts', [makeDiag({ source: 'lsp:keep.ts' })]);
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

    const bySource = useProblemsStore.getState().bySource;
    // Stale test: source cleared; the LSP source left alone.
    expect(bySource[testSourceKey('gone.test.ts')]).toBeUndefined();
    expect(bySource['lsp:keep.ts']).toBeDefined();
    // Each suite lands under its own per-file key.
    expect(bySource[testSourceKey('a.test.ts')]).toEqual([]);
    const b = bySource[testSourceKey('b.test.ts')];
    expect(b).toHaveLength(1);
    expect(b?.[0]?.file).toBe('b.test.ts');
    expect(b?.[0]?.message).toBe('fails: bad');
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
