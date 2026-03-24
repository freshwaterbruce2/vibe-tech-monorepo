import { AnthropicProvider } from '../providers/anthropic-provider.js';
import { ExecutionService } from '../services/execution-service.js';
import { MemoryClient } from '../services/memory-client.js';
import { MonorepoTaskRouter, type RoutedTask } from '../services/monorepo-task-router.js';
import type { LlmProvider, RunTrace, TaskSpec } from '../types.js';

const MAX_PARALLEL = 6;
const MAX_REACT_ITERATIONS = 3;

export interface ProjectResult {
  project: string;
  status: 'succeeded' | 'failed' | 'skipped';
  trace: RunTrace;
}

export interface OrchestrationResult {
  goal: string;
  iterations: number;
  projectResults: ProjectResult[];
  succeeded: boolean;
  summary: string;
}

export async function orchestrateMonorepo(
  goal: string,
  affectedProjects?: string[],
  provider: LlmProvider = new AnthropicProvider(),
): Promise<OrchestrationResult> {
  const router = new MonorepoTaskRouter();
  const memory = new MemoryClient();
  const executor = new ExecutionService(provider);
  const { tasks } = router.route(goal, affectedProjects);

  if (tasks.length === 0) {
    return buildResult(goal, 0, []);
  }

  const results = new Map<string, ProjectResult>();
  let pending = [...tasks];
  let iterations = 0;

  while (pending.length > 0 && iterations < MAX_REACT_ITERATIONS) {
    iterations++;
    const batch = pending.splice(0, MAX_PARALLEL);
    const settled = await Promise.allSettled(batch.map(({ task }) => executor.runTask(task)));
    const retryNeeded: RoutedTask[] = [];

    settled.forEach((outcome, i) => {
      const routedTask = batch[i];
      if (!routedTask) return;
      const { project, task } = routedTask;

      if (outcome.status === 'fulfilled') {
        const { trace } = outcome.value;
        const status = trace.status === 'succeeded' ? 'succeeded' : 'failed';
        results.set(project.name, { project: project.name, status, trace });
        if (trace.status !== 'succeeded' && iterations < MAX_REACT_ITERATIONS) {
          retryNeeded.push(routedTask);
        }
      } else {
        const message = (outcome.reason as Error).message ?? 'Unknown error';
        results.set(project.name, {
          project: project.name,
          status: 'failed',
          trace: buildErrorTrace(task, message),
        });
        if (iterations < MAX_REACT_ITERATIONS) {
          retryNeeded.push(routedTask);
        }
      }
    });

    pending = [...retryNeeded, ...pending];
  }

  // Mark anything still in pending as skipped (exhausted MAX_REACT_ITERATIONS)
  for (const { project, task } of pending) {
    if (!results.has(project.name)) {
      results.set(project.name, {
        project: project.name,
        status: 'skipped',
        trace: buildErrorTrace(task, `Skipped: iteration limit (${MAX_REACT_ITERATIONS}) reached.`),
      });
    }
  }

  const projectResults = [...results.values()];
  const failed = projectResults.filter((r) => r.status === 'failed');
  const succeeded = projectResults.filter((r) => r.status === 'succeeded');

  await memory.add({
    kind: 'episodic',
    title: `Monorepo orchestration: ${goal.slice(0, 80)}`,
    text: `${succeeded.length}/${projectResults.length} projects succeeded in ${iterations} iterations.`,
    tags: ['orchestration'],
    metadata: {
      goal,
      iterations,
      failedProjects: failed.map((r) => r.project),
    },
  });

  return buildResult(goal, iterations, projectResults);
}

function buildResult(
  goal: string,
  iterations: number,
  projectResults: ProjectResult[],
): OrchestrationResult {
  const failed = projectResults.filter((r) => r.status === 'failed');
  const succeeded = projectResults.filter((r) => r.status === 'succeeded');
  const skipped = projectResults.filter((r) => r.status === 'skipped');
  const summary = [
    `Goal: ${goal}`,
    `Iterations: ${iterations}`,
    `Projects: ${projectResults.length} total — ${succeeded.length} succeeded, ${failed.length} failed, ${skipped.length} skipped`,
    ...(failed.length > 0 ? [`Failed: ${failed.map((r) => r.project).join(', ')}`] : []),
  ].join('\n');
  return {
    goal,
    iterations,
    projectResults,
    succeeded: failed.length === 0 && skipped.length === 0,
    summary,
  };
}

function buildErrorTrace(task: TaskSpec, message: string): RunTrace {
  const now = new Date().toISOString();
  return {
    id: task.id,
    task,
    startedAt: now,
    completedAt: now,
    status: 'failed',
    tools: [],
    filesTouched: [],
    reviewerFindings: [{ severity: 'critical', summary: message }],
    evalResults: [],
    roleTransitions: [],
    summary: message,
  };
}

// CLI entrypoint
if (process.argv[1]?.endsWith('monorepo-orchestrator.ts')) {
  const [, , goal = '', projectsCsv] = process.argv;
  if (!goal) {
    console.error(
      'Usage: tsx src/agents/monorepo-orchestrator.ts "<goal>" [project1,project2,...]',
    );
    process.exit(1);
  }
  const projects = projectsCsv
    ?.split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  orchestrateMonorepo(goal, projects)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.succeeded) process.exit(1);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
