/**
 * Agent task execution pipeline for Enhanced Agent Mode.
 *
 * Extracted from agentModeStore.ts so each unit stays under the 50-line function
 * cap (and the store under the 600-line file cap). Operates purely over the
 * store's set/get plus addLog — no React, no side effects beyond store + logs.
 */
import type { Draft } from 'immer';
import type {
    AgentOrchestrator,
    OrchestratorResponse
} from '../../../services/specialized-agents/AgentOrchestrator';
import type { AgentContext } from '../../../services/specialized-agents/BaseSpecializedAgent';
import { unifiedAI } from '../../../services/ai/UnifiedAIService';
import { BackendProxyService } from '../../../services/ai/providers/BackendProxyService';
import type { WorkspaceContextInfo } from '../types';
import type { AgentModeStore } from './agentModeStore';

// Proxy mode (default ON): mirrors AIProviderFactory / UnifiedAIService. Drives the
// accurate "backend down vs no server key" pre-flight message below.
const USE_AI_PROXY = import.meta.env['VITE_USE_AI_PROXY'] !== 'false';

export type AgentSet = (recipe: (state: Draft<AgentModeStore>) => void) => void;
export type AgentGet = () => AgentModeStore;
type AddLog = AgentModeStore['addLog'];

export interface TaskRunnerDeps {
  readonly set: AgentSet;
  readonly get: AgentGet;
}

/**
 * Pre-flight: a real AI provider must be configured before running agents.
 * Without one the specialized agents silently fall back to canned text and the
 * run reports a hollow "success" (the "agent did nothing" symptom). Returns
 * false (and sets an actionable error) when nothing usable is available.
 */
async function ensureProviderConfigured(set: AgentSet, addLog: AddLog): Promise<boolean> {
  const providerConfigured = await unifiedAI.isAnyProviderConfigured();
  if (providerConfigured) return true;

  // Give an accurate reason instead of a blanket "add an API key": in proxy mode
  // the real cause is usually a down backend or a server missing its provider key.
  let message =
    'No AI provider configured. Add a Kimi (Moonshot), Google, or OpenRouter API key in Settings.';
  let hint =
    'Open Settings (gear icon), add an API key for Kimi (Moonshot), Google, or OpenRouter, then run again.';
  if (USE_AI_PROXY) {
    const health = await new BackendProxyService().health();
    if (!health.reachable) {
      message = 'AI backend (localhost:5004) is not running. Start the backend, then run again.';
      hint = 'Launch the companion backend (scripts/backend-server.js) and retry.';
    } else {
      message =
        'The AI backend has no provider key configured. Set KIMI_API_KEY, OPENROUTER_API_KEY, or GOOGLE_API_KEY on the server.';
      hint = 'Add a provider key to the backend environment, restart it, then run again.';
    }
  }
  set((state) => {
    state.status = 'error';
    state.currentProgress = message;
  });
  addLog('error', message);
  addLog('info', hint);
  return false;
}

/** Build the orchestrator context from the current workspace selection. */
function buildContext(workspaceContext: WorkspaceContextInfo | undefined): AgentContext {
  const context: AgentContext = {};
  if (workspaceContext?.workspaceFolder) {
    context.workspaceRoot = workspaceContext.workspaceFolder;
  }
  if (workspaceContext?.currentFile) {
    context.currentFile = workspaceContext.currentFile;
  }
  if (workspaceContext?.openFiles) {
    context.files = [...workspaceContext.openFiles];
  }
  return context;
}

/** Record each agent's response as an active agent + a log line. */
function recordAgentResponses(
  result: OrchestratorResponse,
  orchestrator: AgentOrchestrator,
  set: AgentSet,
  addLog: AddLog
): void {
  const newActiveAgents: string[] = [];
  Object.entries(result.agentResponses).forEach(([agentKey, response]) => {
    const agentInfo = orchestrator.getAvailableAgents()
      .find((a) => a.name.toLowerCase().includes(agentKey));
    const agentName = agentInfo?.name ?? agentKey;

    addLog('agent', 'Response received', agentName, {
      confidence: response.confidence,
      processingTime: response.performance?.processingTime ?? 0,
      suggestions: response.suggestions?.length ?? 0,
    });

    newActiveAgents.push(agentName);
  });

  set((state) => {
    state.activeAgents = newActiveAgents;
  });
}

/** Log coordination strategy + performance metrics from a completed run. */
function logCoordinationAndPerformance(result: OrchestratorResponse, addLog: AddLog): void {
  if (result.coordination) {
    const confidence = Math.round(result.coordination.confidence * 100);
    addLog(
      'coordination',
      `Strategy: ${result.coordination.strategy} (${confidence}% confidence)`
    );
    addLog('coordination', `Reasoning: ${result.coordination.reasoning}`);
  }

  if (result.performance) {
    addLog(
      'performance',
      `Total time: ${result.performance.totalTime}ms, Parallelism: ${result.performance.parallelism}x`
    );

    Object.entries(result.performance.agentTimes).forEach(([agent, time]) => {
      addLog('performance', `${agent}: ${time}ms`);
    });
  }
}

/** Drive analysis -> coordination -> execution and return the orchestrator result. */
async function runOrchestration(
  deps: TaskRunnerDeps,
  orchestrator: AgentOrchestrator,
  task: string,
  addLog: AddLog
): Promise<OrchestratorResponse> {
  const { set, get } = deps;

  // Phase 1: Analysis
  set((state) => {
    state.status = 'analyzing';
    state.currentProgress = 'Analyzing task requirements and selecting optimal agents...';
  });
  addLog('info', 'Analyzing task requirements...');

  // Phase 2: Coordination
  set((state) => {
    state.status = 'coordinating';
    state.currentProgress = 'Coordinating multi-agent response strategy...';
  });
  addLog('coordination', 'Coordinating multi-agent strategy...');

  const context = buildContext(get().workspaceContext);

  // Phase 3: Execution
  set((state) => {
    state.status = 'executing';
    state.currentProgress = 'Executing coordinated multi-agent analysis...';
  });
  addLog('agent', 'Executing multi-agent coordination...');

  const result = await orchestrator.processRequest(task, context);
  recordAgentResponses(result, orchestrator, set, addLog);
  logCoordinationAndPerformance(result, addLog);
  return result;
}

/**
 * Detect a hollow run: if every agent fell back to canned text (confidence 0.3)
 * the AI provider rejected the calls (bad key / unknown model). Surface it
 * instead of reporting a fake success. Returns the result on a usable run, or
 * undefined when every agent returned a placeholder.
 */
function finalizeRun(
  set: AgentSet,
  addLog: AddLog,
  result: OrchestratorResponse
): OrchestratorResponse | undefined {
  const responses = Object.values(result.agentResponses);
  // Fallback responses are stamped confidence 0.3 by BaseSpecializedAgent; real
  // answers clamp to >= 0.5. Count fallbacks to detect hollow runs.
  const fallbackCount = responses.filter((r) => r.confidence <= 0.3).length;
  if (responses.length > 0 && fallbackCount === responses.length) {
    set((state) => {
      state.status = 'error';
      state.currentProgress =
        'Agents got no usable AI response. Check your API key and selected model in Settings.';
    });
    addLog('error', 'No usable AI response: every agent returned a placeholder.');
    addLog('info', 'Verify your Kimi/Google/OpenRouter key and selected model in Settings, then retry.');
    return undefined;
  }

  // Partial hollow run: some agents answered, others fell back. Still complete,
  // but warn that part of the synthesized report is placeholder.
  if (fallbackCount > 0) {
    addLog(
      'error',
      `${fallbackCount} of ${responses.length} agents failed to get a real AI response — that part of the report is placeholder text. Check your API key/model.`
    );
  }

  set((state) => {
    state.status = 'completed';
    state.currentProgress =
      fallbackCount > 0
        ? `Task completed with partial failures — ${fallbackCount} of ${responses.length} agents returned placeholders.`
        : 'Task completed successfully!';
  });
  addLog('success', 'Multi-agent coordination completed successfully!');
  return result;
}

/** Categorize a run failure and surface an actionable recovery hint. */
function handleRunError(error: unknown, get: AgentGet, set: AgentSet, addLog: AddLog): undefined {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const { retryCount, maxRetries } = get();

  // Categorize error for better UX
  let errorCategory = 'unknown';
  let recoveryHint = 'Try again or simplify your request.';

  if (errorObj.message.includes('timeout') || errorObj.message.includes('ETIMEDOUT')) {
    errorCategory = 'timeout';
    recoveryHint = 'The request timed out. Try a shorter or simpler task.';
  } else if (errorObj.message.includes('network') || errorObj.message.includes('fetch')) {
    errorCategory = 'network';
    recoveryHint = 'Network error. Check your connection and try again.';
  } else if (errorObj.message.includes('rate') || errorObj.message.includes('429')) {
    errorCategory = 'rate_limit';
    recoveryHint = 'Rate limited. Please wait a moment before retrying.';
  } else if (errorObj.message.includes('API') || errorObj.message.includes('key')) {
    errorCategory = 'api';
    recoveryHint = 'API error. Check your API key configuration.';
  }

  set((state) => {
    state.status = 'error';
    state.lastError = errorObj;
    state.currentProgress = `Task failed (${errorCategory}): ${recoveryHint}`;
  });

  addLog('error', `Task failed [${errorCategory}]: ${errorObj.message}`);
  addLog('info', `Recovery: ${recoveryHint}`);

  if (retryCount < maxRetries) {
    addLog('info', `Retries remaining: ${maxRetries - retryCount}. Use "Retry" to try again.`);
  } else {
    addLog('error', 'Maximum retries reached. Please reset and try a different approach.');
  }

  // Return undefined - let UI handle recovery
  return undefined;
}

/**
 * Execute the current agent task end-to-end. Mirrors the prior in-store
 * executeTask: guards, provider pre-flight, orchestration, hollow-run detection,
 * and categorized error recovery.
 */
export async function executeAgentTask(
  deps: TaskRunnerDeps
): Promise<OrchestratorResponse | undefined> {
  const { set, get } = deps;
  const { task, workspaceContext, orchestrator, addLog } = get();

  if (!task.trim()) {
    set((state) => {
      state.status = 'error';
      state.currentProgress = 'Enter a task description before running the agent.';
    });
    addLog('error', 'No task entered. Type what you want the agents to do, then run.');
    return undefined;
  }
  if (!orchestrator) {
    set((state) => {
      state.status = 'error';
      state.currentProgress = 'Agent orchestrator unavailable. Reopen Agent Mode and retry.';
    });
    addLog('error', 'Agent orchestrator not initialized.');
    return undefined;
  }

  if (!(await ensureProviderConfigured(set, addLog))) return undefined;

  // Reset state for new execution
  set((state) => {
    state.status = 'analyzing';
    state.logs = [];
    state.activeAgents = [];
    state.currentProgress = 'Initializing task analysis...';
  });

  addLog('info', `Starting enhanced multi-agent task: "${task}"`);
  addLog('info', `Workspace: ${workspaceContext?.workspaceFolder ?? 'No workspace'}`);

  try {
    const result = await runOrchestration(deps, orchestrator, task, addLog);
    return finalizeRun(set, addLog, result);
  } catch (error) {
    return handleRunError(error, get, set, addLog);
  }
}
