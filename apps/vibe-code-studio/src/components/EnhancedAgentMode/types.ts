/**
 * EnhancedAgentMode Types
 * Type definitions for the Enhanced Agent Mode component
 * @module EnhancedAgentMode/types
 */
import type { RefObject } from 'react';
import type { PerformanceProfile, AgentPerformanceOptimizer } from '../../services/AgentPerformanceOptimizer';
import type { OrchestratorResponse, AgentOrchestrator } from '../../services/specialized-agents/AgentOrchestrator';

/** Props for the EnhancedAgentMode component */
export interface EnhancedAgentModeProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Callback when the modal is closed */
  readonly onClose: () => void;
  /** Callback when task execution completes */
  readonly onComplete: (result: OrchestratorResponse) => void;
  /** The agent orchestrator instance */
  readonly orchestrator: AgentOrchestrator;
  /** The performance optimizer instance */
  readonly performanceOptimizer: AgentPerformanceOptimizer;
  /** Optional workspace context */
  readonly workspaceContext?: WorkspaceContextInfo | undefined;
}

/** Workspace context information for agent tasks */
export interface WorkspaceContextInfo {
  /** The root workspace folder path */
  readonly workspaceFolder: string;
  /** Currently active file path */
  readonly currentFile?: string | undefined;
  /** List of currently open file paths */
  readonly openFiles?: readonly string[] | undefined;
}

/** A single log entry in the execution log */
export interface LogEntry {
  /** Unique identifier for the log entry */
  readonly id: string;
  /** Type/category of the log entry */
  readonly type: LogEntryType;
  /** Timestamp when the log was created */
  readonly timestamp: Date;
  /** Log message content */
  readonly content: string;
  /** Name of the agent that generated this log (if applicable) */
  readonly agentName?: string | undefined;
  /** Performance metrics associated with this log (if applicable) */
  readonly metrics?: LogMetrics | undefined;
}

/** Log entry classification types */
export type LogEntryType = 'info' | 'agent' | 'coordination' | 'success' | 'error' | 'performance';

/** Performance metrics for a log entry */
export interface LogMetrics {
  /** Confidence score (0-1) */
  readonly confidence?: number | undefined;
  /** Processing time in milliseconds */
  readonly processingTime?: number | undefined;
  /** Number of suggestions generated */
  readonly suggestions?: number | undefined;
}

/** Task execution status */
export type TaskStatus = 'idle' | 'analyzing' | 'coordinating' | 'executing' | 'completed' | 'error';

/** Agent information for display */
export interface AgentInfo {
  /** Agent display name */
  readonly name: string;
  /** Agent role/specialty description */
  readonly role: string;
}

/** Map of agent names to their performance profiles */
export type AgentProfileMap = ReadonlyMap<string, PerformanceProfile>;

/** Performance report structure */
export interface PerformanceReport {
  readonly avgResponseTime: number;
  readonly cacheEfficiency: number;
  readonly activeAlerts: number;
  readonly memoryUsage: number;
}

/** Options for the useAgentTask hook */
export interface UseAgentTaskOptions {
  /** The agent orchestrator instance for multi-agent coordination */
  readonly orchestrator: AgentOrchestrator;
  /** Performance optimizer for agent profiling and metrics */
  readonly performanceOptimizer: {
    readonly getAgentProfile: (name: string) => PerformanceProfile | undefined;
    readonly getPerformanceReport: () => PerformanceReport;
  };
  /** Optional workspace context information */
  readonly workspaceContext?: WorkspaceContextInfo | undefined;
  /** Callback when task execution completes */
  readonly onComplete: (result: OrchestratorResponse) => void;
}

/** Return type for useAgentTask hook */
export interface UseAgentTaskReturn {
  // State
  readonly task: string;
  readonly setTask: (task: string) => void;
  readonly status: TaskStatus;
  readonly logs: readonly LogEntry[];
  readonly activeAgents: readonly string[];
  readonly agentProfiles: ReadonlyMap<string, PerformanceProfile>;
  readonly expandedSections: ReadonlySet<string>;
  readonly currentProgress: string;
  readonly logEndRef: RefObject<HTMLDivElement | null>;
  // Error recovery state
  readonly lastError: Error | null;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly canRetry: boolean;
  // Actions
  readonly executeTask: () => Promise<void>;
  readonly retryTask: () => Promise<void>;
  readonly handleStop: () => void;
  readonly resetTask: () => void;
  readonly clearError: () => void;
  readonly toggleSection: (section: string) => void;
  readonly formatTimestamp: (date: Date) => string;
  // Data
  readonly availableAgents: readonly AgentInfo[];
  readonly performanceReport: PerformanceReport;
}
