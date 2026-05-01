import { describe, expect, it, vi } from 'vitest';
import type { AgentContext, LearningBridge } from '../integrations/LearningBridge.js';
import type { MemoryManager } from '../core/MemoryManager.js';
import { UnifiedSearch } from '../search/UnifiedSearch.js';

function buildEmptyManager(): MemoryManager {
  return {
    semantic: { search: vi.fn(async () => []) },
    episodic: { search: vi.fn(() => []) },
  } as unknown as MemoryManager;
}

function buildContext(agent: string, patterns: AgentContext['knownPatterns'] = []): AgentContext {
  return {
    agent,
    recentExecutions: [],
    knownPatterns: patterns,
    knownMistakes: [],
    stats: { totalExecutions: 0, successRate: 0, avgExecutionTime: 0 },
  };
}

function buildLearningBridge(getAgentContextImpl: (id: string) => AgentContext): LearningBridge {
  return {
    searchProceduralPatterns: vi.fn(async () => []),
    getAgentContext: vi.fn(getAgentContextImpl),
  } as unknown as LearningBridge;
}

describe('UnifiedSearch — learning source agentId', () => {
  it('calls getAgentContext with nova-agent by default (not hardcoded claude)', async () => {
    const bridge = buildLearningBridge((id) => buildContext(id));
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge);

    await search.search('test query', { limit: 5, sources: ['learning'] });

    expect(bridge.getAgentContext).toHaveBeenCalledWith('nova-agent', expect.any(Number));
    expect(bridge.getAgentContext).not.toHaveBeenCalledWith('claude', expect.any(Number));
  });

  it('uses the agentId passed to the constructor', async () => {
    const bridge = buildLearningBridge((id) => buildContext(id));
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge, 'crypto-expert');

    await search.search('trade signal', { limit: 5, sources: ['learning'] });

    expect(bridge.getAgentContext).toHaveBeenCalledWith('crypto-expert', expect.any(Number));
  });

  it('returns matching patterns from the learning source', async () => {
    const patterns: AgentContext['knownPatterns'] = [
      { type: 'git_merge', description: 'use --theirs for mass conflicts', confidence: 0.9, frequency: 5 },
      { type: 'deploy', description: 'always run tests before deploying', confidence: 0.8, frequency: 3 },
    ];
    const bridge = buildLearningBridge(() => buildContext('nova-agent', patterns));
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge);

    // searchLearning uses substring match: query must appear in description or type
    const results = await search.search('git_merge', { limit: 10, sources: ['learning'] });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.source).toBe('learning');
    expect(results[0]?.text).toContain('git_merge');
  });

  it('returns empty array when no patterns match the query', async () => {
    const patterns: AgentContext['knownPatterns'] = [
      { type: 'deploy', description: 'use blue-green deployment', confidence: 0.9, frequency: 2 },
    ];
    const bridge = buildLearningBridge(() => buildContext('nova-agent', patterns));
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge);

    const results = await search.search('quantum physics', { limit: 5, sources: ['learning'] });

    expect(results).toHaveLength(0);
  });

  it('does not call getAgentContext when learning source is excluded', async () => {
    const bridge = buildLearningBridge((id) => buildContext(id));
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge);

    await search.search('test query', { limit: 5, sources: ['semantic', 'episodic'] });

    expect(bridge.getAgentContext).not.toHaveBeenCalled();
  });
});
