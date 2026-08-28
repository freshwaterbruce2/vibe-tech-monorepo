import { randomUUID } from 'crypto';
import { MoonshotProvider } from '../providers/moonshot-provider.js';
import { ExecutionService } from '../services/execution-service.js';
import type { TaskSpec } from '../types.js';

export async function runOrchestrator(title: string, objective: string): Promise<void> {
  const task: TaskSpec = {
    id: randomUUID(),
    title,
    objective,
    constraints: ['Local monorepo only', 'Use Nx-backed validation', 'No destructive git commands'],
    acceptanceCriteria: ['Task trace stored', 'Plan generated', 'No safety boundary crossed'],
  };

  const service = new ExecutionService(new MoonshotProvider());
  const result = await service.runTask(task);

  console.log(JSON.stringify(result.trace, null, 2));
}

if (process.argv[1]?.endsWith('orchestrator.ts')) {
  const [title = 'Untitled task', objective = 'No objective provided'] = process.argv.slice(2);
  runOrchestrator(title, objective).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
