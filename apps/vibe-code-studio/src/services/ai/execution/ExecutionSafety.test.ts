import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTaskPlan } from '../planning/ResponseParser';
import { executeRunCommand, executeRunTests, executeCustomAction } from './actions/SystemActions';
import { executeReadFile, executeWriteFile } from './actions/FileActions';
import { executeStepWithRetry } from './StepExecutor';
import { TaskLifecycleManager } from './TaskLifecycle';
import type { StepExecutionContext } from './types';
import type { TaskPersistence } from '../TaskPersistence';

vi.mock('./actions', () => ({
  createActionRegistry: () => new Map(),
  executeAction: vi.fn(async () => ({ success: false, message: 'Command failed' })),
}));
import { executeAction } from './actions';

function task(type = 'read_file') {
  return parseTaskPlan(
    JSON.stringify({
      title: 'Safety',
      steps: [
        {
          title: 'Step',
          description: 'test',
          action: { type, params: { filePath: 'a.ts' } },
          requiresApproval: false,
        },
      ],
    }),
    'test'
  );
}

function context(): StepExecutionContext {
  return {
    taskState: { task: task(), workspaceRoot: '/workspace', userRequest: 'test' },
    enableMemory: false,
    enableReAct: false,
    metacognitiveLayer: { resetForNewTask: vi.fn(), monitorStepStart: vi.fn() },
    reactExecutor: { resetAllHistory: vi.fn() },
    fileSystemService: {
      resolveWorkspacePath: (p: string) => `/workspace/${p}`,
      joinPath: (...p: string[]) => p.join('/'),
      getFileStats: vi.fn().mockRejectedValue(new Error('missing')),
      exists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue('original'),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
    },
  } as unknown as StepExecutionContext;
}

describe('agent execution safety', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not let model output disable required approval', () => {
    expect(task('delete_file').steps[0]?.requiresApproval).toBe(true);
  });

  it('fails closed when approval UI is unavailable', async () => {
    const ctx = context();
    const current = task('write_file');
    const manager = new TaskLifecycleManager({} as TaskPersistence);
    const result = await manager.executeTask(current, ctx);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('no approval handler');
    expect(executeAction).not.toHaveBeenCalled();
  });

  it('marks returned action failures failed and never calls completion', async () => {
    const current = task();
    const onStepComplete = vi.fn();
    const result = await executeStepWithRetry(current.steps[0]!, context(), { onStepComplete });
    expect(result.success).toBe(false);
    expect(current.steps[0]?.status).toBe('failed');
    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it('fails a task when a step returns failure before exhausting retries', async () => {
    const manager = new TaskLifecycleManager({} as TaskPersistence);
    const onTaskComplete = vi.fn();
    const result = await manager.executeTask(task(), context(), { onTaskComplete });
    expect(result.status).toBe('failed');
    expect(onTaskComplete).not.toHaveBeenCalled();
  });

  it('does not create a missing file while reading', async () => {
    const ctx = context();
    const result = await executeReadFile({ filePath: 'missing.ts' }, ctx);
    expect(result.success).toBe(false);
    expect(ctx.fileSystemService.writeFile).not.toHaveBeenCalled();
  });

  it('never classifies an overwritten file as created for rollback', async () => {
    const ctx = context();
    const result = await executeWriteFile({ filePath: 'a.ts', content: '' }, ctx);
    expect(result.success).toBe(true);
    expect(result.filesCreated).toBeUndefined();
    expect(result.filesModified).toEqual(['/workspace/a.ts']);
  });

  it('asks again when ReAct changes the approved action', async () => {
    const ctx = context();
    const current = task('write_file');
    current.steps[0]!.approved = true;
    ctx.taskState.task = current;
    ctx.enableReAct = true;
    ctx.reactExecutor.executeReActCycle = vi.fn(
      async (...args: Parameters<StepExecutionContext['reactExecutor']['executeReActCycle']>) => {
        const run = args[2];
        const result = await run({ type: 'delete_file', params: { filePath: 'other.ts' } });
        return {
          observation: { success: result.success, actualOutcome: result.message },
          reflection: {},
        };
      }
    ) as unknown as typeof ctx.reactExecutor.executeReActCycle;
    const approve = vi.fn().mockResolvedValue(false);
    await executeStepWithRetry(current.steps[0]!, ctx, { onStepApprovalRequired: approve });
    expect(approve).toHaveBeenCalledOnce();
    expect(executeAction).not.toHaveBeenCalled();
  });

  it('checkpoints the last completed step when paused before execution', async () => {
    const saveTaskState = vi.fn();
    const manager = new TaskLifecycleManager({ saveTaskState } as unknown as TaskPersistence);
    manager.pause();
    await manager.executeTask(task(), context());
    expect(saveTaskState.mock.calls[0]?.[1]).toBe(-1);
    expect(executeAction).not.toHaveBeenCalled();
  });
  it('treats nonzero native exit codes as failures even when the shim says success', async () => {
    const original = window.electron;
    try {
      window.electron = {
        shell: {
          execute: vi.fn().mockResolvedValue({ success: true, code: 1, stdout: '', stderr: '' }),
        },
      } as unknown as Window['electron'];
      expect((await executeRunCommand({ command: 'pnpm test' }, context())).success).toBe(false);
    } finally {
      window.electron = original;
    }
  });

  it('runs the supplied project test command in the selected workspace', async () => {
    const original = window.electron;
    const execute = vi
      .fn()
      .mockResolvedValue({ success: true, code: 0, stdout: 'tests passed', stderr: '' });
    try {
      window.electron = { shell: { execute } } as unknown as Window['electron'];
      expect((await executeRunTests({ command: 'pnpm test' }, context())).success).toBe(true);
      expect(execute).toHaveBeenCalledWith('pnpm test', '/workspace');
      expect(task('run_tests').steps[0]?.requiresApproval).toBe(true);
    } finally {
      window.electron = original;
    }
  });

  it('requires edit approval even without a live preview', async () => {
    const ctx = context();
    const manager = new TaskLifecycleManager({} as TaskPersistence);
    const result = await manager.executeTask(task('edit_file'), ctx);
    expect(result.status).toBe('failed');
    expect(executeAction).not.toHaveBeenCalled();
  });

  it('never reports unsupported custom actions as executed', async () => {
    expect((await executeCustomAction({ approach: 'do something' }, context())).success).toBe(
      false
    );
  });

  it('restores overwritten original content on rollback', async () => {
    const ctx = context();
    let contents = 'original';
    vi.mocked(ctx.fileSystemService.readFile).mockImplementation(async () => contents);
    vi.mocked(ctx.fileSystemService.writeFile).mockImplementation(async (_path, value) => {
      contents = value;
    });
    await executeWriteFile({ filePath: 'a.ts', content: 'agent change' }, ctx);
    expect(contents).toBe('agent change');
    const result = await new TaskLifecycleManager({} as TaskPersistence).rollbackTask(
      ctx.taskState.task!,
      ctx
    );
    expect(contents).toBe('original');
    expect(result.success).toBe(true);
    expect(ctx.fileSystemService.deleteFile).not.toHaveBeenCalled();
  });

  it('preserves edits made after the agent write and reports rollback conflict', async () => {
    const ctx = context();
    let contents = 'original';
    vi.mocked(ctx.fileSystemService.readFile).mockImplementation(async () => contents);
    vi.mocked(ctx.fileSystemService.writeFile).mockImplementation(async (_path, value) => {
      contents = value;
    });
    await executeWriteFile({ filePath: 'a.ts', content: 'agent change' }, ctx);
    contents = 'user change';
    const result = await new TaskLifecycleManager({} as TaskPersistence).rollbackTask(
      ctx.taskState.task!,
      ctx
    );
    expect(contents).toBe('user change');
    expect(result.success).toBe(false);
    expect(result.error).toContain('changed after');
  });

  it('unwinds multiple writes to the same file in reverse order', async () => {
    const ctx = context();
    let contents = 'original';
    vi.mocked(ctx.fileSystemService.readFile).mockImplementation(async () => contents);
    vi.mocked(ctx.fileSystemService.writeFile).mockImplementation(async (_path, value) => {
      contents = value;
    });
    await executeWriteFile({ filePath: 'a.ts', content: 'first' }, ctx);
    await executeWriteFile({ filePath: 'a.ts', content: 'second' }, ctx);
    const result = await new TaskLifecycleManager({} as TaskPersistence).rollbackTask(
      ctx.taskState.task!,
      ctx
    );
    expect(contents).toBe('original');
    expect(result.success).toBe(true);
  });

  it('does not overwrite a file whose original contents cannot be captured', async () => {
    const ctx = context();
    vi.mocked(ctx.fileSystemService.readFile).mockRejectedValue(new Error('denied'));
    await expect(
      executeWriteFile({ filePath: 'a.ts', content: 'replacement' }, ctx)
    ).rejects.toThrow('denied');
    expect(ctx.fileSystemService.writeFile).not.toHaveBeenCalled();
  });
});
