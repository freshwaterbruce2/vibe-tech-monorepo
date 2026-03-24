import { DEFAULT_POLICY_BUNDLE } from '../policy/default-policy.js';
import { evaluateCandidateAgainstPolicy } from '../policy/guardrails.js';
import type {
  BenchmarkReport,
  CandidateRevision,
  EvalSuiteResult,
  PromotionDecision,
} from '../types.js';

export class PromotionService {
  public evaluate(
    candidate: CandidateRevision,
    benchmark: BenchmarkReport,
    repoSuites: EvalSuiteResult[],
  ): PromotionDecision {
    const reasons: string[] = [];
    const policyCheck = evaluateCandidateAgainstPolicy(candidate, DEFAULT_POLICY_BUNDLE);

    if (!policyCheck.safe) {
      reasons.push(...policyCheck.reasons);
    }

    const repoEvalScore =
      repoSuites.length === 0
        ? 0
        : repoSuites.reduce((total, suite) => total + suite.score, 0) / repoSuites.length;

    if (benchmark.score < DEFAULT_POLICY_BUNDLE.promotionThresholds.benchmarkScore) {
      reasons.push(
        `Benchmark score ${benchmark.score} is below threshold ${DEFAULT_POLICY_BUNDLE.promotionThresholds.benchmarkScore}.`,
      );
    }

    if (repoEvalScore < DEFAULT_POLICY_BUNDLE.promotionThresholds.repoEvalScore) {
      reasons.push(
        `Repo eval score ${repoEvalScore} is below threshold ${DEFAULT_POLICY_BUNDLE.promotionThresholds.repoEvalScore}.`,
      );
    }

    const failedBehavioralSuites = benchmark.suites.filter(
      (suite) => suite.suite.startsWith('behavioral-') && !suite.passed,
    );
    const behavioralSuites = benchmark.suites.filter((suite) =>
      suite.suite.startsWith('behavioral-'),
    );
    if (failedBehavioralSuites.length > 0) {
      reasons.push(
        ...failedBehavioralSuites.map(
          (suite) => `Behavioral suite ${suite.suite} failed at ${suite.score.toFixed(2)}.`,
        ),
      );
    }

    if (
      benchmark.metrics.safetyViolationRate >
      DEFAULT_POLICY_BUNDLE.promotionThresholds.maxSafetyViolationRate
    ) {
      reasons.push(
        `Safety violation rate ${benchmark.metrics.safetyViolationRate} exceeds threshold ${DEFAULT_POLICY_BUNDLE.promotionThresholds.maxSafetyViolationRate}.`,
      );
    }

    return {
      candidateId: candidate.id,
      decision: reasons.length === 0 ? 'accepted' : 'rejected',
      reasons,
      benchmarkScore: benchmark.score,
      suites: repoSuites,
      behavioralScore:
        behavioralSuites.length > 0
          ? behavioralSuites.reduce((total, suite) => total + suite.score, 0) /
            behavioralSuites.length
          : undefined,
      behavioralFailedCaseIds: failedBehavioralSuites.flatMap((suite) => {
        try {
          const parsed = JSON.parse(suite.rawOutput ?? '{}') as {
            cases?: Array<{ id: string; passed: boolean }>;
          };
          return (parsed.cases ?? []).filter((entry) => !entry.passed).map((entry) => entry.id);
        } catch {
          return [];
        }
      }),
    };
  }
}
