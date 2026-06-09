import { describe, expect, it, vi } from 'vitest';
import { ParlRewardShaper } from '../services/parl-reward-shaper.js';
import { MonorepoTaskRouter } from '../services/monorepo-task-router.js';

describe('PARL Reward Shaping Logic', () => {
  const shaper = new ParlRewardShaper();

  it('anneals auxiliary weight lambda_aux linearly over epochs', () => {
    // Early epoch (0): lambda_aux should be 0.1
    const resultEarly = shaper.calculateReward({
      epoch: 0,
      maxEpochs: 100,
      subAgentCount: 3,
      taskCompletionRate: 1.0,
      regressionFreeRate: 1.0,
      safetyViolationRate: 0.0,
      criticalSteps: 1,
      totalTasks: 3,
      isParallelExecution: true,
    });
    expect(resultEarly.lambdaAux).toBe(0.1);
    expect(resultEarly.rParallel).toBeGreaterThan(0.0);

    // Late epoch (100): lambda_aux should be 0.0
    const resultLate = shaper.calculateReward({
      epoch: 100,
      maxEpochs: 100,
      subAgentCount: 3,
      taskCompletionRate: 1.0,
      regressionFreeRate: 1.0,
      safetyViolationRate: 0.0,
      criticalSteps: 1,
      totalTasks: 3,
      isParallelExecution: true,
    });
    expect(resultLate.lambdaAux).toBe(0.0);
    expect(resultLate.rParallel).toBeGreaterThan(0.0); // r_parallel calculated, but weight is 0
  });

  it('enforces 80/20 terminal balance in late training', () => {
    // When epoch = maxEpochs, lambda_aux = 0, so reward = terminalReward
    const result = shaper.calculateReward({
      epoch: 100,
      maxEpochs: 100,
      subAgentCount: 4,
      taskCompletionRate: 1.0,
      regressionFreeRate: 1.0,
      safetyViolationRate: 0.0,
      criticalSteps: 1,
      totalTasks: 4,
      isParallelExecution: true,
      parallelOverheadPenaltyPerAgent: 0.15,
    });

    // Q(τ) = 1.0 * 1.0 * (1 - 0) = 1.0
    // E(τ) = (4 - 1 - (3 * 0.15)) / 4 = (3 - 0.45) / 4 = 2.55 / 4 = 0.6375
    // Terminal Reward = 0.8 * 1.0 + 0.2 * 0.6375 = 0.8 + 0.1275 = 0.9275
    expect(result.lambdaAux).toBe(0.0);
    expect(result.qualityScore).toBe(1.0);
    expect(result.efficiencyScore).toBe(0.6375);
    expect(result.reward).toBe(0.9275);
  });

  it('penalizes unnecessary parallel branching', () => {
    // Parallel run for 4 tasks in 1 step:
    const parallelResult = shaper.calculateReward({
      epoch: 100,
      maxEpochs: 100,
      subAgentCount: 4,
      taskCompletionRate: 1.0,
      regressionFreeRate: 1.0,
      safetyViolationRate: 0.0,
      criticalSteps: 1,
      totalTasks: 4,
      isParallelExecution: true,
      parallelOverheadPenaltyPerAgent: 0.15,
    });

    // Parallel run with very high branching penalty (e.g. 0.8):
    const highPenaltyResult = shaper.calculateReward({
      epoch: 100,
      maxEpochs: 100,
      subAgentCount: 4,
      taskCompletionRate: 1.0,
      regressionFreeRate: 1.0,
      safetyViolationRate: 0.0,
      criticalSteps: 1,
      totalTasks: 4,
      isParallelExecution: true,
      parallelOverheadPenaltyPerAgent: 0.8,
    });

    expect(highPenaltyResult.efficiencyScore).toBeLessThan(parallelResult.efficiencyScore);
    expect(highPenaltyResult.reward).toBeLessThan(parallelResult.reward);
  });
});

describe('MonorepoTaskRouter Strategy Selection', () => {
  const mockClassifier = {
    classify: vi.fn((name: string) => ({ name, root: `apps/${name}`, type: 'typescript' as const, tags: [] })),
    detectType: vi.fn(() => 'typescript' as const),
  };
  const router = new MonorepoTaskRouter(mockClassifier as any);

  it('chooses parallel strategy for a highly parallelizable wide-search task', () => {
    const goal = 'Search for logger patterns in files';
    const { strategy, rewardInfo } = router.route(goal, ['app-a', 'app-b', 'app-c'], 50, 100);

    expect(strategy).toBe('parallel');
    expect(rewardInfo).toBeDefined();
    // In parallel mode, critical steps = 1, giving high efficiency
    expect(rewardInfo!.efficiencyScore).toBeGreaterThan(0.0);
  });

  it('chooses sequential strategy for a sequential-strict task to avoid scaling', () => {
    const goal = 'first compile app-a then build app-b then deploy app-c';
    const { strategy, rewardInfo } = router.route(goal, ['app-a', 'app-b', 'app-c'], 50, 100);

    expect(strategy).toBe('sequential');
    expect(rewardInfo).toBeDefined();
    // Sequential mode has 0 branching penalty, so it outperforms parallel mode for sequential tasks
  });
});
