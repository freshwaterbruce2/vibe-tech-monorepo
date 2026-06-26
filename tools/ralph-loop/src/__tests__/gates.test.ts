import { describe, expect, it } from 'vitest';
import { buildLoopResult, evaluateGates } from '../gates.js';
import type { LoopBudget, TaskPlan } from '../types.js';

const defaultBudget: LoopBudget = {
  maxIterations: 3,
  maxCostUsd: 5,
};

const pendingPlan: TaskPlan = {
  phase: 'implement',
  tasks: [],
  context: {},
  done: false,
};

describe('evaluateGates', () => {
  it('stops when task plan is marked done', async () => {
    const result = await evaluateGates({
      iteration: 1,
      totalCostUsd: 0,
      taskPlan: { ...pendingPlan, done: true },
      budget: defaultBudget,
    });

    expect(result.shouldStop).toBe(true);
    expect(result.reason).toBe('task plan marked done');
  });

  it('stops when max iterations reached', async () => {
    const result = await evaluateGates({
      iteration: 3,
      totalCostUsd: 0,
      taskPlan: pendingPlan,
      budget: defaultBudget,
    });

    expect(result.shouldStop).toBe(true);
    expect(result.reason).toBe('maximum iterations reached');
  });

  it('stops when cost budget exceeded', async () => {
    const result = await evaluateGates({
      iteration: 1,
      totalCostUsd: 6,
      taskPlan: pendingPlan,
      budget: defaultBudget,
    });

    expect(result.shouldStop).toBe(true);
    expect(result.reason).toContain('cost budget');
  });

  it('continues when no gate is triggered', async () => {
    const result = await evaluateGates({
      iteration: 1,
      totalCostUsd: 0.5,
      taskPlan: pendingPlan,
      budget: defaultBudget,
    });

    expect(result.shouldStop).toBe(false);
  });
});

describe('buildLoopResult', () => {
  it('marks success when plan is done', () => {
    const result = buildLoopResult(2, { ...pendingPlan, done: true }, 'done');
    expect(result.success).toBe(true);
    expect(result.iterations).toBe(2);
  });

  it('marks failure when plan is not done', () => {
    const result = buildLoopResult(3, pendingPlan, 'max iterations');
    expect(result.success).toBe(false);
  });
});
