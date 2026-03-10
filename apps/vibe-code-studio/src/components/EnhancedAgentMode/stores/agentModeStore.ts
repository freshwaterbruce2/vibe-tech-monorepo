/**
 * Agent Mode Store
 * Zustand store for Enhanced Agent Mode state management
 * Uses React 19 optimizations - no manual memoization needed
 */
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { PerformanceProfile } from '../../../services/AgentPerformanceOptimizer';
import type {
    AgentOrchestrator,
    OrchestratorResponse
} from '../../../services/specialized-agents/AgentOrchestrator';
import type { AgentContext } from '../../../services/specialized-agents/BaseSpecializedAgent';
import {
    AgentInfo,
    LogEntry,
    LogEntryType,
    LogMetrics,
    TaskStatus,
    WorkspaceContextInfo
} from '../types';

/** Performance report structure */
interface PerformanceReport {
  readonly avgResponseTime: number;
  readonly cacheEfficiency: number;
  readonly activeAlerts: number;
  readonly memoryUsage: number;
}

/** Agent Mode Store State */
interface AgentModeState {
  // Core state
  task: string;
  status: TaskStatus;
  logs: readonly LogEntry[];
  activeAgents: readonly string[];
  agentProfiles: ReadonlyMap<string, PerformanceProfile>;
  expandedSections: ReadonlySet<string>;
  currentProgress: string;

  // Error recovery state
  lastError: Error | null;
  retryCount: number;
  maxRetries: number;

  // Context
  workspaceContext: WorkspaceContextInfo | undefined;

  // Orchestrator and optimizer references
  orchestrator: AgentOrchestrator | undefined;
  performanceOptimizer: {
    readonly getAgentProfile: (name: string) => PerformanceProfile | undefined;
    readonly getPerformanceReport: () => PerformanceReport;
  } | undefined;

  // Available agents cache
  availableAgents: readonly AgentInfo[];

  // Performance report cache
  performanceReport: PerformanceReport;
}

/** Agent Mode Store Actions */
interface AgentModeActions {
  // Task management
  setTask: (task: string) => void;
  executeTask: () => Promise<OrchestratorResponse | undefined>;
  retryTask: () => Promise<OrchestratorResponse | undefined>;
  stopTask: () => void;
  resetTask: () => void;
  clearError: () => void;

  // Logging
  addLog: (type: LogEntryType, content: string, agentName?: string, metrics?: LogMetrics) => void;
  clearLogs: () => void;

  // UI state
  toggleSection: (section: string) => void;
  setExpandedSections: (sections: ReadonlySet<string>) => void;

  // Context management
  setWorkspaceContext: (context: WorkspaceContextInfo | undefined) => void;
  setOrchestrator: (orchestrator: AgentOrchestrator) => void;
  setPerformanceOptimizer: (optimizer: AgentModeState['performanceOptimizer']) => void;

  // Agent management
  updateAgentProfiles: () => void;
  setActiveAgents: (agents: readonly string[]) => void;

  // Performance
  updatePerformanceReport: () => void;

  // Utilities
  formatTimestamp: (date: Date) => string;
}

/** Complete Agent Mode Store Type */
export type AgentModeStore = AgentModeState & AgentModeActions;

/** Initial state values */
const initialState: AgentModeState = {
  task: '',
  status: 'idle',
  logs: [],
  activeAgents: [],
  agentProfiles: new Map(),
  expandedSections: new Set(['agents', 'performance']),
  currentProgress: '',
  // Error recovery state
  lastError: null,
  retryCount: 0,
  maxRetries: 3,
  workspaceContext: undefined,
  orchestrator: undefined,
  performanceOptimizer: undefined,
  availableAgents: [],
  performanceReport: {
    avgResponseTime: 0,
    cacheEfficiency: 0,
    activeAlerts: 0,
    memoryUsage: 0,
  },
};

/**
 * Create the Enhanced Agent Mode store with Zustand.
 * Uses immer for immutable updates, devtools for debugging,
 * and selective persistence for session recovery.
 */
export const useAgentModeStore = create<AgentModeStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // Task management
          setTask: (task) => {
            set((state) => {
              state.task = task;
            });
          },

          executeTask: async () => {
            const { task, workspaceContext, orchestrator, addLog } = get();

            if (!task.trim() || !orchestrator) return;

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
              // Phase 1: Analysis
              set((state) => {
                state.status = 'analyzing';
                state.currentProgress = 'Analyzing task requirements and selecting optimal agents...';
              });
              addLog('info', 'Analyzing task requirements...');

              // Simulate analysis delay (remove in production)
              await new Promise(resolve => setTimeout(resolve, 1500));

              // Phase 2: Coordination
              set((state) => {
                state.status = 'coordinating';
                state.currentProgress = 'Coordinating multi-agent response strategy...';
              });
              addLog('coordination', 'Coordinating multi-agent strategy...');

              // Build context for orchestrator
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

              // Phase 3: Execution
              set((state) => {
                state.status = 'executing';
                state.currentProgress = 'Executing coordinated multi-agent analysis...';
              });
              addLog('agent', 'Executing multi-agent coordination...');

              const result = await orchestrator.processRequest(task, context);

              // Process agent responses
              const newActiveAgents: string[] = [];
              Object.entries(result.agentResponses).forEach(([agentKey, response]) => {
                const agentInfo = orchestrator.getAvailableAgents()
                  .find(a => a.name.toLowerCase().includes(agentKey));
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

              // Log coordination results
              if (result.coordination) {
                const confidence = Math.round(result.coordination.confidence * 100);
                addLog(
                  'coordination',
                  `Strategy: ${result.coordination.strategy} (${confidence}% confidence)`
                );
                addLog('coordination', `Reasoning: ${result.coordination.reasoning}`);
              }

              // Log performance metrics
              if (result.performance) {
                addLog(
                  'performance',
                  `Total time: ${result.performance.totalTime}ms, Parallelism: ${result.performance.parallelism}x`
                );

                Object.entries(result.performance.agentTimes).forEach(([agent, time]) => {
                  addLog('performance', `${agent}: ${time}ms`);
                });
              }

              set((state) => {
                state.status = 'completed';
                state.currentProgress = 'Task completed successfully!';
              });
              addLog('success', 'Multi-agent coordination completed successfully!');

              // Return result for onComplete callback
              return result;

            } catch (error) {
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
          },

          retryTask: async () => {
            const { retryCount, maxRetries, executeTask, addLog } = get();

            if (retryCount >= maxRetries) {
              addLog('error', 'Maximum retries reached. Please reset the task.');
              return undefined;
            }

            set((state) => {
              state.retryCount = state.retryCount + 1;
              state.lastError = null;
              state.status = 'idle';
            });

            addLog('info', `Retrying task (attempt ${retryCount + 2} of ${maxRetries + 1})...`);

            // Add exponential backoff delay
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));

            return executeTask();
          },

          clearError: () => {
            set((state) => {
              state.lastError = null;
              state.status = 'idle';
              state.currentProgress = '';
            });
          },

          stopTask: () => {
            set((state) => {
              state.status = 'idle';
              state.currentProgress = '';
            });
            get().addLog('info', 'Task execution stopped by user');
          },

          resetTask: () => {
            set((state) => {
              state.status = 'idle';
              state.logs = [];
              state.activeAgents = [];
              state.currentProgress = '';
              // Reset error recovery state
              state.lastError = null;
              state.retryCount = 0;
            });
          },

          // Logging
          addLog: (type, content, agentName, metrics) => {
            const newEntry: LogEntry = {
              id: crypto.randomUUID(),
              type,
              timestamp: new Date(),
              content,
              agentName,
              metrics,
            };

            set((state) => {
              // Keep only last 1000 logs for performance
              const logs = state.logs.length >= 1000
                ? [...state.logs.slice(-999), newEntry]
                : [...state.logs, newEntry];

              state.logs = logs;
            });
          },

          clearLogs: () => {
            set((state) => {
              state.logs = [];
            });
          },

          // UI state
          toggleSection: (section) => {
            set((state) => {
              const newSet = new Set(state.expandedSections);
              if (newSet.has(section)) {
                newSet.delete(section);
              } else {
                newSet.add(section);
              }
              state.expandedSections = newSet;
            });
          },

          setExpandedSections: (sections) => {
            set((state) => {
              // Create mutable Set from ReadonlySet
              state.expandedSections = new Set(sections);
            });
          },

          // Context management
          setWorkspaceContext: (context) => {
            set((state) => {
              // Create mutable copy to satisfy Immer's draft state
              if (context) {
                state.workspaceContext = {
                  ...context,
                  openFiles: context.openFiles ? [...context.openFiles] : []
                };
              } else {
                state.workspaceContext = undefined;
              }
            });
          },

          setOrchestrator: (orchestrator) => {
            set((state) => {
              state.orchestrator = orchestrator;
              state.availableAgents = orchestrator.getAvailableAgents();
            });
          },

          setPerformanceOptimizer: (optimizer) => {
            set((state) => {
              state.performanceOptimizer = optimizer;
              if (optimizer) {
                state.performanceReport = optimizer.getPerformanceReport();
              }
            });
          },

          // Agent management
          updateAgentProfiles: () => {
            const { orchestrator, performanceOptimizer } = get();
            if (!orchestrator || !performanceOptimizer) return;

            const agents = orchestrator.getAvailableAgents();
            const profiles = new Map<string, PerformanceProfile>();

            agents.forEach(agent => {
              const profile = performanceOptimizer.getAgentProfile(agent.name);
              if (profile) {
                profiles.set(agent.name, profile);
              }
            });

            set((state) => {
              state.agentProfiles = profiles;
            });
          },

          setActiveAgents: (agents) => {
            set((state) => {
              // Create mutable copy to satisfy Immer's draft state
              state.activeAgents = [...agents];
            });
          },

          // Performance
          updatePerformanceReport: () => {
            const { performanceOptimizer } = get();
            if (!performanceOptimizer) return;

            set((state) => {
              state.performanceReport = performanceOptimizer.getPerformanceReport();
            });
          },

          // Utilities
          formatTimestamp: (date) => {
            return date.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            } as const);
          },
        })),
        {
          name: 'agent-mode-storage',
          version: 1,
          // Only persist minimal state for recovery
          partialize: (state) => ({
            task: state.task,
            logs: state.logs.slice(-100), // Keep last 100 logs
            expandedSections: state.expandedSections,
          }),
        }
      )
    ),
    {
      name: 'agent-mode',
    }
  )
);

// Selector hooks for optimized subscriptions
export const useAgentTask = () => useAgentModeStore((state) => state.task);
export const useAgentStatus = () => useAgentModeStore((state) => state.status);
export const useAgentLogs = () => useAgentModeStore((state) => state.logs);
export const useActiveAgents = () => useAgentModeStore((state) => state.activeAgents);
export const useAgentProfiles = () => useAgentModeStore((state) => state.agentProfiles);
export const useExpandedSections = () => useAgentModeStore((state) => state.expandedSections);
export const useCurrentProgress = () => useAgentModeStore((state) => state.currentProgress);
export const usePerformanceReport = () => useAgentModeStore((state) => state.performanceReport);

// Error recovery selectors
export const useLastError = () => useAgentModeStore((state) => state.lastError);
export const useRetryCount = () => useAgentModeStore((state) => state.retryCount);
export const useMaxRetries = () => useAgentModeStore((state) => state.maxRetries);
export const useCanRetry = () => useAgentModeStore((state) => state.retryCount < state.maxRetries && state.status === 'error');

// Action selectors
export const useAgentActions = () => useAgentModeStore((state) => ({
  setTask: state.setTask,
  executeTask: state.executeTask,
  retryTask: state.retryTask,
  stopTask: state.stopTask,
  resetTask: state.resetTask,
  clearError: state.clearError,
  toggleSection: state.toggleSection,
  formatTimestamp: state.formatTimestamp,
}));
