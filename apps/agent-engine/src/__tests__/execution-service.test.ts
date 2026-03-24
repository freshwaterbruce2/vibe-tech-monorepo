import { vi } from 'vitest';
import { ExecutionService } from '../services/execution-service.js';
import type { BenchmarkReport, CandidateRevision, EvalSuiteResult, LlmProvider } from '../types.js';

function createSuite(name: string, passed = true): EvalSuiteResult {
  return {
    suite: name,
    passed,
    score: passed ? 1 : 0,
    threshold: 1,
    durationMs: 10,
    details: [passed ? 'ok' : 'failed'],
  };
}

function createBenchmark(score: number): BenchmarkReport {
  return {
    name: 'test-benchmark',
    score,
    metrics: {
      taskCompletionRate: score,
      regressionFreePatchRate: score,
      safetyViolationRate: 0,
      costPerSuccess: 1,
      medianWallClockMs: 100,
    },
    suites: [],
    recommendations: [],
  };
}

function createCandidate(filesTouched: string[]): CandidateRevision {
  return {
    id: 'candidate-1',
    createdAt: new Date().toISOString(),
    reason: 'Tune orchestrator prompts',
    expectedImprovement: 'Higher solve rate',
    benchmarkScope: ['repo-local'],
    rollbackRef: 'abc123',
    branchName: 'codex/agent-engine-candidate-1',
    worktreePath: 'C:\\dev\\.tmp\\candidate-1',
    filesTouched,
    diffSummary: 'Adjust agent-engine services only',
    status: 'pending',
    rollback: {
      pointerRef: 'abc123',
      pointerPath: 'C:\\dev\\.tmp\\candidate-1.json',
      status: 'ready',
    },
  };
}

function createHarness(options: {
  candidate: CandidateRevision;
  benchmark: BenchmarkReport;
  repoSuites?: EvalSuiteResult[];
}) {
  let currentCandidate = options.candidate;
  const provider: LlmProvider = {
    name: 'fake-provider',
    generateText: vi.fn().mockResolvedValue({ text: 'role output' }),
  };
  const traceRepository = {
    save: vi.fn(),
  };
  const candidateRepository = {
    get: vi.fn(() => currentCandidate),
    save: vi.fn(),
    update: vi.fn(
      (candidateId: string, updater: (candidate: CandidateRevision) => CandidateRevision) => {
        expect(candidateId).toBe(currentCandidate.id);
        currentCandidate = updater(currentCandidate);
        return currentCandidate;
      },
    ),
  };
  const benchmarkService = {
    runRegressionPackSuites: vi.fn(() => []),
    runExternalLane: vi.fn(() => null),
    createReport: vi.fn(() => options.benchmark),
  };
  const evaluationService = {
    runNxProjectSuites: vi.fn(() => options.repoSuites ?? [createSuite('nx-agent-engine-build')]),
    runBehavioralSuites: vi.fn(() => []),
  };
  const memoryClient = {
    add: vi.fn().mockResolvedValue(true),
    logAntiPattern: vi.fn().mockResolvedValue(true),
    getRecent: vi.fn(() => []),
  };
  const worktreeService = {
    remove: vi.fn(),
  };
  const promotionService = {
    evaluate: vi.fn(
      (
        candidate: CandidateRevision,
        benchmark: BenchmarkReport,
        repoSuites: EvalSuiteResult[],
      ) => ({
        candidateId: candidate.id,
        decision: benchmark.score >= 0.8 ? 'accepted' : 'rejected',
        reasons: benchmark.score >= 0.8 ? [] : ['Benchmark score 0.5 is below threshold 0.8.'],
        benchmarkScore: benchmark.score,
        suites: repoSuites,
      }),
    ),
  };
  const evaluationServiceFactory = vi.fn(() => evaluationService);

  const service = new ExecutionService(
    provider,
    traceRepository as never,
    candidateRepository as never,
    benchmarkService as never,
    evaluationService as never,
    memoryClient as never,
    worktreeService as never,
    promotionService as never,
    evaluationServiceFactory as never,
  );

  return {
    service,
    candidateRepository,
    benchmarkService,
    evaluationServiceFactory,
    memoryClient,
    worktreeService,
    getCandidate: () => currentCandidate,
  };
}

describe('execution service promotion flow', () => {
  it('rejects a candidate for policy violation', async () => {
    const harness = createHarness({
      candidate: createCandidate(['.github/workflows/ci.yml']),
      benchmark: createBenchmark(0.95),
    });

    const result = await harness.service.promoteCandidate('candidate-1');

    expect(result.promotionDecision?.decision).toBe('rejected');
    expect(result.promotionDecision?.reasons.join('\n')).toContain('forbidden area');
    expect(harness.memoryClient.logAntiPattern).toHaveBeenCalledTimes(1);
    expect(harness.worktreeService.remove).toHaveBeenCalledWith(
      'C:\\dev\\.tmp\\candidate-1',
      'codex/agent-engine-candidate-1',
    );
  });

  it('rejects a candidate for benchmark regression', async () => {
    const harness = createHarness({
      candidate: createCandidate(['apps/agent-engine/src/services/execution-service.ts']),
      benchmark: createBenchmark(0.5),
    });

    const result = await harness.service.promoteCandidate('candidate-1');

    expect(result.promotionDecision?.decision).toBe('rejected');
    expect(result.promotionDecision?.reasons).toContain(
      'Benchmark score 0.5 is below threshold 0.8.',
    );
    expect(harness.benchmarkService.createReport).toHaveBeenCalledTimes(1);
  });

  it('logs failed candidates to memory as anti-patterns', async () => {
    const harness = createHarness({
      candidate: createCandidate(['apps/agent-engine/src/services/execution-service.ts']),
      benchmark: createBenchmark(0.5),
    });

    await harness.service.promoteCandidate('candidate-1');

    expect(harness.memoryClient.logAntiPattern).toHaveBeenCalledWith(
      expect.stringContaining('Benchmark regression or gate failure'),
      expect.stringContaining('Benchmark score 0.5 is below threshold 0.8.'),
      expect.objectContaining({
        candidateId: 'candidate-1',
      }),
    );
  });

  it('marks rollback as applied when rejection cleanup runs', async () => {
    const harness = createHarness({
      candidate: createCandidate(['apps/agent-engine/src/services/execution-service.ts']),
      benchmark: createBenchmark(0.5),
    });

    await harness.service.promoteCandidate('candidate-1');

    expect(harness.getCandidate().rollback?.status).toBe('applied');
    expect(harness.getCandidate().rollback?.reason).toBe('Benchmark regression or gate failure');
    expect(harness.candidateRepository.update).toHaveBeenCalled();
  });
});
