import type { BenchmarkReport, CandidateRevision, EvalSuiteResult } from '../types.js';
import { PromotionService } from '../services/promotion-service.js';

function createCandidate(): CandidateRevision {
  return {
    id: 'candidate-1',
    createdAt: new Date().toISOString(),
    reason: 'Tune behavioral prompts',
    expectedImprovement: 'Higher behavioral score',
    benchmarkScope: ['repo-local', 'behavioral'],
    rollbackRef: 'abc123',
    branchName: 'codex/agent-engine-candidate-1',
    worktreePath: 'C:\\dev\\.tmp\\candidate-1',
    filesTouched: ['apps/agent-engine/src/services/evaluation-service.ts'],
    diffSummary: 'Improve behavioral prompts',
    status: 'pending',
  };
}

function createSuite(
  suite: string,
  passed: boolean,
  score: number,
  rawOutput?: string,
): EvalSuiteResult {
  return {
    suite,
    passed,
    score,
    threshold: 1,
    durationMs: 10,
    details: [],
    rawOutput,
  };
}

function createBenchmark(suites: EvalSuiteResult[]): BenchmarkReport {
  return {
    name: 'benchmark',
    score: 0.95,
    metrics: {
      taskCompletionRate: 1,
      regressionFreePatchRate: 1,
      safetyViolationRate: 0,
      costPerSuccess: 1,
      medianWallClockMs: 100,
    },
    suites,
    recommendations: [],
  };
}

describe('promotion service', () => {
  it('rejects candidates when behavioral suites fail and surfaces failed case ids', () => {
    const service = new PromotionService();
    const benchmark = createBenchmark([
      createSuite(
        'behavioral-web-search-grounding',
        false,
        0.7,
        JSON.stringify({
          cases: [
            { id: 'TEST-001', passed: false },
            { id: 'TEST-002', passed: true },
          ],
        }),
      ),
    ]);
    const repoSuites = [createSuite('nx-agent-engine-build', true, 1)];

    const decision = service.evaluate(createCandidate(), benchmark, repoSuites);

    expect(decision.decision).toBe('rejected');
    expect(decision.reasons).toContain(
      'Behavioral suite behavioral-web-search-grounding failed at 0.70.',
    );
    expect(decision.behavioralFailedCaseIds).toContain('TEST-001');
  });
});
