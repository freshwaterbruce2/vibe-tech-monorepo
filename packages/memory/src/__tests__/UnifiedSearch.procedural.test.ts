import { describe, expect, it, vi } from 'vitest';
import type { LearningBridge, ProceduralSearchResult } from '../integrations/LearningBridge.js';
import type { MemoryManager } from '../core/MemoryManager.js';
import { UnifiedSearch } from '../search/UnifiedSearch.js';

/** Create a stub MemoryManager whose semantic + episodic stores return nothing */
function buildEmptyManager(): MemoryManager {
  return {
    semantic: { search: vi.fn(async () => []) },
    episodic: { search: vi.fn(() => []) },
  } as unknown as MemoryManager;
}

/** Build a stub LearningBridge that returns predetermined procedural hits */
function buildLearningBridge(
  proceduralHits: ProceduralSearchResult[] = [],
): LearningBridge {
  return {
    searchProceduralPatterns: vi.fn(async (_q: string, _l: number) => proceduralHits),
    // Legacy text-keyword learning source — return empty so it doesn't interfere
    getAgentContext: vi.fn(() => ({
      agent: 'test',
      recentExecutions: [],
      knownPatterns: [],
      knownMistakes: [],
      stats: { totalExecutions: 0, successRate: 0, avgExecutionTime: 0 },
    })),
  } as unknown as LearningBridge;
}

describe('UnifiedSearch — procedural source', () => {
  it('includes procedural results in fan-out by default', async () => {
    const hits: ProceduralSearchResult[] = [
      {
        id: 'success:1',
        text: '[git_merge] Use --theirs for mass conflicts',
        patternType: 'git_merge',
        source: 'success_pattern',
        frequency: 10,
        successRate: 0.95,
        similarity: 0.82,
        score: 1.85,
        lastUsed: '2026-04-01T00:00:00Z',
      },
    ];
    const bridge = buildLearningBridge(hits);
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge);

    const results = await search.search('how to resolve merge conflicts', { limit: 5 });

    expect(bridge.searchProceduralPatterns).toHaveBeenCalledWith(
      'how to resolve merge conflicts',
      15, // fanout = limit * 3
    );
    const procedural = results.filter((r) => r.source === 'procedural');
    expect(procedural.length).toBe(1);
    expect(procedural[0]?.sourceId).toBe('success:1');
    expect(procedural[0]?.metadata).toMatchObject({
      patternType: 'git_merge',
      patternSource: 'success_pattern',
      frequency: 10,
      successRate: 0.95,
    });
  });

  it('can be disabled by omitting "procedural" from sources option', async () => {
    const bridge = buildLearningBridge([
      {
        id: 'success:99',
        text: 'should not appear',
        patternType: 'foo',
        source: 'success_pattern',
        frequency: 1,
        successRate: 1,
        similarity: 1,
        score: 1,
        lastUsed: null,
      },
    ]);
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge);

    const results = await search.search('q', {
      limit: 5,
      sources: ['semantic', 'episodic'],
    });

    expect(bridge.searchProceduralPatterns).not.toHaveBeenCalled();
    expect(results.find((r) => r.source === 'procedural')).toBeUndefined();
  });

  it('skips procedural source if learning bridge throws', async () => {
    const bridge = {
      searchProceduralPatterns: vi.fn(async () => {
        throw new Error('embedder unavailable');
      }),
      getAgentContext: vi.fn(() => ({
        agent: 'test',
        recentExecutions: [],
        knownPatterns: [],
        knownMistakes: [],
        stats: { totalExecutions: 0, successRate: 0, avgExecutionTime: 0 },
      })),
    } as unknown as LearningBridge;
    const search = new UnifiedSearch(buildEmptyManager(), null, bridge);

    // Should not throw — procedural branch degrades to []
    const results = await search.search('q', { limit: 5, sources: ['procedural'] });
    expect(results).toEqual([]);
  });

  it('skips procedural source if no learning bridge is wired', async () => {
    const search = new UnifiedSearch(buildEmptyManager(), null, null);
    const results = await search.search('q', { limit: 5, sources: ['procedural'] });
    expect(results).toEqual([]);
  });
});
