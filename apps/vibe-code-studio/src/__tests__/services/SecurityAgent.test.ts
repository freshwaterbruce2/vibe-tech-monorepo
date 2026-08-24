import { beforeEach, describe, expect, it, vi } from 'vitest';

import { unifiedAI } from '../../services/ai/UnifiedAIService';
import { SecurityAgent } from '../../services/specialized-agents/SecurityAgent';

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

describe('SecurityAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendContextualMessage.mockResolvedValue({
      content: 'real security findings',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });
  });

  it('exposes its role, name, and specialization', () => {
    const agent = new SecurityAgent();

    expect(agent.getName()).toBe('SecurityAgent');
    expect(agent.getRole()).toBe('Security Engineer');
    expect(agent.getSpecialization()).toContain('Security');
    expect(agent.getCapabilities()).toContain('security_scanning');
  });

  it('routes analyzeSecurity through the real AI service and returns its result', async () => {
    const agent = new SecurityAgent();

    const response = await agent.analyzeSecurity({ currentFile: 'src/auth.ts' });

    expect(response.content).toBe('real security findings');
    expect(response.confidence).toBe(0.85);
    expect(sendContextualMessage).toHaveBeenCalledTimes(1);
    expect(sendContextualMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userQuery: expect.stringContaining('As a Security Engineer') })
    );
  });

  it('routes scanVulnerabilities through the real AI service', async () => {
    const agent = new SecurityAgent();

    const response = await agent.scanVulnerabilities({});

    expect(response.content).toBe('real security findings');
    expect(sendContextualMessage).toHaveBeenCalledTimes(1);
  });

  it('returns an honest empty result (confidence 0) when the AI call fails', async () => {
    const agent = new SecurityAgent();
    sendContextualMessage.mockRejectedValue(new Error('no api key'));

    const response = await agent.analyzeSecurity({ currentFile: 'src/auth.ts' });

    expect(response.confidence).toBe(0);
    expect(response.content).toContain('no api key');
    expect(response.content).not.toContain('SEC-001');
    expect(response.suggestions).toBeUndefined();
  });

  it('dispatches processRequest to scan vs. analyze based on the request text', async () => {
    const agent = new SecurityAgent();
    const scanSpy = vi.spyOn(agent, 'scanVulnerabilities');
    const analyzeSpy = vi.spyOn(agent, 'analyzeSecurity');

    await agent.processRequest('run a vulnerability scan', {});
    expect(scanSpy).toHaveBeenCalledTimes(1);
    expect(analyzeSpy).not.toHaveBeenCalled();

    await agent.processRequest('review the security posture', {});
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });
});
