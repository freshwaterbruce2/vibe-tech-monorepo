/**
 * Durable agent task checkpoints and append-only lifecycle audit persistence.
 */
import { logger } from '../../services/Logger';
import type { AgentStep, AgentTask, AgentTaskMetadata } from '../../types';
import type { FileSystemService } from '../FileSystemService';

export interface PersistedTask {
  id: string;
  originalTask: AgentTask;
  currentStepIndex: number;
  completedSteps: AgentStep[];
  timestamp: Date;
  metadata: {
    userRequest: string;
    workspaceRoot: string;
    totalSteps: number;
    completedStepsCount: number;
  };
}

export type DurableTaskStatus =
  | 'planning'
  | 'executing'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentTaskEventType =
  | 'planning_started'
  | 'planning_completed'
  | 'execution_started'
  | 'execution_resumed'
  | 'execution_paused'
  | 'checkpoint_saved'
  | 'step_completed'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'approval_timed_out'
  | 'approval_aborted'
  | 'task_completed'
  | 'task_failed'
  | 'task_cancelled';

export type AgentTaskReasonCode =
  | 'completed'
  | 'planning_failed'
  | 'planning_timeout'
  | 'planning_cancelled'
  | 'execution_failed'
  | 'final_output_missing'
  | 'step_failed'
  | 'mutation_failed'
  | 'approval_rejected'
  | 'approval_timed_out'
  | 'approval_aborted'
  | 'user_cancelled'
  | 'task_replaced'
  | 'component_unmounted'
  | 'unknown';

export interface TaskPersistenceEvent {
  eventType: AgentTaskEventType;
  stepId?: string;
  proposalId?: string;
  proposalHash?: string;
  path?: string;
  changeType?: 'create' | 'modify' | 'delete' | 'create_directory';
  reasonCode?: AgentTaskReasonCode;
  details?: Record<string, unknown>;
}

export interface TaskOutcomeSummary {
  summary: string;
  changedFiles?: string[];
  validation?: Record<string, unknown>;
  modelMetadata?: AgentTaskMetadata;
  errorMessage?: string;
  reasonCode: AgentTaskReasonCode;
  currentStepIndex?: number;
  event?: TaskPersistenceEvent;
}

export interface LearningDeliveryMetadata {
  supported: boolean;
  pending: boolean;
  delivered: number;
  failed: number;
  error?: string;
}

export interface TerminalPersistenceResult {
  auditPersisted: boolean;
  duplicate: boolean;
  learningDelivery: LearningDeliveryMetadata;
}

export interface PersistedChatOutcome {
  taskId: string;
  outcome: 'completed' | 'failed' | 'cancelled';
  finalReport: string;
  createdAt: string;
}

interface NativeEventPayload {
  eventId: string;
  eventType: AgentTaskEventType;
  stepId?: string;
  proposalId?: string;
  proposalHash?: string;
  path?: string;
  changeType?: TaskPersistenceEvent['changeType'];
  reasonCode?: AgentTaskReasonCode;
  details?: string;
}

interface NativeTerminalResult {
  success?: boolean;
  duplicate?: boolean;
  learningDelivery?: { pending?: boolean };
}

interface NativeFlushResult {
  delivered?: number;
  pending?: number;
  failed?: number;
}

interface LocalAuditRecord {
  eventId: string;
  taskId: string;
  status: DurableTaskStatus;
  event: NativeEventPayload;
  recordedAt: string;
  taskData: string;
  outcome?: TaskOutcomeSummary;
}

export class TaskPersistence {
  private static readonly TASK_STORAGE_KEY = 'deepcode_agent_tasks';
  private static readonly TASK_AUDIT_KEY = 'deepcode_agent_task_audit';
  private static readonly MAX_PERSISTED_TASKS = 10;
  private static readonly MAX_LOCAL_AUDIT_RECORDS = 100;

  constructor(_legacyFileSystemService?: FileSystemService) {
    void _legacyFileSystemService;
  }

  /** Save a resumable checkpoint. Persistence failures are intentionally fatal. */
  async saveTaskState(
    task: AgentTask,
    currentStepIndex: number,
    userRequest: string,
    workspaceRoot: string
  ): Promise<void> {
    const persistedTask = this.buildPersistedTask(
      task,
      currentStepIndex,
      userRequest,
      workspaceRoot
    );
    await this.persistTransition(persistedTask, { eventType: 'checkpoint_saved' });
    logger.debug(
      `[TaskPersistence] Saved task state: ${task.title} ` +
        `(${persistedTask.metadata.completedStepsCount}/${persistedTask.metadata.totalSteps} steps completed)`
    );
  }

  async getPersistedTasks(): Promise<PersistedTask[]> {
    try {
      const tasks = this.hasNativeBridge()
        ? await this.loadFromDatabase()
        : await this.loadFromLocalStorage();
      return tasks.filter(task => this.isResumable(task));
    } catch (error) {
      logger.error('[TaskPersistence] Failed to load persisted tasks:', error);
      return [];
    }
  }

  async getPersistedTask(taskId: string): Promise<PersistedTask | null> {
    const tasks = await this.getPersistedTasks();
    return tasks.find(task => task.id === taskId) ?? null;
  }

  async removePersistedTask(taskId: string): Promise<void> {
    if (this.hasNativeBridge()) {
      // Native terminal commands archive checkpoints by setting terminal_at.
      return;
    }
    const tasks = (await this.loadFromLocalStorage()).filter(task => task.id !== taskId);
    await this.saveAllToLocalStorage(tasks);
  }

  async cleanupOldTasks(): Promise<void> {
    if (this.hasNativeBridge()) return;
    const tasks = (await this.loadFromLocalStorage())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, TaskPersistence.MAX_PERSISTED_TASKS);
    await this.saveAllToLocalStorage(tasks);
  }

  async recordTransition(
    task: AgentTask,
    userRequest: string,
    workspaceRoot: string,
    currentStepIndex = 0,
    event?: TaskPersistenceEvent
  ): Promise<void> {
    const persistedTask = this.buildPersistedTask(
      task,
      currentStepIndex,
      userRequest,
      workspaceRoot
    );
    await this.persistTransition(persistedTask, event ?? this.defaultTransitionEvent(task));
  }

  async recordTerminalOutcome(
    task: AgentTask,
    userRequest: string,
    workspaceRoot: string,
    outcome: TaskOutcomeSummary
  ): Promise<TerminalPersistenceResult> {
    if (!['completed', 'failed', 'cancelled'].includes(task.status)) {
      throw new Error(`Cannot persist non-terminal task outcome: ${task.status}`);
    }

    const currentStepIndex = outcome.currentStepIndex ?? task.steps.length;
    const persistedTask = this.buildPersistedTask(
      task,
      currentStepIndex,
      userRequest,
      workspaceRoot
    );
    const event = outcome.event ?? this.defaultTerminalEvent(task, outcome.reasonCode);
    if (!this.hasNativeBridge()) {
      const duplicate = await this.archiveLocalTerminal(persistedTask, event, outcome);
      return this.localTerminalResult(duplicate);
    }
    return this.recordNativeTerminal(task, persistedTask, event, outcome);
  }

  /** Load terminal chat output so the same visible report can be restored after reload. */
  async getChatOutcomes(taskId: string, limit = 1): Promise<PersistedChatOutcome[]> {
    const nativeLoader =
      typeof window !== 'undefined' ? window.electron?.db?.getAgentChatOutcomes : undefined;
    if (typeof nativeLoader === 'function') {
      const result = (await nativeLoader(taskId, limit)) as {
        success?: boolean;
        data?: PersistedChatOutcome[];
      };
      return result.success && Array.isArray(result.data) ? result.data : [];
    }

    const audit = this.parseAudit(await this.readStorage(TaskPersistence.TASK_AUDIT_KEY));
    return audit
      .filter(record => record.taskId === taskId && record.outcome)
      .slice(-Math.max(1, limit))
      .reverse()
      .flatMap(record => {
        const report = record.outcome?.summary.trim();
        return report
          ? [
              {
                taskId: record.taskId,
                outcome: record.status as PersistedChatOutcome['outcome'],
                finalReport: report,
                createdAt: record.recordedAt,
              },
            ]
          : [];
      });
  }

  private async recordNativeTerminal(
    task: AgentTask,
    persistedTask: PersistedTask,
    event: TaskPersistenceEvent,
    outcome: TaskOutcomeSummary
  ): Promise<TerminalPersistenceResult> {
    const db = window.electron!.db!;
    const nativeResult = (await db.recordAgentTerminal!(
      this.buildNativeTerminalInput(task, persistedTask, event, outcome)
    )) as NativeTerminalResult;
    return {
      auditPersisted: nativeResult.success !== false,
      duplicate: nativeResult.duplicate === true,
      learningDelivery: await this.flushLearningDelivery(
        nativeResult.learningDelivery?.pending ?? true
      ),
    };
  }

  private buildNativeTerminalInput(
    task: AgentTask,
    persistedTask: PersistedTask,
    event: TaskPersistenceEvent,
    outcome: TaskOutcomeSummary
  ): Record<string, unknown> {
    const now = new Date().toISOString();
    return {
      taskId: task.id,
      status: this.toDurableStatus(task.status),
      userRequest: persistedTask.metadata.userRequest,
      workspaceRoot: persistedTask.metadata.workspaceRoot,
      taskData: this.serializeJson(persistedTask, 'terminal task'),
      currentStepIndex: persistedTask.currentStepIndex,
      modelMetadata: this.serializeJson(
        outcome.modelMetadata ?? task.metadata ?? {},
        'model metadata'
      ),
      changedFiles: this.serializeJson(outcome.changedFiles ?? [], 'changed files'),
      validationSummary: this.serializeJson(outcome.validation ?? {}, 'validation summary'),
      errorMessage: outcome.errorMessage ?? task.error ?? '',
      summary: outcome.summary,
      reasonCode: outcome.reasonCode,
      createdAt: this.toIso(task.createdAt),
      updatedAt: now,
      terminalAt: this.toIso(task.completedAt ?? now),
      startedAt: this.toIso(task.startedAt ?? task.createdAt),
      completedAt: this.toIso(task.completedAt ?? now),
      executionTimeMs: task.metadata?.executionTimeMs,
      selectedModel: task.metadata?.model,
      tokensUsed: task.metadata?.tokensUsed,
      event: this.toNativeEvent(event),
    };
  }

  private async flushLearningDelivery(pending: boolean): Promise<LearningDeliveryMetadata> {
    let delivery: LearningDeliveryMetadata = {
      supported: true,
      pending,
      delivered: 0,
      failed: 0,
    };
    try {
      const flush = (await window.electron!.db!.flushAgentLearningOutbox!()) as NativeFlushResult;
      return {
        supported: true,
        pending: (flush.pending ?? 0) > 0,
        delivered: flush.delivered ?? 0,
        failed: flush.failed ?? 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      delivery = { ...delivery, pending: true, failed: 1, error: message };
      logger.warn('[TaskPersistence] Learning delivery remains queued:', message);
      return delivery;
    }
  }

  private localTerminalResult(duplicate: boolean): TerminalPersistenceResult {
    return {
      auditPersisted: true,
      duplicate,
      learningDelivery: { supported: false, pending: false, delivered: 0, failed: 0 },
    };
  }

  private async persistTransition(
    persistedTask: PersistedTask,
    event: TaskPersistenceEvent
  ): Promise<void> {
    if (!this.hasNativeBridge()) {
      await this.saveToLocalStorage(persistedTask);
      await this.appendLocalAudit(persistedTask, event);
      return;
    }
    const task = persistedTask.originalTask;
    const now = new Date().toISOString();
    await window.electron!.db!.recordAgentTransition!({
      taskId: task.id,
      status: this.toDurableStatus(task.status),
      userRequest: persistedTask.metadata.userRequest,
      workspaceRoot: persistedTask.metadata.workspaceRoot,
      taskData: this.serializeJson(persistedTask, 'task checkpoint'),
      currentStepIndex: persistedTask.currentStepIndex,
      modelMetadata: this.serializeJson(task.metadata ?? {}, 'model metadata'),
      createdAt: this.toIso(task.createdAt),
      updatedAt: now,
      event: this.toNativeEvent(event),
    });
  }

  private buildPersistedTask(
    task: AgentTask,
    currentStepIndex: number,
    userRequest: string,
    workspaceRoot: string
  ): PersistedTask {
    if (!Number.isInteger(currentStepIndex) || currentStepIndex < 0) {
      throw new Error(`Invalid task checkpoint index: ${currentStepIndex}`);
    }
    const completedSteps = task.steps.filter(step => step.status === 'completed');
    return {
      id: task.id,
      originalTask: { ...task, steps: task.steps.map(step => ({ ...step })) },
      currentStepIndex,
      completedSteps: completedSteps.map(step => ({ ...step })),
      timestamp: new Date(),
      metadata: {
        userRequest,
        workspaceRoot,
        totalSteps: task.steps.length,
        completedStepsCount: completedSteps.length,
      },
    };
  }

  private hasNativeBridge(): boolean {
    const db = typeof window !== 'undefined' ? window.electron?.db : undefined;
    return (
      typeof db?.recordAgentTransition === 'function' &&
      typeof db.recordAgentTerminal === 'function' &&
      typeof db.getResumableAgentTasks === 'function' &&
      typeof db.flushAgentLearningOutbox === 'function'
    );
  }

  private toDurableStatus(status: AgentTask['status']): DurableTaskStatus {
    return status === 'in_progress' || status === 'paused' ? 'executing' : status;
  }

  private defaultTransitionEvent(task: AgentTask): TaskPersistenceEvent {
    if (task.status === 'planning') return { eventType: 'planning_started' };
    if (task.status === 'awaiting_approval') return { eventType: 'approval_requested' };
    if (task.status === 'paused') return { eventType: 'execution_paused' };
    return { eventType: 'execution_started' };
  }

  private defaultTerminalEvent(
    task: AgentTask,
    reasonCode: AgentTaskReasonCode
  ): TaskPersistenceEvent {
    const eventType =
      task.status === 'completed'
        ? 'task_completed'
        : task.status === 'cancelled'
          ? 'task_cancelled'
          : 'task_failed';
    return { eventType, reasonCode };
  }

  private toNativeEvent(event: TaskPersistenceEvent): NativeEventPayload {
    const native: NativeEventPayload = {
      eventId: `event_${crypto.randomUUID()}`,
      eventType: event.eventType,
    };
    if (event.stepId) native.stepId = event.stepId;
    if (event.proposalId) native.proposalId = event.proposalId;
    if (event.proposalHash) native.proposalHash = event.proposalHash;
    if (event.path) native.path = event.path;
    if (event.changeType) native.changeType = event.changeType;
    if (event.reasonCode) native.reasonCode = event.reasonCode;
    if (event.details) native.details = this.serializeJson(event.details, 'event details');
    return native;
  }

  private async loadFromDatabase(): Promise<PersistedTask[]> {
    const result = (await window.electron!.db!.getResumableAgentTasks!(
      TaskPersistence.MAX_PERSISTED_TASKS
    )) as { success?: boolean; data?: Array<{ taskData?: string }> };
    if (!result.success || !Array.isArray(result.data)) return [];
    return result.data.flatMap(row => {
      if (!row.taskData) return [];
      const parsed = this.parsePersistedTaskJson(row.taskData);
      return parsed ? [parsed] : [];
    });
  }

  private async saveToLocalStorage(task: PersistedTask): Promise<void> {
    const existingTasks = await this.loadFromLocalStorage();
    const updatedTasks = existingTasks
      .filter(existing => existing.id !== task.id)
      .concat(task)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, TaskPersistence.MAX_PERSISTED_TASKS);
    await this.saveAllToLocalStorage(updatedTasks);
  }

  private async archiveLocalTerminal(
    task: PersistedTask,
    event: TaskPersistenceEvent,
    outcome: TaskOutcomeSummary
  ): Promise<boolean> {
    const active = (await this.loadFromLocalStorage()).filter(existing => existing.id !== task.id);
    await this.saveAllToLocalStorage(active);
    const audit = this.parseAudit(await this.readStorage(TaskPersistence.TASK_AUDIT_KEY));
    const previousTerminal = audit.find(
      record =>
        record.taskId === task.id && ['completed', 'failed', 'cancelled'].includes(record.status)
    );
    if (previousTerminal?.status !== undefined) {
      const status = this.toDurableStatus(task.originalTask.status);
      if (previousTerminal.status !== status) {
        throw new Error(`Task ${task.id} is already terminal as ${previousTerminal.status}`);
      }
      return true;
    }
    await this.appendLocalAudit(task, event, outcome);
    return false;
  }

  private async appendLocalAudit(
    task: PersistedTask,
    event: TaskPersistenceEvent,
    outcome?: TaskOutcomeSummary
  ): Promise<void> {
    const existing = this.parseAudit(await this.readStorage(TaskPersistence.TASK_AUDIT_KEY));
    const nativeEvent = this.toNativeEvent(event);
    const record: LocalAuditRecord = {
      eventId: nativeEvent.eventId,
      taskId: task.id,
      status: this.toDurableStatus(task.originalTask.status),
      event: nativeEvent,
      recordedAt: new Date().toISOString(),
      taskData: this.serializeJson(task, 'local audit task'),
    };
    if (outcome) record.outcome = outcome;
    const records = existing.concat(record).slice(-TaskPersistence.MAX_LOCAL_AUDIT_RECORDS);
    await this.writeStorage(TaskPersistence.TASK_AUDIT_KEY, this.serializeJson(records, 'audit'));
  }

  private async loadFromLocalStorage(): Promise<PersistedTask[]> {
    const stored = await this.readStorage(TaskPersistence.TASK_STORAGE_KEY);
    if (!stored) return [];
    let values: unknown;
    try {
      values = JSON.parse(stored);
    } catch {
      return [];
    }
    if (!Array.isArray(values)) return [];
    return values.flatMap(value => {
      const parsed = this.parsePersistedTask(value);
      return parsed ? [parsed] : [];
    });
  }

  private async saveAllToLocalStorage(tasks: PersistedTask[]): Promise<void> {
    await this.writeStorage(
      TaskPersistence.TASK_STORAGE_KEY,
      this.serializeJson(tasks, 'active task checkpoints')
    );
  }

  private parsePersistedTaskJson(value: string): PersistedTask | null {
    try {
      return this.parsePersistedTask(JSON.parse(value));
    } catch {
      return null;
    }
  }

  private parsePersistedTask(value: unknown): PersistedTask | null {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<PersistedTask>;
    const taskValue = candidate.originalTask;
    const metadata = candidate.metadata;
    if (!taskValue || typeof taskValue !== 'object' || !metadata || typeof metadata !== 'object') {
      return null;
    }
    if (typeof candidate.id !== 'string' || candidate.id !== taskValue.id) return null;
    if (!Array.isArray(taskValue.steps) || taskValue.steps.length === 0) return null;
    if (!Number.isInteger(candidate.currentStepIndex) || (candidate.currentStepIndex ?? -1) < 0) {
      return null;
    }
    if (typeof metadata.userRequest !== 'string' || typeof metadata.workspaceRoot !== 'string') {
      return null;
    }
    const createdAt = this.parseDate(taskValue.createdAt);
    const timestamp = this.parseDate(candidate.timestamp);
    if (!createdAt || !timestamp) return null;

    const steps = taskValue.steps.map(step => this.hydrateStep(step));
    if (steps.some(step => step === null)) return null;
    const task = {
      ...taskValue,
      createdAt,
      steps: steps as AgentStep[],
    } as AgentTask;
    const startedAt = this.parseDate(taskValue.startedAt);
    const completedAt = this.parseDate(taskValue.completedAt);
    if (startedAt) task.startedAt = startedAt;
    else delete task.startedAt;
    if (completedAt) task.completedAt = completedAt;
    else delete task.completedAt;

    const completedSteps = task.steps.filter(step => step.status === 'completed');
    return {
      id: candidate.id,
      originalTask: task,
      currentStepIndex: candidate.currentStepIndex!,
      completedSteps,
      timestamp,
      metadata: {
        userRequest: metadata.userRequest,
        workspaceRoot: metadata.workspaceRoot,
        totalSteps: task.steps.length,
        completedStepsCount: completedSteps.length,
      },
    };
  }

  private hydrateStep(value: unknown): AgentStep | null {
    if (!value || typeof value !== 'object') return null;
    const step = value as AgentStep;
    if (typeof step.id !== 'string' || typeof step.taskId !== 'string' || !step.action) return null;
    const hydrated = { ...step };
    const startedAt = this.parseDate(step.startedAt);
    const completedAt = this.parseDate(step.completedAt);
    if (startedAt) hydrated.startedAt = startedAt;
    else delete hydrated.startedAt;
    if (completedAt) hydrated.completedAt = completedAt;
    else delete hydrated.completedAt;
    return hydrated;
  }

  private isResumable(task: PersistedTask): boolean {
    return (
      ['in_progress', 'paused', 'awaiting_approval'].includes(task.originalTask.status) &&
      task.originalTask.steps.length > 0
    );
  }

  private parseAudit(stored: string | null): LocalAuditRecord[] {
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? (parsed as LocalAuditRecord[]) : [];
    } catch {
      return [];
    }
  }

  private parseDate(value: unknown): Date | undefined {
    if (value === undefined || value === null) return undefined;
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private toIso(value: Date | string): string {
    const date = this.parseDate(value);
    if (!date) throw new Error('Task persistence received an invalid timestamp');
    return date.toISOString();
  }

  private serializeJson(value: unknown, label: string): string {
    try {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) throw new Error('value is not JSON-serializable');
      return serialized;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to serialize ${label}: ${message}`);
    }
  }

  private async readStorage(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.electron?.store) {
      return (await window.electron.store.get(key)) ?? null;
    }
    return localStorage.getItem(key);
  }

  private async writeStorage(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.electron?.store) {
      await window.electron.store.set(key, value);
      return;
    }
    localStorage.setItem(key, value);
  }
}
