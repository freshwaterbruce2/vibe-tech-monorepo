import { describe, expect, it, vi } from 'vitest';
import { ExecutionEngine } from '../ExecutionEngine';
import { parseTaskPlan } from '../planning/ResponseParser';

vi.mock('../TaskPersistence', () => ({
  TaskPersistence: class {
    async saveTaskState() {}
  },
}));
vi.mock('../MetacognitiveLayer', () => ({
  MetacognitiveLayer: class {
    resetForNewTask() {}
    monitorStepStart() {}
  },
}));
vi.mock('../ReActExecutor', () => ({
  ReActExecutor: class {
    resetAllHistory() {}
  },
}));
vi.mock('../StrategyMemory', () => ({ StrategyMemory: class {} }));
vi.mock('./actions', () => ({
  createActionRegistry: () => new Map(),
  executeAction: async (_type: unknown, params: Record<string, unknown>, context: unknown) => {
    const { executeWriteFile } = await import('./actions/FileActions');
    return executeWriteFile(params, context as Parameters<typeof executeWriteFile>[1]);
  },
}));

function writeTask(filePath: string, content: string) {
  return parseTaskPlan(
    JSON.stringify({
      title: 'Write',
      steps: [
        {
          title: 'Write file',
          description: 'Update file',
          action: { type: 'write_file', params: { filePath, content } },
        },
      ],
    }),
    'Update file'
  );
}

describe('public ExecutionEngine rollback integration', () => {
  it('restores a completed task through a fresh context without consuming another task snapshots', async () => {
    const files = new Map([
      ['/workspace/a.ts', 'original A'],
      ['/workspace/b.ts', 'original B'],
    ]);
    const fs = {
      exists: async (path: string) => files.has(path),
      readFile: async (path: string) => files.get(path)!,
      writeFile: async (path: string, value: string) => {
        files.set(path, value);
      },
      resolveWorkspacePath: (path: string) => `/workspace/${path}`,
    };
    const engine = new ExecutionEngine(
      fs as unknown as ConstructorParameters<typeof ExecutionEngine>[0],
      { setModel: vi.fn() } as unknown as ConstructorParameters<typeof ExecutionEngine>[1],
      {} as ConstructorParameters<typeof ExecutionEngine>[2],
      {} as ConstructorParameters<typeof ExecutionEngine>[3]
    );
    engine.setTaskContext('Update files', '/workspace');
    engine.setEnableReAct(false);
    engine.setEnableMemory(false);
    const first = writeTask('a.ts', 'agent A');
    const second = writeTask('b.ts', 'agent B');
    const callbacks = { onStepApprovalRequired: async () => true };
    expect((await engine.executeTask(first, callbacks)).status).toBe('completed');
    expect((await engine.executeTask(second, callbacks)).status).toBe('completed');
    expect((await engine.rollbackTask(first)).success).toBe(true);
    expect(files.get('/workspace/a.ts')).toBe('original A');
    expect(files.get('/workspace/b.ts')).toBe('agent B');
    expect((await engine.rollbackTask(second)).success).toBe(true);
    expect(files.get('/workspace/b.ts')).toBe('original B');
  });
});
