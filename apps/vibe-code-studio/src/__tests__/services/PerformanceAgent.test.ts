import { beforeEach, describe, expect, it, vi } from 'vitest';

import { unifiedAI } from '../../services/ai/UnifiedAIService';
import { PerformanceAgent } from '../../services/specialized-agents/PerformanceAgent';

vi.mock('../../services/ai/UnifiedAIService', () => ({
  unifiedAI: {
    sendContextualMessage: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const sendContextualMessage = vi.mocked(unifiedAI.sendContextualMessage);

describe('PerformanceAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendContextualMessage.mockResolvedValue({
      content: 'real performance findings',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });
  });

  it('exposes its role, name, and specialization', () => {
    const agent = new PerformanceAgent();

    expect(agent.getName()).toBe('PerformanceAgent');
    expect(agent.getRole()).toBe('Performance Engineer');
    expect(agent.getSpecialization()).toContain('Performance');
    expect(agent.getCapabilities()).toContain('performance_profiling');
  });

  it('routes analyzePerformance through the real AI service and returns its result', async () => {
    const agent = new PerformanceAgent();

    const response = await agent.analyzePerformance({ currentFile: 'src/list.tsx' });

    expect(response.content).toBe('real performance findings');
    expect(response.confidence).toBe(0.85);
    expect(sendContextualMessage).toHaveBeenCalledTimes(1);
    expect(sendContextualMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userQuery: expect.stringContaining('As a Performance Engineer') })
    );
  });

  it('routes optimizeCode through the real AI service', async () => {
    const agent = new PerformanceAgent();

    const response = await agent.optimizeCode({});

    expect(response.content).toBe('real performance findings');
    expect(sendContextualMessage).toHaveBeenCalledTimes(1);
  });

  it('returns an honest empty result (confidence 0) when the AI call fails', async () => {
    const agent = new PerformanceAgent();
    sendContextualMessage.mockRejectedValue(new Error('backend down'));

    const response = await agent.analyzePerformance({ currentFile: 'src/list.tsx' });

    expect(response.confidence).toBe(0);
    expect(response.content).toContain('backend down');
    expect(response.content).not.toContain('code splitting');
    expect(response.suggestions).toBeUndefined();
  });

  it('dispatches processRequest to optimize vs. analyze based on the request text', async () => {
    const agent = new PerformanceAgent();
    const optimizeSpy = vi.spyOn(agent, 'optimizeCode');
    const analyzeSpy = vi.spyOn(agent, 'analyzePerformance');

    await agent.processRequest('optimize this render loop', {});
    expect(optimizeSpy).toHaveBeenCalledTimes(1);
    expect(analyzeSpy).not.toHaveBeenCalled();

    await agent.processRequest('analyze runtime performance', {});
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });
});
