import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isCodeCorrectionRouteEnabled } from '../../config/aiRolloutFlags';
import { telemetry } from '../../services/TelemetryService';
import type { AgentContext } from '../../services/specialized-agents/BaseSpecializedAgent';
import { AgentOrchestrator } from '../../services/specialized-agents/AgentOrchestrator';

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
    const names = orchestrator.getAvailableAgents().map((agent) => agent.name);

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
    const plan = await analyze(
      'Fix broken click handler bug in React modal component',
      { currentFile: 'src/components/Modal.tsx' }
    );

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
    const plan = await analyze(
      'Design scalable architecture for a new microservice API',
      { currentFile: 'src/services/apiDesign.ts' }
    );

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

    expect(executeParallelSpy).toHaveBeenCalledWith(['code_corrector'], 'Fix parser regression', {});
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
    await analyze(
      'Fix failing unit test caused by null reference bug in parser logic',
      { currentFile: 'src/parser.ts' }
    );

    expect(telemetry.trackEvent).toHaveBeenCalledWith(
      'orchestrator_code_correction_route_selected',
      expect.objectContaining({
        request_mode: 'agent',
        route: 'code_correction',
        correction_route_enabled: true,
      }),
    );
    expect(telemetry.trackEvent).toHaveBeenCalledWith(
      'orchestrator_strategy_selected',
      expect.objectContaining({
        request_mode: 'agent',
        strategy: 'sequential',
        route: 'code_correction',
      }),
    );
  });
});
