import { runLoop } from './loop.js';
import type { LoopBudget, LoopConfig, ProviderInput, ProviderOutput } from './types.js';

class DummyProvider {
  async runIteration(input: ProviderInput): Promise<ProviderOutput> {
    const nextTask = input.taskPlan.tasks.find((t) => t.status === 'pending');

    if (nextTask === undefined) {
      return {
        updatedTaskPlan: { ...input.taskPlan, done: true },
        logEntry: `No pending tasks; marking done at iteration ${input.iteration}`,
        costUsd: 0.001,
      };
    }

    const tasks = input.taskPlan.tasks.map((t) =>
      t.id === nextTask.id ? { ...t, status: 'done' as const } : t,
    );

    return {
      updatedTaskPlan: { ...input.taskPlan, tasks },
      logEntry: `Completed task ${nextTask.id} at iteration ${input.iteration}`,
      costUsd: 0.001,
    };
  }
}

function readEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function main(): Promise<void> {
  const specsDir = readEnv('RALPH_SPECS_DIR');
  const taskPlanPath = readEnv('RALPH_TASK_PLAN');
  const progressPath = readEnv('RALPH_PROGRESS');
  const providerEndpoint = readEnv('RALPH_PROVIDER', 'http://localhost:8787/v1/chat/completions');
  const maxIterations = Number.parseInt(readEnv('RALPH_MAX_ITERATIONS', '10'), 10);
  const maxCostUsd = Number.parseFloat(readEnv('RALPH_MAX_COST', '5'));

  const budget: LoopBudget = {
    maxIterations,
    maxCostUsd,
  };

  const config: LoopConfig = {
    specsDir,
    taskPlanPath,
    progressPath,
    budget,
    providerEndpoint,
  };

  const result = await runLoop(config, new DummyProvider());

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
