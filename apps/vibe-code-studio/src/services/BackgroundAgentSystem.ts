/**
 * BackgroundAgentSystem - Non-blocking agent execution
 * Runs agents in background without blocking UI
 *
 * Integrates with ExecutionEngine to run real agent tasks
 */
import { logger } from '../services/Logger';
import type { AgentStep, AgentTask } from '../types';
import { EventEmitter } from '../utils/EventEmitter';

import type { ExecutionCallbacks, ExecutionEngine } from './ai/ExecutionEngine';
import type { TaskPlanner } from './ai/TaskPlanner';

export interface BackgroundTask {
  id: string;
  agentId: string;
  userRequest: string; // Original user request
  workspaceRoot: string; // Workspace root for the task
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: AgentTask; // Completed agent task
  error?: Error;
  startTime?: number;
  endTime?: number;
  progress?: number; // 0-100
  currentStep?: number; // Current step being executed
  totalSteps?: number; // Total steps in the plan
  stepDescription?: string; // Description of current step
}

export interface BackgroundTaskOptions {
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

/**
 * A user message queued for a pending/running task via injectMessage() —
 * the SHARED mid-run injection primitive (spec 09 Phase 2). Spec 10's Agent
 * Manager/Inbox and spec 16's deferred delivery consume this same channel;
 * do not build a second queue.
 */
export interface InjectedMessage {
  id: string;
  taskId: string;
  body: string;
  queuedAt: number;
}

export class BackgroundAgentSystem extends EventEmitter {
  private tasks: Map<string, BackgroundTask> = new Map();
  private queue: Array<{ task: BackgroundTask; options: BackgroundTaskOptions }> = [];
  private running: Set<string> = new Set();
  private maxConcurrent: number;
  private abortControllers: Map<string, AbortController> = new Map(); // For cancellation
  private pendingMessages: Map<string, InjectedMessage[]> = new Map(); // Per-task injection queue

  constructor(
    private executionEngine: ExecutionEngine,
    private taskPlanner: TaskPlanner,
    maxConcurrent: number = 3
  ) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Submit task for background execution
   */
  submit(
    agentId: string,
    userRequest: string,
    workspaceRoot: string,
    parameters: Record<string, unknown> = {},
    options: BackgroundTaskOptions = {}
  ): string {
    const task: BackgroundTask = {
      id: `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      userRequest,
      workspaceRoot,
      parameters,
      status: 'pending',
      progress: 0,
      currentStep: 0,
      totalSteps: 0,
    };

    this.tasks.set(task.id, task);
    this.queue.push({ task, options });

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return (
        priorityOrder[b.options.priority ?? 'normal'] -
        priorityOrder[a.options.priority ?? 'normal']
      );
    });

    this.processQueue();
    this.emit('submitted', task);

    return task.id;
  }

  /**
   * Get task status
   */
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get running tasks
   */
  getRunningTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running');
  }

  /**
   * Cancel task
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.status === 'pending') {
      task.status = 'cancelled';
      this.queue = this.queue.filter(q => q.task.id !== taskId);
      this.dropPendingMessages(task);
      this.emit('cancelled', task);
      return true;
    }

    if (task.status === 'running') {
      task.status = 'cancelled';
      this.running.delete(taskId);
      this.dropPendingMessages(task);
      this.emit('cancelled', task);
      this.processQueue();
      return true;
    }

    return false;
  }

  /**
   * Queue a message for a pending/running task (spec 09 Phase 2 primitive).
   * It is NOT applied immediately: the run loop drains the queue at the next
   * step boundary and folds messages into that step's context — an in-flight
   * step is never preempted. Emits 'messageQueued' on accept.
   * Returns null (no-op) when the task is missing/finished or body is blank.
   */
  injectMessage(taskId: string, body: string): InjectedMessage | null {
    const task = this.tasks.get(taskId);
    const trimmed = body.trim();
    if (!task || !trimmed) {
      return null;
    }
    if (task.status !== 'pending' && task.status !== 'running') {
      return null;
    }

    const message: InjectedMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      taskId,
      body: trimmed,
      queuedAt: Date.now(),
    };
    const queue = this.pendingMessages.get(taskId) ?? [];
    queue.push(message);
    this.pendingMessages.set(taskId, queue);
    this.emit('messageQueued', task, message);
    return message;
  }

  /**
   * Drain queued messages at a step boundary: fold them into the step's
   * action params (ReActExecutor includes params in its prompts, so the
   * agent sees them on this step) and emit 'messageInjected' per message.
   */
  private drainPendingMessages(task: BackgroundTask, step: AgentStep): void {
    const queue = this.pendingMessages.get(task.id);
    if (!queue || queue.length === 0) {
      return;
    }
    this.pendingMessages.delete(task.id);

    const existing = step.action.params.injectedUserMessages;
    const prior = Array.isArray(existing) ? existing : [];
    step.action.params.injectedUserMessages = [...prior, ...queue.map(m => m.body)];

    for (const message of queue) {
      this.emit('messageInjected', task, message);
    }
  }

  /**
   * Discard messages that can no longer reach the agent (task finished or
   * cancelled with messages still queued). Emits 'messageDropped' per
   * message so consumers can degrade to plain feedback.
   */
  private dropPendingMessages(task: BackgroundTask): void {
    const queue = this.pendingMessages.get(task.id);
    if (!queue) {
      return;
    }
    this.pendingMessages.delete(task.id);
    for (const message of queue) {
      this.emit('messageDropped', task, message);
    }
  }

  /**
   * Wait for task completion
   */
  async waitFor(taskId: string, timeout?: number): Promise<BackgroundTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      return task;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = timeout
        ? setTimeout(() => {
            reject(new Error('Task timeout'));
          }, timeout)
        : null;

      // completed/failed/cancelled all settle the wait identically
      const onSettled = (settledTask: BackgroundTask) => {
        if (settledTask.id !== taskId) {
          return;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.off('completed', onSettled);
        this.off('failed', onSettled);
        this.off('cancelled', onSettled);
        resolve(settledTask);
      };

      this.on('completed', onSettled);
      this.on('failed', onSettled);
      this.on('cancelled', onSettled);
    });
  }

  /**
   * Process queue
   */
  private processQueue(): void {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.executeTask(next.task, next.options);
      }
    }
  }

  /**
   * Execute task with real agent execution
   */
  private async executeTask(task: BackgroundTask, options: BackgroundTaskOptions): Promise<void> {
    task.status = 'running';
    task.startTime = Date.now();
    this.running.add(task.id);
    this.abortControllers.set(task.id, new AbortController()); // for cancellation
    this.emit('started', task);

    try {
      const planResponse = await this.planTask(task);
      if (this.tasks.get(task.id)?.status === 'cancelled') {
        throw new Error('Task cancelled during planning');
      }

      task.totalSteps = planResponse.task.steps.length;
      task.progress = 10;
      this.emit('progress', task);

      logger.debug(`[BackgroundAgent] Executing ${task.totalSteps} steps`);
      const executedTask = await this.executionEngine.executeTask(
        planResponse.task,
        this.buildExecutionCallbacks(task)
      );
      if (this.tasks.get(task.id)?.status === 'cancelled') {
        throw new Error('Task cancelled during execution');
      }

      task.status = 'completed';
      task.endTime = Date.now();
      task.progress = 100;
      task.result = executedTask;
      this.emit('completed', task);
    } catch (error) {
      this.handleExecutionFailure(task, options, error);
    } finally {
      this.running.delete(task.id);
      this.abortControllers.delete(task.id);
      // handleExecutionFailure may have requeued the task ('pending'); its
      // messages stay queued for the retry — otherwise they're undeliverable
      if (this.tasks.get(task.id)?.status !== 'pending') {
        this.dropPendingMessages(task);
      }
      this.processQueue();
    }
  }

  /** Step 1: plan the task via TaskPlanner, emitting progress */
  private async planTask(task: BackgroundTask): ReturnType<TaskPlanner['planTask']> {
    logger.debug(`[BackgroundAgent] Planning task: ${task.userRequest}`);
    task.stepDescription = 'Planning task...';
    task.progress = 5;
    this.emit('progress', task);

    return this.taskPlanner.planTask({
      userRequest: task.userRequest,
      context: {
        workspaceRoot: task.workspaceRoot,
        openFiles: (task.parameters.files as string[]) ?? [],
        ...((task.parameters.context as Record<string, unknown>) ?? {}),
      },
    });
  }

  /** Engine callbacks that mirror execution progress onto the BackgroundTask */
  private buildExecutionCallbacks(task: BackgroundTask): ExecutionCallbacks {
    return {
      onStepStart: step => {
        this.drainPendingMessages(task, step);
        task.currentStep = (task.currentStep ?? 0) + 1;
        task.stepDescription = step.description;
        this.emit('stepStart', task, step);
      },
      onStepComplete: (step, result) => {
        const progress = 10 + ((task.currentStep ?? 0) / (task.totalSteps ?? 1)) * 85;
        task.progress = Math.min(95, progress);
        this.emit('stepComplete', task, step, result);
        this.emit('progress', task);
      },
      onStepError: (step, error) => {
        logger.error(`[BackgroundAgent] Step error:`, error);
        this.emit('stepError', task, step, error);
      },
      onTaskProgress: (completedSteps, totalSteps) => {
        task.currentStep = completedSteps;
        task.totalSteps = totalSteps;
        task.progress = Math.min(95, 10 + (completedSteps / totalSteps) * 85);
        this.emit('progress', task);
      },
      onTaskComplete: _completedTask => {
        logger.debug(`[BackgroundAgent] Task completed successfully`);
      },
      onTaskError: (_failedTask, error) => {
        logger.error(`[BackgroundAgent] Task error:`, error);
      },
    };
  }

  /** Failure path: preserve 'cancelled', emit 'failed', optionally requeue */
  private handleExecutionFailure(
    task: BackgroundTask,
    options: BackgroundTaskOptions,
    error: unknown
  ): void {
    task.endTime = Date.now();
    if (this.tasks.get(task.id)?.status === 'cancelled') {
      // Don't mark as failed if it was cancelled
      this.emit('cancelled', task);
      return;
    }

    task.status = 'failed';
    task.error = error as Error;
    this.emit('failed', task);

    // Retry if configured
    if (
      options.retryOnFailure &&
      (!options.maxRetries || (task.currentStep ?? 0) < options.maxRetries)
    ) {
      logger.debug(`[BackgroundAgent] Retrying task (attempt ${(task.currentStep ?? 0) + 1})`);
      task.status = 'pending';
      task.currentStep = (task.currentStep ?? 0) + 1;
      this.queue.unshift({ task, options });
    }
  }

  /**
   * Clear completed tasks
   */
  clearCompleted(): void {
    Array.from(this.tasks.entries()).forEach(([id, task]) => {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        this.tasks.delete(id);
      }
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };
  }
}
