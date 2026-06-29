/**
 * handlers-learning — record_execution routing
 *
 * Verifies the memory_learning_record_execution handler forwards the full
 * execution payload (including the new selectedModel / tokensUsed fields)
 * straight through to LearningBridge.recordExecution, and errors cleanly when
 * the bridge is unavailable.
 */

import { describe, expect, it, vi } from 'vitest';
import { handleLearning } from '../handlers-learning.js';
import type { HandlerArgs, SummarizationDeps } from '../handler-types.js';
import type { LearningBridge, MemoryManager } from '@vibetech/memory';

const noDeps = {} as SummarizationDeps;
const noManager = {} as MemoryManager;

describe('handleLearning — memory_learning_record_execution', () => {
  it('forwards selectedModel and tokensUsed to the bridge', async () => {
    const recordExecution = vi.fn().mockReturnValue(true);
    const bridge = { recordExecution } as unknown as LearningBridge;

    const args: HandlerArgs = {
      agentId: 'vibe-code-studio-ai',
      taskType: 'chat-generation',
      projectName: 'vibe-code-studio',
      success: true,
      executionTimeMs: 1200,
      selectedModel: 'deepseek-r1',
      tokensUsed: 512,
    } as unknown as HandlerArgs;

    const res = await handleLearning(
      'memory_learning_record_execution',
      args,
      bridge,
      noDeps,
      noManager,
      null,
    );

    expect(recordExecution).toHaveBeenCalledWith(
      expect.objectContaining({ selectedModel: 'deepseek-r1', tokensUsed: 512 }),
    );
    const first = res?.content?.[0] as { type: string; text: string } | undefined;
    expect(first?.text).toContain('"success":true');
  });

  it('returns an error result when no learning bridge is available', async () => {
    const res = await handleLearning(
      'memory_learning_record_execution',
      { agentId: 'a', taskType: 't', success: true } as unknown as HandlerArgs,
      null,
      noDeps,
      noManager,
      null,
    );

    expect(res?.isError).toBe(true);
  });

  it('rejects a payload missing required agentId/taskType', async () => {
    const recordExecution = vi.fn();
    const bridge = { recordExecution } as unknown as LearningBridge;

    const res = await handleLearning(
      'memory_learning_record_execution',
      { success: true } as unknown as HandlerArgs,
      bridge,
      noDeps,
      noManager,
      null,
    );

    expect(res?.isError).toBe(true);
    expect(recordExecution).not.toHaveBeenCalled();
  });
});
