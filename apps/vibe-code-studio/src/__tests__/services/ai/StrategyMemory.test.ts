import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StrategyMemory } from '../../../services/ai/StrategyMemory';
import { logger } from '../../../services/Logger';
import type { ActionType, AgentStep, ReActCycle, StrategyPattern } from '../../../types';

vi.mock('../../../services/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const STORAGE_KEY = 'deepcode_strategy_memory';
const PATTERN_ID_RE = /^pattern_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function makeStep(description: string, actionType: ActionType = 'edit_file'): AgentStep {
  return {
    id: 'step-1',
    taskId: 'task-1',
    order: 1,
    title: 'Step',
    description,
    action: { type: actionType, params: {} },
    status: 'completed',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 1,
  } as unknown as AgentStep;
}

function makeCycle(
  success = true,
  approach = 'apply a targeted edit',
  confidence = 80
): ReActCycle {
  return {
    stepId: 'step-1',
    thought: { approach, confidence },
    action: { type: 'edit_file', params: {} },
    observation: { success },
    reflection: {},
    cycleNumber: 1,
    totalDurationMs: 12,
  } as unknown as ReActCycle;
}

async function flushAsync(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('StrategyMemory', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // The global electron-store mock is a Map that never clears between tests.
    const w = window as unknown as {
      electron: { store: { delete: (key: string) => Promise<void> } };
    };
    await w.electron.store.delete(STORAGE_KEY);
  });

  it('assigns crypto-UUID ids to newly stored patterns', async () => {
    const memory = new StrategyMemory();
    await flushAsync();

    await memory.storeSuccessfulPattern(
      makeStep('fix null reference bug in parser'),
      makeCycle(true),
      { taskType: 'bugfix', fileExtension: '.ts' }
    );

    const patterns = JSON.parse(memory.exportPatterns()) as StrategyPattern[];
    expect(patterns).toHaveLength(1);
    expect(patterns[0]!.id).toMatch(PATTERN_ID_RE);
    expect(patterns[0]!.usageCount).toBe(1);
    expect(patterns[0]!.successRate).toBe(100);
  });

  it('skips failed cycles instead of storing them', async () => {
    const memory = new StrategyMemory();
    await flushAsync();

    await memory.storeSuccessfulPattern(makeStep('fix flaky test'), makeCycle(false));

    expect(JSON.parse(memory.exportPatterns())).toHaveLength(0);
  });

  it('updates usage stats when the same pattern succeeds again', async () => {
    const memory = new StrategyMemory();
    await flushAsync();

    const step = makeStep('fix null reference bug in parser');
    await memory.storeSuccessfulPattern(step, makeCycle(true));
    await memory.storeSuccessfulPattern(step, makeCycle(true));

    const patterns = JSON.parse(memory.exportPatterns()) as StrategyPattern[];
    expect(patterns).toHaveLength(1);
    expect(patterns[0]!.usageCount).toBe(2);
  });

  it('ranks stored patterns by relevance using description word overlap', async () => {
    const memory = new StrategyMemory();
    await flushAsync();

    await memory.storeSuccessfulPattern(
      makeStep('fix null reference bug in parser', 'edit_file'),
      makeCycle(true),
      { taskType: 'bugfix', fileExtension: '.ts' }
    );
    await memory.storeSuccessfulPattern(
      makeStep('render markdown preview panel', 'write_file'),
      makeCycle(true),
      { taskType: 'feature', fileExtension: '.tsx' }
    );

    const matches = await memory.queryPatterns({
      problemDescription: 'fix null reference bug in tokenizer',
      actionType: 'edit_file',
      context: { taskType: 'bugfix', fileExtension: '.ts' },
      maxResults: 5,
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.pattern.actionType).toBe('edit_file');
    expect(matches[0]!.relevanceScore).toBeGreaterThan(0);
    expect(matches[0]!.reason).toContain('Same action type');
    if (matches.length > 1) {
      expect(matches[0]!.relevanceScore).toBeGreaterThanOrEqual(matches[1]!.relevanceScore);
    }
  });

  it('reports aggregate stats for stored patterns', async () => {
    const memory = new StrategyMemory();
    await flushAsync();

    await memory.storeSuccessfulPattern(makeStep('fix parser bug'), makeCycle(true));

    const stats = memory.getStats();
    expect(stats.totalPatterns).toBe(1);
    expect(stats.totalSuccesses).toBe(1);
    expect(stats.averageSuccessRate).toBe(100);
  });

  it('logs an error when the constructor storage load rejects', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'electron')!;
    Object.defineProperty(window, 'electron', {
      configurable: true,
      get() {
        throw new Error('electron bridge exploded');
      },
    });

    try {
      new StrategyMemory();
      await flushAsync();
      expect(logger.error).toHaveBeenCalledWith(
        '[StrategyMemory] Failed to load from storage',
        expect.any(Error)
      );
    } finally {
      Object.defineProperty(window, 'electron', original);
    }
  });
});
