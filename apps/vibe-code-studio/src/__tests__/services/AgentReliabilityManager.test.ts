import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RecoveryStrategy } from '../../services/AgentReliabilityManager';
import { AgentReliabilityManager } from '../../services/AgentReliabilityManager';
import type { AgentContext, AgentResponse, BaseSpecializedAgent } from '../../services/specialized-agents/BaseSpecializedAgent';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

interface ReliabilityInternals {
  recoveryStrategies: RecoveryStrategy[];
}

function createMockAgent(
  processImpl: (request: string, context: AgentContext) => Promise<AgentResponse>,
): BaseSpecializedAgent {
  return {
    getName: () => 'Mock Agent',
    process: vi.fn(processImpl),
  } as unknown as BaseSpecializedAgent;
}

describe('AgentReliabilityManager', () => {
  const managers: AgentReliabilityManager[] = [];

  afterEach(() => {
    while (managers.length > 0) {
      managers.pop()?.destroy();
    }
    vi.useRealTimers();
  });

  it('registers built-in recovery strategies on initialization', () => {
    const manager = new AgentReliabilityManager();
    managers.push(manager);
    const internals = manager as unknown as ReliabilityInternals;
    const strategyTypes = internals.recoveryStrategies.map((strategy) => strategy.type);
    expect(strategyTypes).toEqual(['retry', 'circuit_breaker', 'fallback']);
  });

  it('retries transient failures and eventually returns success', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const manager = new AgentReliabilityManager();
    managers.push(manager);
    const agent = createMockAgent(async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('network timeout');
      }
      return { content: 'retry success', confidence: 0.9 };
    });

    const resultPromise = manager.executeWithReliability(agent, 'retry request', {});
    await vi.advanceTimersByTimeAsync(2100);
    const result = await resultPromise;
    expect(result.content).toBe('retry success');
    expect(attempts).toBe(2);
  });

  it('falls back to a safe response when resource errors keep failing', async () => {
    const manager = new AgentReliabilityManager();
    managers.push(manager);
    const agent = createMockAgent(async () => {
      throw new Error('resource exhausted');
    });

    const result = await manager.executeWithReliability(
      agent,
      'A'.repeat(700),
      { workspaceRoot: '/workspace', currentFile: '/workspace/src/app.ts' },
    );

    expect(result.confidence).toBe(0.2);
    expect(result.content).toContain("technical difficulties");
  });
});
