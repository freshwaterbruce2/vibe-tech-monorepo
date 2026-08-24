import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Store-level tests for `agentModeStore.executeTask`.
 *
 * Regression coverage for the "Agent did nothing" bug: when no AI provider is
 * configured the specialized agents used to swallow the missing-key error and
 * return canned fallbacks, so the run reported a hollow "success". executeTask
 * now fails fast with an actionable message (and guards the empty-task and
 * all-fallback cases too). We mock the unifiedAI singleton so provider
 * configuration is fully controllable, and drive the real Zustand store.
 */

// Hoisted so the BackendProxyService class-mock below can close over it.
const { healthMock } = vi.hoisted(() => ({ healthMock: vi.fn() }));

vi.mock('../../services/ai/UnifiedAIService', () => ({
  unifiedAI: {
    isAnyProviderConfigured: vi.fn(),
    getFactory: vi.fn(() => ({
      getInitializedProviders: vi.fn(() => []),
      ensureProxyProvidersInitialized: vi.fn(async () => undefined),
    })),
  },
}));

vi.mock('../../services/ai/providers/BackendProxyService', () => ({
  BackendProxyService: class {
    health = healthMock;
  },
}));

import { useAgentModeStore } from '../../components/EnhancedAgentMode/stores/agentModeStore';
import { unifiedAI } from '../../services/ai/UnifiedAIService';

function mockHealth(health: {
  reachable: boolean;
  configured: Record<string, boolean>;
  anyConfigured: boolean;
}) {
  healthMock.mockResolvedValue(health);
}

function fakeOrchestrator(processRequest: () => Promise<unknown>) {
  return {
    getAvailableAgents: vi.fn(() => []),
    processRequest: vi.fn(processRequest),
  } as never;
}

function resetStore() {
  useAgentModeStore.setState({
    task: '',
    status: 'idle',
    logs: [],
    activeAgents: [],
    currentProgress: '',
    lastError: null,
    retryCount: 0,
    workspaceContext: undefined,
    orchestrator: undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('agentModeStore.executeTask', () => {
  it('fails when task is empty or orchestrator is missing', async () => {
    useAgentModeStore.setState({ task: '   ', orchestrator: undefined });
    await useAgentModeStore.getState().executeTask();
    expect(useAgentModeStore.getState().status).toBe('error');

    resetStore();
    useAgentModeStore.setState({ task: 'real task', orchestrator: undefined });
    await useAgentModeStore.getState().executeTask();
    expect(useAgentModeStore.getState().currentProgress).toMatch(/orchestrator unavailable/i);
  });

  it('fails fast with a backend-down message when the proxy is unreachable', async () => {
    vi.mocked(unifiedAI.isAnyProviderConfigured).mockResolvedValue(false);
    mockHealth({ reachable: false, configured: {}, anyConfigured: false });
    const orchestrator = fakeOrchestrator(async () => ({ response: 'x', agentResponses: {} }));
    useAgentModeStore.setState({ task: 'refactor the auth module', orchestrator });

    const result = await useAgentModeStore.getState().executeTask();

    expect(result).toBeUndefined();
    const state = useAgentModeStore.getState();
    expect(state.status).toBe('error');
    expect(state.currentProgress).toMatch(/backend.*not running/i);
    // The orchestrator must never run when there's no usable provider.
    expect(
      (orchestrator as unknown as { processRequest: ReturnType<typeof vi.fn> }).processRequest
    ).not.toHaveBeenCalled();
    expect(state.logs.some(l => /backend/i.test(l.content))).toBe(true);
  });

  it('reports a missing server key when the proxy is reachable but unconfigured', async () => {
    vi.mocked(unifiedAI.isAnyProviderConfigured).mockResolvedValue(false);
    mockHealth({ reachable: true, configured: { moonshot: false }, anyConfigured: false });
    const orchestrator = fakeOrchestrator(async () => ({ response: 'x', agentResponses: {} }));
    useAgentModeStore.setState({ task: 'refactor the auth module', orchestrator });

    const result = await useAgentModeStore.getState().executeTask();

    expect(result).toBeUndefined();
    const state = useAgentModeStore.getState();
    expect(state.status).toBe('error');
    expect(state.currentProgress).toMatch(/no provider key configured/i);
    expect(
      (orchestrator as unknown as { processRequest: ReturnType<typeof vi.fn> }).processRequest
    ).not.toHaveBeenCalled();
  });

  it('guards an empty task before touching the provider', async () => {
    const orchestrator = fakeOrchestrator(async () => ({ response: 'x', agentResponses: {} }));
    useAgentModeStore.setState({ task: '   ', orchestrator });

    const result = await useAgentModeStore.getState().executeTask();

    expect(result).toBeUndefined();
    expect(useAgentModeStore.getState().status).toBe('error');
    expect(unifiedAI.isAnyProviderConfigured).not.toHaveBeenCalled();
  });

  it('surfaces a hollow run when every agent returns a fallback (confidence 0.3)', async () => {
    vi.mocked(unifiedAI.isAnyProviderConfigured).mockResolvedValue(true);
    const orchestrator = fakeOrchestrator(async () => ({
      response: 'x',
      agentResponses: { technical_lead: { content: 'fallback', confidence: 0.3 } },
    }));
    useAgentModeStore.setState({ task: 'build a feature', orchestrator });

    const result = await useAgentModeStore.getState().executeTask();

    expect(result).toBeUndefined();
    const state = useAgentModeStore.getState();
    expect(state.status).toBe('error');
    expect(state.currentProgress).toMatch(/no usable ai response/i);
  });

  it('completes when at least one agent returns a real response', async () => {
    vi.mocked(unifiedAI.isAnyProviderConfigured).mockResolvedValue(true);
    const orchestrator = fakeOrchestrator(async () => ({
      response: 'done',
      agentResponses: { technical_lead: { content: 'real answer', confidence: 0.85 } },
    }));
    useAgentModeStore.setState({ task: 'build a feature', orchestrator });

    const result = await useAgentModeStore.getState().executeTask();

    expect(result).toBeDefined();
    expect(useAgentModeStore.getState().status).toBe('completed');
  });
});
