import { buildLoopResult, evaluateGates } from './gates.js';
import {
  appendProgress,
  assertSpecsImmutable,
  loadProgress,
  loadSpecs,
  loadTaskPlan,
  resolvePath,
  saveTaskPlan,
} from './state.js';
import type { LoopConfig, LoopResult, LoopSpec, ProviderClient, ProviderInput } from './types.js';

/**
 * Runs a Ralph fresh-context loop until a termination gate fires.
 *
 * Each iteration:
 * 1. Loads immutable specs.
 * 2. Loads mutable task plan and progress log.
 * 3. Invokes the provider with a fresh context.
 * 4. Persists the updated task plan and appends to progress.
 * 5. Re-evaluates termination gates.
 */
export async function runLoop(config: LoopConfig, provider: ProviderClient): Promise<LoopResult> {
  const specsDir = resolvePath(config.specsDir.toString());
  const taskPlanPath = resolvePath(config.taskPlanPath.toString());
  const progressPath = resolvePath(config.progressPath.toString());

  const specs = await loadSpecs(specsDir);
  let taskPlan = await loadTaskPlan(taskPlanPath);
  let totalCostUsd = 0;
  let iteration = 0;

  await appendProgress(progressPath, 'Loop started');

  while (true) {
    iteration += 1;

    await assertSpecsImmutable(specs);

    const gate = await evaluateGates({
      iteration,
      totalCostUsd,
      taskPlan,
      budget: config.budget,
    });

    if (gate.shouldStop) {
      await appendProgress(progressPath, `Loop stopped: ${gate.reason}`);
      return buildLoopResult(iteration, taskPlan, gate.reason ?? 'unknown');
    }

    const progress = await loadProgress(progressPath);
    const providerInput: ProviderInput = {
      specs,
      taskPlan,
      progress,
      iteration,
    };

    const output = await provider.runIteration(providerInput);

    taskPlan = output.updatedTaskPlan;
    await saveTaskPlan(taskPlanPath, taskPlan);
    await appendProgress(progressPath, output.logEntry);

    if (output.costUsd !== undefined) {
      totalCostUsd += output.costUsd;
    }
  }
}

export type { LoopConfig, LoopResult, LoopSpec, ProviderClient };
export { loadSpecs, loadTaskPlan };
