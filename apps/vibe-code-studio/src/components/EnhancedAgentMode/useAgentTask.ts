/**
 * useAgentTask Hook
 * Bridge hook that connects the EnhancedAgentMode component to the Zustand store.
 * This is a simplified version that leverages Zustand for state management.
 * No manual memoization needed - React 19 handles optimization.
 */
import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { useAgentModeStore } from './stores/agentModeStore';
import type { UseAgentTaskOptions, UseAgentTaskReturn } from './types';

const isWorkspaceContextEqual = (a: any, b: any) => {
  if (a === b) return true;
  if (!a || !b) return false;

  const aOpenFiles = a.openFiles || [];
  const bOpenFiles = b.openFiles || [];

  if (aOpenFiles.length !== bOpenFiles.length) return false;
  for (let i = 0; i < aOpenFiles.length; i++) {
    if (aOpenFiles[i] !== bOpenFiles[i]) return false;
  }

  return (
    a.workspaceFolder === b.workspaceFolder &&
    a.currentFile === b.currentFile
  );
};

type CompleteTimeoutRef = MutableRefObject<ReturnType<typeof setTimeout> | undefined>;

/**
 * Store-sync, auto-scroll, periodic profile refresh, and unmount cleanup effects.
 * Actions are read via getState() so the whole-store snapshot is NOT a dependency
 * (depending on `store` here re-runs/loops the effects on every state change).
 */
function useAgentTaskEffects(
  options: UseAgentTaskOptions,
  logs: UseAgentTaskReturn['logs'],
  logEndRef: RefObject<HTMLDivElement | null>,
  onCompleteTimeoutRef: CompleteTimeoutRef,
): void {
  const { orchestrator, performanceOptimizer, workspaceContext } = options;

  useEffect(() => {
    const currentState = useAgentModeStore.getState();
    if (orchestrator !== currentState.orchestrator) {
      currentState.setOrchestrator(orchestrator);
    }
    if (performanceOptimizer !== currentState.performanceOptimizer) {
      currentState.setPerformanceOptimizer(performanceOptimizer);
    }
    if (!isWorkspaceContextEqual(workspaceContext, currentState.workspaceContext)) {
      currentState.setWorkspaceContext(workspaceContext);
    }
  }, [orchestrator, performanceOptimizer, workspaceContext]);

  // Auto-scroll to latest log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, logEndRef]);

  // Update agent profiles periodically (poll once mounted).
  useEffect(() => {
    const runUpdate = () => {
      const { updateAgentProfiles, updatePerformanceReport } = useAgentModeStore.getState();
      updateAgentProfiles();
      updatePerformanceReport();
    };

    runUpdate();
    const interval = setInterval(runUpdate, 2000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup pending onComplete timeout on unmount
  useEffect(() => {
    return () => {
      if (onCompleteTimeoutRef.current) {
        clearTimeout(onCompleteTimeoutRef.current);
      }
    };
  }, [onCompleteTimeoutRef]);
}

/** Map the Zustand store snapshot + wrapped actions to the hook's public shape. */
function buildAgentTaskReturn(
  store: ReturnType<typeof useAgentModeStore.getState>,
  logEndRef: RefObject<HTMLDivElement | null>,
  executeTask: () => Promise<void>,
  retryTask: () => Promise<void>,
): UseAgentTaskReturn {
  return {
    // State
    task: store.task,
    setTask: store.setTask,
    status: store.status,
    logs: store.logs,
    activeAgents: store.activeAgents,
    agentProfiles: store.agentProfiles,
    expandedSections: store.expandedSections,
    currentProgress: store.currentProgress,
    logEndRef,

    // Error recovery state
    lastError: store.lastError,
    retryCount: store.retryCount,
    maxRetries: store.maxRetries,
    canRetry: store.retryCount < store.maxRetries && store.status === 'error',

    // Actions - no memoization needed
    executeTask,
    retryTask,
    handleStop: store.stopTask,
    resetTask: store.resetTask,
    clearError: store.clearError,
    toggleSection: store.toggleSection,
    formatTimestamp: store.formatTimestamp,

    // Data
    availableAgents: store.availableAgents,
    performanceReport: store.performanceReport,
  };
}

/**
 * Custom hook for managing multi-agent task execution.
 * Bridges the component to the Zustand store for centralized state management.
 *
 * @param options - Configuration options including orchestrator and optimizer
 * @returns All state and actions needed for agent task management
 */
export function useAgentTask(options: UseAgentTaskOptions): UseAgentTaskReturn {
  const { onComplete } = options;

  const store = useAgentModeStore();
  const logEndRef = useRef<HTMLDivElement>(null);
  const onCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useAgentTaskEffects(options, store.logs, logEndRef, onCompleteTimeoutRef);

  // Wrap executeTask to handle onComplete callback
  const executeTask = async () => {
    if (onCompleteTimeoutRef.current) {
      clearTimeout(onCompleteTimeoutRef.current);
      onCompleteTimeoutRef.current = undefined;
    }
    const result = await store.executeTask();
    if (result) {
      onCompleteTimeoutRef.current = setTimeout(() => {
        onCompleteTimeoutRef.current = undefined;
        onComplete(result);
      }, 2000);
    }
  };

  // Wrap retryTask similarly
  const retryTask = async () => {
    if (onCompleteTimeoutRef.current) {
      clearTimeout(onCompleteTimeoutRef.current);
      onCompleteTimeoutRef.current = undefined;
    }
    const result = await store.retryTask();
    if (result) {
      onCompleteTimeoutRef.current = setTimeout(() => {
        onCompleteTimeoutRef.current = undefined;
        onComplete(result);
      }, 2000);
    }
  };

  return buildAgentTaskReturn(store, logEndRef, executeTask, retryTask);
}

// Re-export the original types for compatibility
export type { UseAgentTaskOptions, UseAgentTaskReturn } from './types';
