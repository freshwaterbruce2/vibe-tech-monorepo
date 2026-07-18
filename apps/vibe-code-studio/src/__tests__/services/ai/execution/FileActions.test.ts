/**
 * edit_file executor test — a user rejecting the diff is a HANDLED outcome, not
 * a failure. It must return skipped:true so the step executor stops the step
 * cleanly instead of retrying/failing the whole task over a deliberate "no".
 */
import { describe, expect, it, vi } from 'vitest';
import {
  approveStagedMutation,
  MutationApplyError,
  prepareStepMutation,
} from '../../../../services/agent-runtime/MutationService';
import {
  executeEditFile,
  executeReadFile,
} from '../../../../services/ai/execution/actions/FileActions';
import type { ActionContext } from '../../../../services/ai/execution/types';
import type { AgentStep } from '../../../../types';

function makeContext() {
  let content = 'const x = 1;';
  const writeFile = vi.fn(async (_path: string, value: string) => {
    content = value;
  });
  const step = {
    id: 'step-1',
    taskId: 'task-1',
    order: 1,
    title: 'Edit',
    description: 'Edit a.ts',
    action: {
      type: 'edit_file',
      params: { filePath: 'a.ts', oldContent: 'const x = 1;', newContent: 'const x = 2;' },
    },
    status: 'pending',
    requiresApproval: true,
    retryCount: 0,
    maxRetries: 1,
  } as AgentStep;
  const context = {
    fileSystemService: {
      resolveWorkspacePath: (p: string, root: string) => `${root}/${p}`,
      readFile: vi.fn(async () => content),
      writeFile,
      exists: vi.fn(async () => true),
    },
    taskState: {
      task: {
        id: 'task-1',
        title: 'Edit',
        description: 'Edit file',
        userRequest: 'edit a.ts',
        steps: [step],
        status: 'in_progress',
        createdAt: new Date(),
      },
      currentStep: step,
      userRequest: 'edit a.ts',
      workspaceRoot: '/ws',
    },
    callbacks: { onFileChanged: vi.fn() },
  } as unknown as ActionContext;
  return { context, writeFile, step };
}

describe('executeEditFile', () => {
  it('refuses to write when the exact proposal was not prepared by the runtime', async () => {
    const { context, writeFile } = makeContext();
    await expect(executeEditFile({}, context)).rejects.toThrow(/proposal was not prepared/i);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('applies only the proposal prepared before approval', async () => {
    const { context, writeFile, step } = makeContext();
    const { proposal } = await prepareStepMutation(step, context);
    approveStagedMutation(step, proposal.id, proposal.hash);
    const result = await executeEditFile({}, context);
    expect(result.success).toBe(true);
    expect(result.filesModified).toEqual(['/ws/a.ts']);
    expect(writeFile).toHaveBeenCalledWith('/ws/a.ts', 'const x = 2;');
  });

  it('preserves typed mutation failure metadata instead of wrapping it', async () => {
    const { context, writeFile, step } = makeContext();
    const { proposal } = await prepareStepMutation(step, context);
    approveStagedMutation(step, proposal.id, proposal.hash);
    writeFile.mockRejectedValueOnce(new Error('disk write denied'));

    let failure: unknown;
    try {
      await executeEditFile({}, context);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(MutationApplyError);
    expect(failure).toMatchObject({
      proposalId: proposal.id,
      proposalHash: proposal.hash,
      path: '/ws/a.ts',
      changeType: 'modify',
      validated: false,
    });
  });
});

describe('executeReadFile', () => {
  it('does not create a missing file', async () => {
    const writeFile = vi.fn();
    const context = {
      fileSystemService: {
        resolveWorkspacePath: (p: string, root: string) => `${root}/${p}`,
        getFileStats: vi.fn(async () => {
          throw new Error('missing');
        }),
        joinPath: (...parts: string[]) => parts.join('/'),
        writeFile,
      },
      taskState: { task: null, userRequest: '', workspaceRoot: '/ws' },
    } as unknown as ActionContext;
    await expect(executeReadFile({ filePath: 'missing.ts' }, context)).rejects.toThrow(
      /not found/i
    );
    expect(writeFile).not.toHaveBeenCalled();
  });
});
