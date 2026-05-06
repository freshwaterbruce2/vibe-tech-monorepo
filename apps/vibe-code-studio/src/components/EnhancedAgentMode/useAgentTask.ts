/**
 * useAgentTask Hook
 * Bridge hook that connects the EnhancedAgentMode component to the Zustand store.
 * This is a simplified version that leverages Zustand for state management.
 * No manual memoization needed - React 19 handles optimization.
 */
import { useEffect, useRef } from 'react';
import { useAgentModeStore } from './stores/agentModeStore';
import type { UseAgentTaskOptions, UseAgentTaskReturn } from './types';

/**
 * Custom hook for managing multi-agent task execution.
 * Bridges the component to the Zustand store for centralized state management.
 *
 * @param options - Configuration options including orchestrator and optimizer
 * @returns All state and actions needed for agent task management
 */
export function useAgentTask(options: UseAgentTaskOptions): UseAgentTaskReturn {
  const { orchestrator, performanceOptimizer, workspaceContext, onComplete } = options;

  // Get all state and actions from the store - no memoization needed
  const store = useAgentModeStore();
  const logEndRef = useRef<HTMLDivElement>(null);
  const onCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Initialize orchestrator and optimizer in store
  useEffect(() => {
    store.setOrchestrator(orchestrator);
    store.setPerformanceOptimizer(performanceOptimizer);
    store.setWorkspaceContext(workspaceContext);
  }, [orchestrator, performanceOptimizer, workspaceContext, store]);

  // Auto-scroll to latest log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.logs]);

  // Update agent profiles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      store.updateAgentProfiles();
      store.updatePerformanceReport();
    }, 2000);

    // Initial update
    store.updateAgentProfiles();
    store.updatePerformanceReport();

    return () => clearInterval(interval);
  }, [store]);

  // Wrap executeTask to handle onComplete callback
  const executeTask = async () => {
    // Clear any previous pending onComplete timeout
    if (onCompleteTimeoutRef.current) {
      clearTimeout(onCompleteTimeoutRef.current);
      onCompleteTimeoutRef.current = undefined;
    }
    const result = await store.executeTask();
    if (result) {
      // Auto-complete after showing results
      onCompleteTimeoutRef.current = setTimeout(() => {
        onCompleteTimeoutRef.current = undefined;
        onComplete(result);
      }, 2000);
    }
  };

  // Wrap retryTask similarly
  const retryTask = async () => {
    // Clear any previous pending onComplete timeout
    if (onCompleteTimeoutRef.current) {
      clearTimeout(onCompleteTimeoutRef.current);
      onCompleteTimeoutRef.current = undefined;
    }
    const result = await store.retryTask();
    if (result) {
      // Auto-complete after showing results
      onCompleteTimeoutRef.current = setTimeout(() => {
        onCompleteTimeoutRef.current = undefined;
        onComplete(result);
      }, 2000);
    }
  };

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (onCompleteTimeoutRef.current) {
        clearTimeout(onCompleteTimeoutRef.current);
      }
    };
  }, []);

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

// Re-export the original types for compatibility
export type { UseAgentTaskOptions, UseAgentTaskReturn } from './types';