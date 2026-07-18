import type { AgentTask, TaskPlanRequest, TaskPlanResponse } from '../../types';
import type { ExecutionCallbacks, ExecutionEngine } from '../ai/ExecutionEngine';
import type { AgentTaskReasonCode, TaskPersistence } from '../ai/TaskPersistence';
import {
  AgentPlanningCancelledError,
  AgentPlanningError,
  AgentPlanningTimeoutError,
  type TaskPlanner,
} from '../ai/TaskPlanner';

export class AgentRuntime {
  constructor(
    private readonly planner: TaskPlanner,
    private readonly executor: ExecutionEngine,
    private readonly repository: TaskPersistence
  ) {}

  async planTask(request: TaskPlanRequest): Promise<TaskPlanResponse> {
    const planningStartedAt = Date.now();
    const taskId = `task_${crypto.randomUUID()}`;
    const planningTask = this.createPlanningTask(taskId, request.userRequest);
    await this.repository.recordTransition(
      planningTask,
      request.userRequest,
      request.context.workspaceRoot,
      0,
      { eventType: 'planning_started' }
    );

    try {
      const response = await this.planner.planTask(request);
      const task = this.adoptTaskId(response.task, taskId);
      await this.repository.recordTransition(
        task,
        request.userRequest,
        request.context.workspaceRoot,
        0,
        { eventType: 'planning_completed' }
      );
      return { ...response, task };
    } catch (error) {
      await this.recordPlanningFailure(planningTask, request, error, planningStartedAt);
      throw error;
    }
  }

  async executeTask(
    task: AgentTask,
    workspaceRoot: string,
    callbacks?: ExecutionCallbacks
  ): Promise<AgentTask> {
    this.executor.setTaskContext(task.userRequest, workspaceRoot);
    return this.executor.executeTask(task, callbacks);
  }

  private adoptTaskId(task: AgentTask, taskId: string): AgentTask {
    return {
      ...task,
      id: taskId,
      steps: task.steps.map((step, index) => ({
        ...step,
        id: `${taskId}_step_${index + 1}`,
        taskId,
        order: index + 1,
      })),
    };
  }

  private createPlanningTask(taskId: string, userRequest: string): AgentTask {
    return {
      id: taskId,
      title: 'Planning agent task',
      description: userRequest,
      userRequest,
      steps: [],
      status: 'planning',
      createdAt: new Date(),
    };
  }

  private async recordPlanningFailure(
    task: AgentTask,
    request: TaskPlanRequest,
    error: unknown,
    planningStartedAt: number
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const failure = this.describePlanningFailure(error);
    task.status = failure.status;
    task.error = message;
    task.completedAt = new Date();
    task.metadata = {
      ...(error instanceof AgentPlanningError ? error.metadata : undefined),
      executionTimeMs: Date.now() - planningStartedAt,
    };
    try {
      await this.repository.recordTerminalOutcome(
        task,
        request.userRequest,
        request.context.workspaceRoot,
        {
          summary: failure.summary,
          modelMetadata: task.metadata,
          errorMessage: message,
          reasonCode: failure.reasonCode,
          event: { eventType: failure.eventType, reasonCode: failure.reasonCode },
        }
      );
    } catch (persistenceError) {
      const persistenceMessage =
        persistenceError instanceof Error ? persistenceError.message : String(persistenceError);
      throw new Error(
        `${message} (planning audit persistence also failed: ${persistenceMessage})`,
        { cause: error }
      );
    }
  }

  private describePlanningFailure(error: unknown): {
    status: 'failed' | 'cancelled';
    summary: string;
    reasonCode: AgentTaskReasonCode;
    eventType: 'task_failed' | 'task_cancelled';
  } {
    if (error instanceof AgentPlanningCancelledError) {
      return {
        status: 'cancelled',
        summary: 'Planning was cancelled before execution.',
        reasonCode: 'planning_cancelled',
        eventType: 'task_cancelled',
      };
    }
    if (error instanceof AgentPlanningTimeoutError) {
      return {
        status: 'failed',
        summary: 'Planning timed out before execution.',
        reasonCode: 'planning_timeout',
        eventType: 'task_failed',
      };
    }
    return {
      status: 'failed',
      summary: 'Planning failed before execution.',
      reasonCode: 'planning_failed',
      eventType: 'task_failed',
    };
  }
}
