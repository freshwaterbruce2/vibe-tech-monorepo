import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { LoopBudget, LoopResult, TaskPlan } from './types.js';

const execFileAsync = promisify(execFile);

export interface GateInput {
  iteration: number;
  totalCostUsd: number;
  taskPlan: TaskPlan;
  budget: LoopBudget;
}

export interface GateResult {
  shouldStop: boolean;
  reason?: string;
}

/**
 * Evaluates termination conditions in priority order:
 * 1. Explicit DONE marker in task plan.
 * 2. Maximum iterations exceeded.
 * 3. Cost budget exceeded.
 * 4. Optional assertion command failure.
 */
export async function evaluateGates(input: GateInput): Promise<GateResult> {
  if (input.taskPlan.done) {
    return { shouldStop: true, reason: 'task plan marked done' };
  }

  if (input.iteration >= input.budget.maxIterations) {
    return { shouldStop: true, reason: 'maximum iterations reached' };
  }

  if (input.totalCostUsd >= input.budget.maxCostUsd) {
    return {
      shouldStop: true,
      reason: `cost budget $${input.budget.maxCostUsd.toFixed(2)} exceeded`,
    };
  }

  if (input.budget.assertionCommand) {
    const passed = await runAssertion(input.budget.assertionCommand);
    if (!passed) {
      return { shouldStop: true, reason: 'assertion gate failed' };
    }
  }

  return { shouldStop: false };
}

async function runAssertion(command: string): Promise<boolean> {
  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      command,
    ]);
    return true;
  } catch {
    return false;
  }
}

export function buildLoopResult(
  iterations: number,
  taskPlan: TaskPlan,
  terminationReason: string,
): LoopResult {
  return {
    iterations,
    taskPlan,
    success: taskPlan.done,
    terminationReason,
  };
}
