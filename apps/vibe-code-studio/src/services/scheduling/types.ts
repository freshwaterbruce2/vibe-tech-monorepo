/**
 * Agent scheduling types — spec 16 (Agent Scheduling).
 *
 * ScheduleDefinition mirrors BackgroundTask field naming (agentId, userRequest,
 * workspaceRoot, parameters) deliberately: firing a schedule is a near-literal
 * passthrough to BackgroundAgentSystem.submit(...).
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */

/** When and how often a schedule fires. Times are local wall-clock. */
export type ScheduleCadence =
  | { type: 'once'; runAt: string } // ISO timestamp
  | { type: 'interval'; everyMinutes: number }
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; dayOfWeek: number; hour: number; minute: number }; // 0 = Sunday

/** What to do with a trigger that passed while the app was closed. */
export type MissedRunPolicy = 'run-on-launch' | 'skip';

export type ScheduleStatus = 'active' | 'paused' | 'completed';

export type ScheduleRunStatus = 'running' | 'completed' | 'failed' | 'skipped';

export interface ScheduleRunRecord {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: ScheduleRunStatus;
  error?: string;
  /** BackgroundAgentSystem task id, when a task was actually submitted */
  taskId?: string;
  durationMs?: number;
}

export interface ScheduleSubmitOptions {
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface ScheduleDefinition {
  id: string;
  agentId: string;
  userRequest: string; // passed verbatim to BackgroundAgentSystem.submit
  workspaceRoot: string;
  parameters: Record<string, unknown>;
  options: ScheduleSubmitOptions;
  cadence: ScheduleCadence;
  status: ScheduleStatus;
  missedRunPolicy: MissedRunPolicy;
  createdAt: string;
  lastRunAt?: string;
  /** Epoch ms of the next trigger; null when the schedule will never fire again */
  nextRunAtMs: number | null;
  /** Most recent runs, newest first, capped at MAX_RUN_HISTORY */
  runs: ScheduleRunRecord[];
}

/** User input for creating a schedule (before ids/timestamps are assigned). */
export interface ScheduleDraft {
  agentId: string;
  userRequest: string;
  workspaceRoot: string;
  parameters?: Record<string, unknown>;
  options?: ScheduleSubmitOptions;
  cadence: ScheduleCadence;
  missedRunPolicy?: MissedRunPolicy;
}

/**
 * Minimal structural view of BackgroundAgentSystem used by the runner —
 * lets tests substitute a fake without constructing the real system.
 */
export interface ScheduleTaskSubmitter {
  submit(
    agentId: string,
    userRequest: string,
    workspaceRoot: string,
    parameters?: Record<string, unknown>,
    options?: ScheduleSubmitOptions
  ): string;
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
}

export const MAX_RUN_HISTORY = 20;
