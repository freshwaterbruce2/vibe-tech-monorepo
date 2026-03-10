import { describe, expect, it, vi } from 'vitest';
import { PatternAnalyzer } from '../analysis/PatternAnalyzer.js';
import type { MemoryManager } from '../core/MemoryManager.js';
import type { EpisodicMemory, ProceduralMemory } from '../types/index.js';

// Build a mock MemoryManager with the methods PatternAnalyzer depends on
function makeMockMemory(overrides: {
  recentEpisodic?: EpisodicMemory[];
  topProcedural?: ProceduralMemory[];
  semanticSearchResults?: {
    item: { text: string; id: number; category: string };
    score: number;
    distance: number;
  }[];
}): MemoryManager {
  const { recentEpisodic = [], topProcedural = [], semanticSearchResults = [] } = overrides;

  return {
    episodic: {
      getRecent: vi.fn().mockReturnValue(recentEpisodic),
    },
    procedural: {
      getMostFrequent: vi.fn().mockReturnValue(topProcedural),
    },
    semantic: {
      search: vi.fn().mockResolvedValue(semanticSearchResults),
    },
  } as unknown as MemoryManager;
}

function makeEpisodic(query: string, timestamp?: number, sourceId = 'test'): EpisodicMemory {
  return {
    id: Math.floor(Math.random() * 10000),
    sourceId,
    timestamp: timestamp ?? Date.now(),
    query,
    response: 'response',
  };
}

function makeProcedural(pattern: string, freq: number, successRate: number): ProceduralMemory {
  return {
    id: Math.floor(Math.random() * 10000),
    pattern,
    context: 'test context',
    frequency: freq,
    successRate,
    lastUsed: Date.now(),
  };
}

describe('PatternAnalyzer', () => {
  // ── analyzeFailurePatterns (via suggestNextActions) ──

  describe('failure pattern detection', () => {
    it('flags patterns with low success rate and enough frequency', async () => {
      const memory = makeMockMemory({
        topProcedural: [
          makeProcedural('flaky-cmd', 5, 0.3), // 30% success, 5 uses → should flag
        ],
      });

      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      const optimizations = suggestions.filter((s) => s.type === 'optimization');
      expect(optimizations.length).toBeGreaterThanOrEqual(1);
      expect(optimizations[0].title).toContain('flaky-cmd');
      expect(optimizations[0].confidence).toBe(0.8);
    });

    it('does not flag patterns with high success rate', async () => {
      const memory = makeMockMemory({
        topProcedural: [makeProcedural('good-cmd', 10, 0.95)],
      });

      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      const optimizations = suggestions.filter((s) => s.type === 'optimization');
      expect(optimizations).toHaveLength(0);
    });

    it('ignores low-frequency failures (< 3 uses)', async () => {
      const memory = makeMockMemory({
        topProcedural: [
          makeProcedural('rare-fail', 2, 0.1), // Only 2 uses, should not flag
        ],
      });

      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      const optimizations = suggestions.filter((s) => s.type === 'optimization');
      expect(optimizations).toHaveLength(0);
    });
  });

  // ── analyzeWorkflowSequences ──

  describe('workflow sequence detection', () => {
    it('detects repeated command sequences', async () => {
      // Build 4 episodes: A→B, A→B, A→B — strong sequential pattern
      const now = Date.now();
      const episodes: EpisodicMemory[] = [];
      for (let i = 0; i < 3; i++) {
        episodes.push(makeEpisodic('Tool used: pnpm_install', now + i * 1000));
        episodes.push(makeEpisodic('Tool used: pnpm_build', now + i * 1000 + 500));
      }

      const memory = makeMockMemory({ recentEpisodic: episodes });
      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      const workflows = suggestions.filter((s) => s.type === 'workflow');
      expect(workflows.length).toBeGreaterThanOrEqual(1);
      expect(workflows[0].description).toContain('pnpm_build');
    });

    it('returns no workflow suggestions for unrelated commands', async () => {
      const now = Date.now();
      const episodes = [
        makeEpisodic('Tool used: cmd_a', now),
        makeEpisodic('Tool used: cmd_b', now + 1000),
        makeEpisodic('Tool used: cmd_c', now + 2000),
        makeEpisodic('Tool used: cmd_d', now + 3000),
      ];

      const memory = makeMockMemory({ recentEpisodic: episodes });
      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      const workflows = suggestions.filter((s) => s.type === 'workflow');
      expect(workflows).toHaveLength(0);
    });
  });

  // ── analyzeKnowledgeGaps ──

  describe('knowledge gap detection', () => {
    it('flags queries asked 3+ times with no semantic match', async () => {
      const episodes = [
        makeEpisodic('how to deploy to vercel'),
        makeEpisodic('how to deploy to vercel'),
        makeEpisodic('how to deploy to vercel'),
      ];

      const memory = makeMockMemory({
        recentEpisodic: episodes,
        semanticSearchResults: [], // No semantic knowledge
      });

      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      const reminders = suggestions.filter((s) => s.type === 'reminder');
      expect(reminders.length).toBeGreaterThanOrEqual(1);
    });

    it('does not flag queries that have semantic answers', async () => {
      const episodes = [
        makeEpisodic('how to deploy'),
        makeEpisodic('how to deploy'),
        makeEpisodic('how to deploy'),
      ];

      const memory = makeMockMemory({
        recentEpisodic: episodes,
        semanticSearchResults: [
          { item: { text: 'Deploy guide', id: 1, category: 'general' }, score: 0.9, distance: 0.1 },
        ],
      });

      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      const reminders = suggestions.filter((s) => s.type === 'reminder');
      expect(reminders).toHaveLength(0);
    });
  });

  // ── getPatternInsights ──

  describe('getPatternInsights', () => {
    it('returns insight for existing pattern', () => {
      const memory = makeMockMemory({
        topProcedural: [makeProcedural('pnpm build', 15, 0.92)],
        recentEpisodic: [],
      });

      const analyzer = new PatternAnalyzer(memory);
      const insight = analyzer.getPatternInsights('pnpm build');

      expect(insight).not.toBeNull();
      expect(insight!.pattern).toBe('pnpm build');
      expect(insight!.frequency).toBe(15);
      expect(insight!.successRate).toBe(0.92);
    });

    it('returns null for unknown pattern', () => {
      const memory = makeMockMemory({
        topProcedural: [],
        recentEpisodic: [],
      });

      const analyzer = new PatternAnalyzer(memory);
      expect(analyzer.getPatternInsights('nonexistent')).toBeNull();
    });
  });

  // ── suggestNextActions ──

  describe('suggestNextActions', () => {
    it('returns empty array when no data exists', async () => {
      const memory = makeMockMemory({});
      const analyzer = new PatternAnalyzer(memory);

      const suggestions = await analyzer.suggestNextActions();
      expect(suggestions).toEqual([]);
    });

    it('respects limit parameter', async () => {
      // Create enough data to generate multiple suggestions
      const procs = [
        makeProcedural('bad-1', 5, 0.2),
        makeProcedural('bad-2', 5, 0.3),
        makeProcedural('bad-3', 5, 0.1),
      ];

      const memory = makeMockMemory({ topProcedural: procs });
      const analyzer = new PatternAnalyzer(memory);

      const suggestions = await analyzer.suggestNextActions(2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('sorts suggestions by confidence descending', async () => {
      const procs = [
        makeProcedural('bad-1', 5, 0.1), // confidence 0.8
        makeProcedural('bad-2', 5, 0.4), // confidence 0.8
      ];

      const memory = makeMockMemory({ topProcedural: procs });
      const analyzer = new PatternAnalyzer(memory);
      const suggestions = await analyzer.suggestNextActions(10);

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });
  });
});
