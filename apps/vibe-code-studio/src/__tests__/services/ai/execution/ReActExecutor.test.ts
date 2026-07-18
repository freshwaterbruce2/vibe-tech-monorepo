/**
 * ReActExecutor tests — the completed cycle must carry the raw action result so
 * callers (StepExecutor) can preserve file mutations + data instead of
 * rebuilding a lossy result from the observation alone.
 */
import { describe, expect, it, vi } from 'vitest';
import { ReActExecutor } from '../../../../services/ai/ReActExecutor';
import type { UnifiedAIService } from '../../../../services/ai/UnifiedAIService';
import type { AgentStep, AgentTask, StepResult } from '../../../../types';

function makeStep(): AgentStep {
  return {
    id: 's1',
    taskId: 't1',
    order: 0,
    title: 'Write file',
    description: 'write a file',
    action: { type: 'write_file', params: { filePath: 'a.ts', content: 'x' } },
    status: 'pending',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 3,
  } as AgentStep;
}

function makeTask(step: AgentStep): AgentTask {
  return {
    id: 't1',
    title: 'task',
    description: 'ws',
    userRequest: 'create a file',
    steps: [step],
    status: 'in_progress',
    createdAt: new Date(),
  } as AgentTask;
}

describe('ReActExecutor.executeReActCycle', () => {
  it('attaches the raw action result to the completed cycle', async () => {
    // Plain-text AI responses drive every phase down its fallback branch — the
    // cycle still completes without needing valid JSON.
    const aiService = {
      sendContextualMessage: vi.fn(async () => ({ content: 'not json' })),
    } as unknown as UnifiedAIService;

    const executor = new ReActExecutor(aiService);
    const step = makeStep();

    const actionResult: StepResult = {
      success: true,
      message: 'Created file: /ws/a.ts',
      filesCreated: ['/ws/a.ts'],
      data: { generatedCode: 'x' },
    };
    const actionExecutor = vi.fn(async () => actionResult);

    const cycle = await executor.executeReActCycle(step, makeTask(step), actionExecutor);

    expect(actionExecutor).toHaveBeenCalledWith(step.action);
    expect(cycle.result).toBe(actionResult);
    expect(cycle.observation.success).toBe(true);
  });
});
