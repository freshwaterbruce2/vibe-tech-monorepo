import { CONFIG } from '../config.js';
import { MONOREPO_REGRESSION_PACK } from '../benchmarks/monorepo-regression-pack.js';
import type { BenchmarkMetricSet, BenchmarkReport, EvalSuiteResult, TaskSpec } from '../types.js';
import { runCommand } from '../tools/process-tools.js';

export function scoreMetrics(metrics: BenchmarkMetricSet): number {
  const completion = metrics.taskCompletionRate * 0.3;
  const regression = metrics.regressionFreePatchRate * 0.3;
  const safety = (1 - metrics.safetyViolationRate) * 0.25;
  const cost = Math.max(0, 1 - metrics.costPerSuccess / 10) * 0.075;
  const wallClock = Math.max(0, 1 - metrics.medianWallClockMs / 600000) * 0.075;
  return Number((completion + regression + safety + cost + wallClock).toFixed(4));
}

export class BenchmarkService {
  public getRegressionPack(): TaskSpec[] {
    return MONOREPO_REGRESSION_PACK;
  }

  public runRegressionPackSuites(workspaceRoot = CONFIG.WORKSPACE_ROOT): EvalSuiteResult[] {
    const fixtures = [
      {
        taskId: 'monorepo-health-audit',
        command: 'pnpm --dir apps/agent-engine build',
      },
      {
        taskId: 'quality-gate-affected',
        command: 'pnpm --dir apps/agent-engine lint',
      },
    ] as const;
    const suiteResults = fixtures.map((fixture) => {
      const result = runCommand(fixture.command, {
        cwd: workspaceRoot,
        timeout: 300000,
      });

      return {
        suite: `regression-${fixture.taskId}`,
        passed: result.success,
        score: result.success ? 1 : 0,
        threshold: 1,
        durationMs: result.durationMs,
        details: [result.stdout || result.stderr].filter(Boolean),
        rawOutput: `${result.stdout}\n${result.stderr}`.trim(),
      };
    });

    return [...suiteResults, this.runReviewAffectedChangesSuite(workspaceRoot)];
  }

  public createReport(suites: EvalSuiteResult[]): BenchmarkReport {
    const passedSuites = suites.filter((suite) => suite.passed).length;
    const metrics: BenchmarkMetricSet = {
      taskCompletionRate: passedSuites / Math.max(suites.length, 1),
      regressionFreePatchRate: passedSuites / Math.max(suites.length, 1),
      safetyViolationRate: suites.some((suite) => !suite.passed)
        ? 1 - passedSuites / suites.length
        : 0,
      costPerSuccess: 1,
      medianWallClockMs:
        suites.length === 0
          ? 0
          : (suites.map((suite) => suite.durationMs).sort((left, right) => left - right)[
              Math.floor(suites.length / 2)
            ] ?? 0),
    };

    return {
      name: 'local-monorepo-benchmark',
      score: scoreMetrics(metrics),
      metrics,
      suites,
      recommendations: suites
        .filter((suite) => !suite.passed)
        .map((suite) => `Fix failing suite: ${suite.suite}`),
    };
  }

  public runExternalLane(): EvalSuiteResult | null {
    if (!CONFIG.AGENT_ENGINE_EXTERNAL_BENCHMARK_CMD) {
      return null;
    }

    const result = runCommand(CONFIG.AGENT_ENGINE_EXTERNAL_BENCHMARK_CMD, {
      cwd: CONFIG.WORKSPACE_ROOT,
      timeout: 3600000,
    });

    return {
      suite: 'external-offline-benchmark',
      passed: result.success,
      score: result.success ? 1 : 0,
      threshold: 0.8,
      durationMs: result.durationMs,
      details: [result.stdout || result.stderr].filter(Boolean),
      rawOutput: `${result.stdout}\n${result.stderr}`.trim(),
    };
  }

  private runReviewAffectedChangesSuite(workspaceRoot: string): EvalSuiteResult {
    const commands = [
      'git -c core.pager=cat diff --name-only main...HEAD',
      'git -c core.pager=cat diff --name-only HEAD~1..HEAD',
      'git -c core.pager=cat status --short',
    ];

    for (const command of commands) {
      const result = runCommand(command, {
        cwd: workspaceRoot,
        timeout: 300000,
      });

      if (result.success) {
        return {
          suite: 'regression-review-affected-changes',
          passed: true,
          score: 1,
          threshold: 1,
          durationMs: result.durationMs,
          details: [`Resolved with command: ${command}`, result.stdout || '(no changes reported)'],
          rawOutput: `${result.stdout}\n${result.stderr}`.trim(),
        };
      }
    }

    const primaryCommand = commands[0] ?? 'git -c core.pager=cat diff --name-only main...HEAD';
    const failure = runCommand(primaryCommand, {
      cwd: workspaceRoot,
      timeout: 300000,
    });

    return {
      suite: 'regression-review-affected-changes',
      passed: false,
      score: 0,
      threshold: 1,
      durationMs: failure.durationMs,
      details: [
        'All review-affected-changes fallback commands failed.',
        ...commands,
        failure.stderr || failure.stdout,
      ].filter(Boolean),
      rawOutput: `${failure.stdout}\n${failure.stderr}`.trim(),
    };
  }
}
