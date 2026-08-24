import { beforeEach, describe, expect, it, vi } from 'vitest';

import { unifiedAI } from '../../services/ai/UnifiedAIService';
import {
  AgentCapability,
  BaseSpecializedAgent,
} from '../../services/specialized-agents/BaseSpecializedAgent';
import type {
  AgentContext,
  AgentMemory,
  AgentResponse,
  CodebaseMetrics,
  LearningPattern,
} from '../../services/specialized-agents/BaseSpecializedAgent';

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

const MEMORY_ID_RE = /^ProbeAgent_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

class ProbeAgent extends BaseSpecializedAgent {
  lastPromptContext: AgentContext | null = null;

  constructor() {
    super('ProbeAgent', [
      AgentCapability.CODE_REVIEW,
      AgentCapability.TESTING,
      AgentCapability.DOCUMENTATION,
    ]);
  }

  getRole(): string {
    return 'Probe Role';
  }

  getSpecialization(): string {
    return 'probing';
  }

  protected generatePrompt(request: string, context: AgentContext): string {
    this.lastPromptContext = context;
    return `PROMPT ${request}`;
  }

  protected analyzeResponse(response: string): AgentResponse {
    return { content: response, confidence: 0.95, suggestions: ['add more tests'] };
  }
}

interface AgentInternals {
  memory: AgentMemory[];
  learningPatterns: Map<string, LearningPattern>;
  contextCache: Map<string, AgentResponse & { _cacheTime?: number }>;
  findRelatedFiles(currentFile: string, allFiles: string[]): string[];
  analyzeCodebase(context: AgentContext): Promise<CodebaseMetrics>;
}

function internals(agent: ProbeAgent): AgentInternals {
  return agent as unknown as AgentInternals;
}

describe('BaseSpecializedAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendContextualMessage.mockResolvedValue({
      content: 'ai says hi',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });
  });

  it('process() returns the AI response with metrics and a crypto-UUID memory id', async () => {
    const agent = new ProbeAgent();
    const context: AgentContext = {
      workspaceRoot: '/workspace',
      currentFile: 'src/components/UserCard.tsx',
      files: [
        'src/components/Other.tsx',
        'src/services/UserCardService.ts',
        'src/UserCard/test/helpers.spec.ts',
        'src/services/data.service.ts',
        'docs/readme.md',
      ],
      projectType: 'react-app',
    };

    const response = await agent.process(
      'Create a component with api and test error performance handling',
      context
    );

    expect(response.content).toBe('ai says hi');
    expect(response.performance?.apiCalls).toBe(1);
    expect(response.performance?.cacheHits).toBe(0);
    expect(sendContextualMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userQuery: expect.stringContaining('PROMPT ') })
    );

    const memory = internals(agent).memory;
    expect(memory).toHaveLength(1);
    expect(memory[0]!.id).toMatch(MEMORY_ID_RE);
    expect(memory[0]!.success).toBe(true);
    expect(memory[0]!.patterns).toEqual(
      expect.arrayContaining([
        'component-creation',
        'api-integration',
        'testing',
        'error-handling',
        'performance-optimization',
        'react-component',
        'tech-react',
      ])
    );
  });

  it('identifies .ts service and test-file patterns from context', async () => {
    const agent = new ProbeAgent();

    await agent.process('refactor helper', {
      currentFile: 'src/services/parser.test.ts',
    });

    const memory = internals(agent).memory;
    expect(memory[0]!.patterns).toEqual(
      expect.arrayContaining(['typescript-service', 'test-file'])
    );
  });

  it('findRelatedFiles matches directory, name, test, and component/service links', () => {
    const agent = new ProbeAgent();

    const related = internals(agent).findRelatedFiles('src/components/UserCard.tsx', [
      'src/components/Other.tsx',
      'src/services/UserCardService.ts',
      'src/UserCard/test/helpers.spec.ts',
      'src/services/data.service.ts',
      'docs/readme.md',
    ]);

    expect(related).toContain('src/components/Other.tsx');
    expect(related).toContain('src/services/UserCardService.ts');
    expect(related).toContain('src/UserCard/test/helpers.spec.ts');
    expect(related).toContain('src/services/data.service.ts');
    expect(related).not.toContain('docs/readme.md');

    // Reverse relationship: a service file pulls in components.
    const fromService = internals(agent).findRelatedFiles('src/services/auth.service.ts', [
      'src/components/LoginForm.tsx',
      'docs/readme.md',
    ]);
    expect(fromService).toContain('src/components/LoginForm.tsx');
    expect(fromService).not.toContain('docs/readme.md');
  });

  it('serves a cached response only when the cache entry has a fresh timestamp', async () => {
    const agent = new ProbeAgent();
    const context: AgentContext = { currentFile: 'src/a.ts' };

    await agent.process('review this code', context);
    // Cached entry has no _cacheTime yet, so a repeat request hits the AI again.
    await agent.process('review this code', context);
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);

    const cache = internals(agent).contextCache;
    for (const [key, value] of cache) {
      cache.set(key, { ...value, _cacheTime: Date.now() });
    }

    const cached = await agent.process('review this code', context);
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(cached.performance?.cacheHits).toBe(1);
    expect(cached.performance?.apiCalls).toBe(0);
  });

  it('returns an honest empty result (no fabricated findings) when the AI call fails', async () => {
    const agent = new ProbeAgent();
    sendContextualMessage.mockRejectedValue(new Error('AI down'));

    const response = await agent.process('broken request', { currentFile: 'src/x.ts' });

    // No fabricated 0.3 placeholder: an AI failure yields confidence 0 and no suggestions.
    expect(response.confidence).toBe(0);
    expect(response.reasoning).toContain('AI down');
    expect(response.content).toContain('AI down');
    expect(response.content).toContain('ProbeAgent');
    expect(response.suggestions).toBeUndefined();

    const memory = internals(agent).memory;
    expect(memory[0]!.success).toBe(false);
    expect(memory[0]!.response).toContain('AI down');
  });

  it('derives real codebase metrics from the context file list', async () => {
    const agent = new ProbeAgent();

    const metrics = await internals(agent).analyzeCodebase({
      files: [
        'src/App.tsx',
        'src/util.ts',
        'src/legacy.js',
        'src/widget.jsx',
        'vite.config.ts',
        'src-tauri/main.rs',
        'scripts/build.py',
        'styles/app.css',
        'README.md',
        'Makefile',
      ],
    });

    expect(metrics.totalFiles).toBe(10);
    expect(metrics.totalLines).toBe(0);
    expect(metrics.complexity).toBe(0);
    expect(metrics.patterns).toEqual([]);
    expect(metrics.techStack).toEqual(
      expect.arrayContaining(['React', 'TypeScript', 'JavaScript', 'Vite', 'Tauri/Rust', 'Python'])
    );
    expect(metrics.languages['typescript']).toBeGreaterThan(0);
    expect(metrics.languages['javascript']).toBeGreaterThan(0);
    expect(metrics.languages['python']).toBeGreaterThan(0);
    expect(metrics.languages['css']).toBeGreaterThan(0);
    // Extension-less files contribute no language.
    expect(Object.values(metrics.languages).reduce((sum, n) => sum + n, 0)).toBeCloseTo(1, 1);
  });

  it('reports empty metrics when no files are present (no fabrication)', async () => {
    const agent = new ProbeAgent();

    const metrics = await internals(agent).analyzeCodebase({});

    expect(metrics.totalFiles).toBe(0);
    expect(metrics.languages).toEqual({});
    expect(metrics.techStack).toEqual([]);
  });

  it('feeds relevant memories and learned patterns into later requests', async () => {
    const agent = new ProbeAgent();

    await agent.process('build a component for the api', {});
    await agent.process('build another component for the api', {});

    const context = agent.lastPromptContext!;
    expect(context.sessionHistory).toHaveLength(1);
    expect(context.sessionHistory![0]!.request).toBe('build a component for the api');
    expect(context.userPreferences?.['learnedPatterns']).toBeDefined();

    const patterns = internals(agent).learningPatterns;
    expect(patterns.get('component-creation')!.frequency).toBeGreaterThanOrEqual(2);
  });

  it('computes learning stats from memories and performance metrics', async () => {
    const agent = new ProbeAgent();

    const empty = agent.getLearningStats();
    expect(empty).toEqual({
      totalPatterns: 0,
      totalMemories: 0,
      avgConfidence: 0,
      avgProcessingTime: 0,
    });

    await agent.process('build a component', {});
    sendContextualMessage.mockRejectedValueOnce(new Error('flaky'));
    await agent.process('another component please', {});

    const stats = agent.getLearningStats();
    expect(stats.totalMemories).toBe(2);
    expect(stats.avgConfidence).toBe(0.5);
    expect(stats.avgProcessingTime).toBeGreaterThanOrEqual(0);
    expect(stats.totalPatterns).toBeGreaterThan(0);
  });

  it('cleans up stale low-frequency learning patterns', () => {
    const agent = new ProbeAgent();
    const patterns = internals(agent).learningPatterns;
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    patterns.set('stale', {
      pattern: 'stale',
      frequency: 1,
      successRate: 1,
      contexts: [],
      lastUsed: fortyDaysAgo,
    });
    patterns.set('fresh', {
      pattern: 'fresh',
      frequency: 5,
      successRate: 1,
      contexts: [],
      lastUsed: new Date(),
    });

    (agent as unknown as { cleanupOldPatterns(): void }).cleanupOldPatterns();

    expect(patterns.has('stale')).toBe(false);
    expect(patterns.has('fresh')).toBe(true);
  });

  it('exposes name, capabilities, metrics, and supports resetLearning', async () => {
    const agent = new ProbeAgent();

    expect(agent.getName()).toBe('ProbeAgent');
    expect(agent.getCapabilities()).toEqual(['code_review', 'testing', 'documentation']);

    await agent.process('build a component', {});
    expect(agent.getPerformanceMetrics().length).toBeGreaterThan(0);

    agent.resetLearning();
    expect(agent.getPerformanceMetrics()).toHaveLength(0);
    expect(agent.getLearningStats().totalMemories).toBe(0);
    expect(agent.getLearningStats().totalPatterns).toBe(0);
  });
});
