import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../services/ai/UnifiedAIService', () => ({ unifiedAI: { isAnyProviderConfigured: vi.fn(async () => true) } }));
vi.mock('../../services/ai/providers/BackendProxyService', () => ({ BackendProxyService: vi.fn() }));
vi.mock('../../services/AIUsageMode', () => ({ useAIProxy: false, activeAIUsageMode: 'byok' }));
import { cancelAgentTask, executeAgentTask, waitForAgentRetry } from '../../components/EnhancedAgentMode/stores/agentTaskRunner';
import type { AgentGet, AgentSet } from '../../components/EnhancedAgentMode/stores/agentTaskRunner';
import type { AgentModeStore } from '../../components/EnhancedAgentMode/stores/agentModeStore';
import type { OrchestratorResponse } from '../../services/specialized-agents/AgentOrchestrator';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const response = { response: 'Done', agentResponses: {}, recommendations: [] } as unknown as OrchestratorResponse;
describe('Agent run cancellation ownership', () => {
  beforeEach(() => vi.clearAllMocks());
  it('aborts the old request and ignores its result while a newer run is active', async () => {
    const old = deferred<OrchestratorResponse>();
    const fresh = deferred<OrchestratorResponse>();
    const processRequest = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const state = { task: 'Review code', status: 'idle', addLog: vi.fn(), orchestrator: { processRequest, getAvailableAgents: () => [] } } as unknown as AgentModeStore;
    const get: AgentGet = () => state;
    const set: AgentSet = recipe => { recipe(state); };
    const first = executeAgentTask({ get, set });
    await vi.waitFor(() => expect(processRequest).toHaveBeenCalledTimes(1));
    const signal = processRequest.mock.calls[0]![1].signal as AbortSignal;
    cancelAgentTask(get);
    expect(signal.aborted).toBe(true);
    const second = executeAgentTask({ get, set });
    await vi.waitFor(() => expect(processRequest).toHaveBeenCalledTimes(2));
    old.resolve(response);
    expect(await first).toBeUndefined();
    expect(state.status).toBe('executing');
    fresh.resolve(response);
    expect(await second).toBe(response);
    expect(state.status).toBe('completed');
  });
  it('cancels a queued retry before it starts another billed request', async () => {
    const get = (() => ({})) as AgentGet;
    const pending = waitForAgentRetry(get, 10000);
    cancelAgentTask(get);
    expect(await pending).toBe(false);
  });
});
