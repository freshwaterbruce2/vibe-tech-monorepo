import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isCodeCorrectionRouteEnabled } from '../../config/aiRolloutFlags';
import { telemetry } from '../../services/TelemetryService';
import type { AgentContext } from '../../services/specialized-agents/BaseSpecializedAgent';
import { AgentOrchestrator } from '../../services/specialized-agents/AgentOrchestrator';
import {
  applyContextScoreAdjustments,
  buildAgentScores,
  categorizeRequest,
  extractFileType,
} from '../../services/specialized-agents/orchestratorHeuristics';

vi.mock('../../config/aiRolloutFlags', () => ({
  isCodeCorrectionRouteEnabled: vi.fn(() => true),
}));

vi.mock('../../services/TelemetryService', () => ({
  telemetry: {
    trackEvent: vi.fn(),
    trackError: vi.fn(),
  },
}));

interface CoordinationPlan {
  agents: string[];
  strategy: 'sequential' | 'parallel' | 'hierarchical' | 'collaborative';
  reasoning: string;
  confidence: number;
  parallelism: number;
}

interface OrchestratorInternals {
  analyzeAndCoordinate: (request: string, context: AgentContext) => Promise<CoordinationPlan>;
  executeCoordination: (
    agentKeys: string[],
    request: string,
    context: AgentContext,
    strategy: 'sequential' | 'parallel' | 'hierarchical' | 'collaborative'
  ) => Promise<Record<string, unknown>>;
}

async function analyze(request: string, context: AgentContext = {}): Promise<CoordinationPlan> {
  const orchestrator = new AgentOrchestrator();
  const internals = orchestrator as unknown as OrchestratorInternals;
  return internals.analyzeAndCoordinate(request, context);
}

describe('AgentOrchestrator code-correction flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCodeCorrectionRouteEnabled).mockReturnValue(true);
  });

  it('registers the code correction agent', () => {
    const orchestrator = new AgentOrchestrator();
    const names = orchestrator.getAvailableAgents().map(agent => agent.name);

    expect(names).toContain('Code Correction Agent');
  });

  it('prioritizes code_corrector for direct bug-fix requests', async () => {
    const plan = await analyze(
      'Fix failing unit test caused by null reference bug in parser logic',
      { currentFile: 'src/parser.ts' }
    );

    expect(plan.agents[0]).toBe('code_corrector');
    expect(plan.agents).toContain('code_corrector');
    expect(plan.strategy).toBe('sequential');
  });

  it('adds frontend specialist context for UI correction requests', async () => {
    const plan = await analyze('Fix broken click handler bug in React modal component', {
      currentFile: 'src/components/Modal.tsx',
    });

    expect(plan.agents).toContain('code_corrector');
    expect(plan.agents).toContain('frontend_engineer');
    expect(plan.strategy).toBe('collaborative');
  });

  it('uses hierarchical correction flow for cross-cutting risk requests', async () => {
    const plan = await analyze(
      'Fix authentication regression causing a security vulnerability and performance degradation in backend service',
      { currentFile: 'src/services/authService.ts' }
    );

    expect(plan.agents).toContain('technical_lead');
    expect(plan.agents).toContain('code_corrector');
    expect(plan.strategy).toBe('hierarchical');
  });

  it('keeps non-correction requests out of the correction flow', async () => {
    const plan = await analyze('Design scalable architecture for a new microservice API', {
      currentFile: 'src/services/apiDesign.ts',
    });

    expect(plan.agents).not.toContain('code_corrector');
  });

  it('falls back to parallel execution when hierarchical flow lacks technical lead', async () => {
    const orchestrator = new AgentOrchestrator();
    const internals = orchestrator as unknown as OrchestratorInternals;
    const parallelExecutor = orchestrator as unknown as {
      executeParallel: (
        agentKeys: string[],
        request: string,
        context: AgentContext
      ) => Promise<Record<string, unknown>>;
    };
    const fallbackResponse = {
      code_corrector: {
        content: 'fallback-response',
        confidence: 0.82,
      },
    };
    const executeParallelSpy = vi
      .spyOn(parallelExecutor, 'executeParallel')
      .mockResolvedValue(fallbackResponse);

    const response = await internals.executeCoordination(
      ['code_corrector'],
      'Fix parser regression',
      {},
      'hierarchical'
    );

    expect(executeParallelSpy).toHaveBeenCalledWith(
      ['code_corrector'],
      'Fix parser regression',
      {}
    );
    expect(response).toEqual(fallbackResponse);
  });

  it('skips code-correction routing when rollout flag is disabled', async () => {
    vi.mocked(isCodeCorrectionRouteEnabled).mockReturnValue(false);

    const plan = await analyze(
      'Fix failing unit test caused by null reference bug in parser logic',
      { currentFile: 'src/parser.ts' }
    );

    expect(plan.agents).not.toContain('code_corrector');
  });

  it('emits route-selection and strategy telemetry with safe dimensions', async () => {
    await analyze('Fix failing unit test caused by null reference bug in parser logic', {
      currentFile: 'src/parser.ts',
    });

    expect(telemetry.trackEvent).toHaveBeenCalledWith(
      'orchestrator_code_correction_route_selected',
      expect.objectContaining({
        request_mode: 'agent',
        route: 'code_correction',
        correction_route_enabled: true,
      })
    );
    expect(telemetry.trackEvent).toHaveBeenCalledWith(
      'orchestrator_strategy_selected',
      expect.objectContaining({
        request_mode: 'agent',
        strategy: 'sequential',
        route: 'code_correction',
      })
    );
  });
});

interface StubAgentResponse {
  content: string;
  confidence: number;
  suggestions?: string[];
  codeChanges?: Array<{ filePath: string; type: 'modify'; description: string }>;
}

interface ExecutionInternals {
  agents: Map<
    string,
    { process: (request: string, context: AgentContext) => Promise<StubAgentResponse> }
  >;
  executeCoordination: (
    agentKeys: string[],
    request: string,
    context: AgentContext,
    strategy: 'sequential' | 'parallel' | 'hierarchical' | 'collaborative'
  ) => Promise<Record<string, StubAgentResponse>>;
  categorizeRequest: (request: string) => string;
}

function stubAgent(orchestrator: AgentOrchestrator, key: string): ReturnType<typeof vi.spyOn> {
  const agent = (orchestrator as unknown as ExecutionInternals).agents.get(key);
  if (!agent) {
    throw new Error(`Agent not registered: ${key}`);
  }
  return vi.spyOn(agent, 'process');
}

describe('AgentOrchestrator execution and analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCodeCorrectionRouteEnabled).mockReturnValue(true);
  });

  it('processes a request end-to-end and records performance analytics', async () => {
    const orchestrator = new AgentOrchestrator();
    stubAgent(orchestrator, 'code_corrector').mockResolvedValue({
      content: 'Patched the parser null check',
      confidence: 0.9,
      suggestions: ['Add a regression test'],
    });

    const result = await orchestrator.processRequest(
      'Fix failing unit test caused by null reference bug in parser logic',
      { currentFile: 'src/parser.ts' }
    );

    expect(result.response).toBe('Patched the parser null check');
    expect(result.recommendations).toEqual(['Add a regression test']);
    expect(result.coordination?.strategy).toBe('sequential');
    expect(result.performance?.totalTime).toBeGreaterThanOrEqual(0);
    expect(result.performance?.agentTimes).toHaveProperty('code_corrector');
    expect(orchestrator.getActiveCoordinations()).toHaveLength(0);

    const analytics = orchestrator.getPerformanceAnalytics();
    expect(analytics.totalTasks).toBe(1);
    expect(analytics.successRate).toBe(1);
    expect(analytics.avgResponseTime).toBeGreaterThanOrEqual(0);
    expect(analytics.agentUtilization['code_corrector']).toBe(1);
    expect(analytics.topTaskTypes[0]).toEqual({ type: 'code-correction', count: 1 });

    const info = orchestrator
      .getAvailableAgents()
      .find(agent => agent.name === 'Code Correction Agent');
    expect(info?.workload).toBeCloseTo(0.1);
  });

  it('marks the task failed and records a failure when coordination throws', async () => {
    const orchestrator = new AgentOrchestrator();
    vi.spyOn(
      orchestrator as unknown as { analyzeAndCoordinate: () => Promise<CoordinationPlan> },
      'analyzeAndCoordinate'
    ).mockRejectedValue(new Error('coordination exploded'));

    await expect(orchestrator.processRequest('do anything')).rejects.toThrow(
      'coordination exploded'
    );

    const analytics = orchestrator.getPerformanceAnalytics();
    expect(analytics.totalTasks).toBe(1);
    expect(analytics.successRate).toBe(0);
    expect(analytics.avgResponseTime).toBeGreaterThanOrEqual(0);
  });

  it('executeParallel skips unknown agents and swallows individual agent failures', async () => {
    const orchestrator = new AgentOrchestrator();
    const internals = orchestrator as unknown as ExecutionInternals;
    stubAgent(orchestrator, 'frontend_engineer').mockResolvedValue({
      content: 'frontend result',
      confidence: 0.85,
    });
    stubAgent(orchestrator, 'backend_engineer').mockRejectedValue(new Error('backend down'));

    const responses = await internals.executeCoordination(
      ['frontend_engineer', 'backend_engineer', 'ghost_agent'],
      'analyze this code',
      {},
      'parallel'
    );

    expect(Object.keys(responses)).toEqual(['frontend_engineer']);
    expect(responses['frontend_engineer']!.content).toBe('frontend result');
  });

  it('executeCollaborative refines responses and falls back to the initial answer', async () => {
    const orchestrator = new AgentOrchestrator();
    const internals = orchestrator as unknown as ExecutionInternals;

    stubAgent(orchestrator, 'frontend_engineer')
      .mockResolvedValueOnce({ content: 'initial frontend', confidence: 0.8 })
      .mockResolvedValueOnce({ content: 'refined frontend', confidence: 0.9 });
    stubAgent(orchestrator, 'backend_engineer')
      .mockResolvedValueOnce({ content: 'initial backend', confidence: 0.8 })
      .mockRejectedValueOnce(new Error('refinement failed'));

    const responses = await internals.executeCoordination(
      ['frontend_engineer', 'backend_engineer', 'ghost_agent'],
      'coordinate ui and api work',
      {},
      'collaborative'
    );

    expect(responses['frontend_engineer']!.content).toBe('refined frontend');
    expect(responses['backend_engineer']!.content).toBe('initial backend');
    expect(responses).not.toHaveProperty('ghost_agent');
  });

  it('executeHierarchical runs the technical lead first, then the specialists', async () => {
    const orchestrator = new AgentOrchestrator();
    const internals = orchestrator as unknown as ExecutionInternals;

    stubAgent(orchestrator, 'technical_lead').mockResolvedValue({
      content: 'lead guidance',
      confidence: 0.9,
      suggestions: ['split the module'],
    });
    const securitySpy = stubAgent(orchestrator, 'security_specialist').mockResolvedValue({
      content: 'security review',
      confidence: 0.88,
    });

    const responses = await internals.executeCoordination(
      ['technical_lead', 'security_specialist'],
      'review the auth flow',
      {},
      'hierarchical'
    );

    expect(responses['technical_lead']!.content).toBe('lead guidance');
    expect(responses['security_specialist']!.content).toBe('security review');
    const [, enhancedContext] = securitySpy.mock.calls[0] as unknown as [string, AgentContext];
    expect(enhancedContext.userPreferences?.['technicalGuidance']).toEqual(['split the module']);
  });

  it('synthesizes multi-agent responses with a coordination summary', async () => {
    const orchestrator = new AgentOrchestrator();
    const synthesizer = orchestrator as unknown as {
      synthesizeResponse: (
        request: string,
        agentResponses: Record<string, StubAgentResponse>,
        coordination: CoordinationPlan
      ) => { content: string; recommendations: string[] };
    };

    const result = synthesizer.synthesizeResponse(
      'improve the module',
      {
        frontend_engineer: {
          content: 'frontend view',
          confidence: 0.6,
          suggestions: ['add tests'],
          codeChanges: [{ filePath: 'a.ts', type: 'modify', description: 'tweak' }],
        },
        backend_engineer: {
          content: 'backend view',
          confidence: 0.9,
          suggestions: ['add tests'],
        },
      },
      {
        agents: ['frontend_engineer', 'backend_engineer'],
        strategy: 'collaborative',
        reasoning: 'complementary specialists',
        confidence: 0.85,
        parallelism: 2,
      }
    );

    expect(result.content).toContain('Multi-Agent Analysis');
    expect(result.content).toContain('add tests (mentioned by 2 agents)');
    expect(result.content).toContain('lower confidence');
    expect(result.content).toContain('Multiple agents proposed code changes');
  });

  it('delegateTask returns the first agent response, or a synthesized fallback', async () => {
    const orchestrator = new AgentOrchestrator();
    const processSpy = vi.spyOn(orchestrator, 'processRequest');

    processSpy.mockResolvedValueOnce({
      response: 'synthesized',
      agentResponses: {
        code_corrector: { content: 'agent answer', confidence: 0.9 },
      },
    });
    const withAgents = await orchestrator.delegateTask({
      id: 't1',
      title: 'Fix bug',
      description: 'null pointer in parser',
    });
    expect(withAgents.content).toBe('agent answer');
    expect(processSpy).toHaveBeenCalledWith('Fix bug: null pointer in parser', undefined);

    processSpy.mockResolvedValueOnce({ response: 'synthesized only', agentResponses: {} });
    const withoutAgents = await orchestrator.delegateTask({
      id: 't2',
      description: 'no agents responded',
    });
    expect(withoutAgents).toEqual({ content: 'synthesized only', confidence: 0.8 });
  });

  it('coordinateTask returns a pending task with a generated crypto-UUID id', async () => {
    const orchestrator = new AgentOrchestrator();

    const task = await orchestrator.coordinateTask({ description: 'plan the work' });

    expect(task.id).toMatch(/^task_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(task.status).toBe('pending');
    expect(task.requiredAgents).toEqual(['technical_lead']);
  });

  it('escalates a three-specialist plan to hierarchical with technical lead', async () => {
    const plan = await analyze('secure the react ui component and backend api endpoint', {});

    expect(plan.agents).toEqual(
      expect.arrayContaining(['technical_lead', 'frontend_engineer', 'backend_engineer'])
    );
    expect(plan.strategy).toBe('hierarchical');
  });

  it('exposes and cancels tracked coordinations by task id', () => {
    const orchestrator = new AgentOrchestrator();
    const tracked = orchestrator as unknown as {
      activeTasks: Map<string, { id: string; description: string }>;
    };
    tracked.activeTasks.set('t-42', { id: 't-42', description: 'in flight' });

    expect(orchestrator.getCoordinatedTask('t-42')?.description).toBe('in flight');
    expect(orchestrator.getActiveCoordinations()).toHaveLength(1);
    expect(orchestrator.cancelCoordination('t-42')).toBe(true);
    expect(orchestrator.getCoordinatedTask('t-42')).toBeUndefined();
    expect(orchestrator.cancelCoordination('t-42')).toBe(false);
  });

  it('categorizeRequest maps request phrasing onto task categories', () => {
    expect(categorizeRequest('fix the parser bug')).toBe('code-correction');
    expect(categorizeRequest('polish the ui component layout')).toBe('ui-development');
    expect(categorizeRequest('expose a new api for orders')).toBe('api-development');
    expect(categorizeRequest('harden auth and security checks')).toBe('security');
    expect(categorizeRequest('improve performance via optimization')).toBe('optimization');
    expect(categorizeRequest('add unit testing coverage')).toBe('testing');
    expect(categorizeRequest('plan the system architecture')).toBe('architecture');
    expect(categorizeRequest('hello world')).toBe('general');
  });

  it('boosts corrector scores for test files and treats extension-less paths as unknown', () => {
    const scores = buildAgentScores('');
    applyContextScoreAdjustments(scores, { currentFile: 'src/utils/helpers.test.py' });
    expect(scores.code_corrector).toBe(2);
    expect(scores.super_coder).toBe(1);

    expect(extractFileType('Makefile')).toBe('unknown');
  });
});
