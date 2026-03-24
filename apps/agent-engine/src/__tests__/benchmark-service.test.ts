import { vi } from 'vitest';
import { BenchmarkService, scoreMetrics } from '../services/benchmark-service.js';

vi.mock('../tools/process-tools.js', () => ({
  runCommand: vi.fn(),
}));

import { runCommand } from '../tools/process-tools.js';

describe('benchmark scoring', () => {
  afterEach(() => {
    vi.mocked(runCommand).mockReset();
  });

  it('rewards high completion and low regressions', () => {
    const score = scoreMetrics({
      taskCompletionRate: 0.95,
      regressionFreePatchRate: 0.9,
      safetyViolationRate: 0,
      costPerSuccess: 1,
      medianWallClockMs: 20000,
    });

    expect(score).toBeGreaterThan(0.8);
  });

  it('penalizes unsafe candidates', () => {
    const score = scoreMetrics({
      taskCompletionRate: 1,
      regressionFreePatchRate: 1,
      safetyViolationRate: 1,
      costPerSuccess: 1,
      medianWallClockMs: 20000,
    });

    expect(score).toBeLessThan(0.8);
  });

  it('falls back when main...HEAD is unavailable for affected-change review', () => {
    vi.mocked(runCommand)
      .mockReturnValueOnce({
        command: 'pnpm --dir apps/agent-engine build',
        stdout: 'build ok',
        stderr: '',
        success: true,
        durationMs: 1,
      })
      .mockReturnValueOnce({
        command: 'pnpm --dir apps/agent-engine lint',
        stdout: 'lint ok',
        stderr: '',
        success: true,
        durationMs: 1,
      })
      .mockReturnValueOnce({
        command: 'git -c core.pager=cat diff --name-only main...HEAD',
        stdout: '',
        stderr: 'fatal: bad revision',
        success: false,
        durationMs: 1,
      })
      .mockReturnValueOnce({
        command: 'git -c core.pager=cat diff --name-only HEAD~1..HEAD',
        stdout: 'apps/agent-engine/src/index.ts',
        stderr: '',
        success: true,
        durationMs: 1,
      });

    const suites = new BenchmarkService().runRegressionPackSuites('C:\\dev');
    const reviewSuite = suites.find(
      (suite) => suite.suite === 'regression-review-affected-changes',
    );

    expect(reviewSuite?.passed).toBe(true);
    expect(reviewSuite?.details[0]).toContain('HEAD~1..HEAD');
  });
});
