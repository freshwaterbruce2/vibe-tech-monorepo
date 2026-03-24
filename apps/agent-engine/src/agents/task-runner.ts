import { AnthropicProvider } from '../providers/anthropic-provider.js';
import { ExecutionService } from '../services/execution-service.js';
import type { TaskSpec } from '../types.js';

export async function runTaskRunner(task: TaskSpec): Promise<void> {
  const service = new ExecutionService(new AnthropicProvider());
  const result = await service.runTask(task);
  console.log(JSON.stringify(result.trace, null, 2));
}

if (process.argv[1]?.endsWith('task-runner.ts')) {
  const rawTask = process.argv.slice(2).join(' ').trim();
  if (!rawTask) {
    console.error('Provide a TaskSpec as JSON.');
    process.exit(1);
  }

  runTaskRunner(JSON.parse(rawTask) as TaskSpec).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
