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
import type {
    AgentInfo,
    LogEntry,
    LogEntryType,
    LogMetrics,
    TaskStatus,
    WorkspaceContextInfo
} from '../types';
import { executeAgentTask } from './agentTaskRunner';
import type { AgentGet, AgentSet } from './agentTaskRunner';

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
  expandedSections: readonly string[];
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
  setExpandedSections: (sections: readonly string[]) => void;

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
  expandedSections: ['agents', 'performance'],
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

// Actions are grouped into small factory functions so the store-creation arrow
// (and each action group) stays under the 50-line function cap. The heavy
// executeTask pipeline lives in ./agentTaskRunner.

/** Task lifecycle: set/execute/retry/clear. */
const createTaskActions = (set: AgentSet, get: AgentGet) => ({
  setTask: (task: string) => {
    set((state) => {
      state.task = task;
    });
  },

  executeTask: (): Promise<OrchestratorResponse | undefined> => executeAgentTask({ set, get }),

  retryTask: async (): Promise<OrchestratorResponse | undefined> => {
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
    await new Promise((resolve) => setTimeout(resolve, delay));

    return executeTask();
  },

  clearError: () => {
    set((state) => {
      state.lastError = null;
      state.status = 'idle';
      state.currentProgress = '';
    });
  },
});

/** Stop / reset task execution state. */
const createLifecycleActions = (set: AgentSet, get: AgentGet) => ({
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
});

/** Log append / clear. */
const createLogActions = (set: AgentSet) => ({
  addLog: (type: LogEntryType, content: string, agentName?: string, metrics?: LogMetrics) => {
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
});

/** Expandable-section UI state. */
const createUIActions = (set: AgentSet) => ({
  toggleSection: (section: string) => {
    set((state) => {
      const current = state.expandedSections;
      if (current.includes(section)) {
        state.expandedSections = current.filter((s) => s !== section);
      } else {
        state.expandedSections = [...current, section];
      }
    });
  },

  setExpandedSections: (sections: readonly string[]) => {
    set((state) => {
      state.expandedSections = [...sections];
    });
  },
});

/** Workspace context + orchestrator/optimizer wiring. */
const createContextActions = (set: AgentSet) => ({
  setWorkspaceContext: (context: WorkspaceContextInfo | undefined) => {
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

  setOrchestrator: (orchestrator: AgentOrchestrator) => {
    set((state) => {
      state.orchestrator = orchestrator;
      state.availableAgents = orchestrator.getAvailableAgents();
    });
  },

  setPerformanceOptimizer: (optimizer: AgentModeState['performanceOptimizer']) => {
    set((state) => {
      state.performanceOptimizer = optimizer;
      if (optimizer) {
        state.performanceReport = optimizer.getPerformanceReport();
      }
    });
  },
});

/** Agent profiles + performance reporting + utilities. */
const createAgentActions = (set: AgentSet, get: AgentGet) => ({
  updateAgentProfiles: () => {
    const { orchestrator, performanceOptimizer } = get();
    if (!orchestrator || !performanceOptimizer) return;

    const agents = orchestrator.getAvailableAgents();
    const profiles = new Map<string, PerformanceProfile>();

    agents.forEach((agent) => {
      const profile = performanceOptimizer.getAgentProfile(agent.name);
      if (profile) {
        profiles.set(agent.name, profile);
      }
    });

    set((state) => {
      state.agentProfiles = profiles;
    });
  },

  setActiveAgents: (agents: readonly string[]) => {
    set((state) => {
      // Create mutable copy to satisfy Immer's draft state
      state.activeAgents = [...agents];
    });
  },

  updatePerformanceReport: () => {
    const { performanceOptimizer } = get();
    if (!performanceOptimizer) return;

    set((state) => {
      state.performanceReport = performanceOptimizer.getPerformanceReport();
    });
  },

  formatTimestamp: (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    } as const);
  },
});

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
          ...createTaskActions(set, get),
          ...createLifecycleActions(set, get),
          ...createLogActions(set),
          ...createUIActions(set),
          ...createContextActions(set),
          ...createAgentActions(set, get),
        })),
        {
          name: 'agent-mode-storage',
          version: 2,
          migrate: (persistedState: any, version: number) => {
            if (version === 1) {
              if (persistedState && typeof persistedState === 'object') {
                persistedState.expandedSections = ['agents', 'performance'];
              }
            }
            return persistedState;
          },
          merge: (persistedState: any, currentState: any) => {
            const merged = { ...currentState, ...persistedState };
            if (!Array.isArray(merged.expandedSections)) {
              merged.expandedSections = ['agents', 'performance'];
            }
            return merged;
          },
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
