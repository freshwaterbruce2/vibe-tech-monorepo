/**
 * Task Lifecycle Module
 *
 * Handles task execution, persistence, resumption, and completion.
 * Implements 2025 best practices for agentic AI workflows.
 */
import { logger } from '../../../services/Logger';
import {
  isMutationStep,
  approveStagedMutation,
  prepareStepMutation,
  usesDeferredMutationApproval,
} from '../../agent-runtime/MutationService';
import type {
  AgentTaskReasonCode,
  TaskPersistence,
  TaskPersistenceEvent,
} from '../TaskPersistence';

import { executeStepWithFallbacks } from './StepExecutor';
import type {
  ActionContext,
  AgentStep,
  AgentTask,
  ApprovalRequest,
  ExecutionCallbacks,
  StepExecutionContext,
  StepResult,
} from './types';
import { buildApprovalRequest, storeStepResult } from './utils';

type ApprovalOutcome =
  | { kind: 'approved' }
  | { kind: 'rejected' }
  | { kind: 'timed_out' }
  | { kind: 'aborted'; message: string };

/**
 * Task lifecycle manager
 */
export class TaskLifecycleManager {
  private executionHistory: Map<string, StepResult[]> = new Map();
  private isPaused: boolean = false;

  constructor(private taskPersistence: TaskPersistence) {}

  /**
   * Executes a complete task with all its steps
   * Implements sequential orchestration pattern from 2025 best practices
   */
  async executeTask(
    task: AgentTask,
    context: StepExecutionContext,
    callbacks?: ExecutionCallbacks
  ): Promise<AgentTask> {
    return await this.executeTaskFromStep(task, 0, context, callbacks);
  }

  /**
   * Resumes a previously persisted task
   */
  async resumeTask(
    taskId: string,
    context: StepExecutionContext,
    callbacks?: ExecutionCallbacks
  ): Promise<AgentTask | null> {
    const persistedTask = await this.taskPersistence.getPersistedTask(taskId);
    if (!persistedTask) {
      logger.warn(`[TaskLifecycle] No persisted task found with ID: ${taskId}`);
      return null;
    }

    logger.debug(
      `[TaskLifecycle] Resuming task: ${persistedTask.originalTask.title} from step ${persistedTask.currentStepIndex + 1}`
    );

    // Update task context
    context.taskState.task = persistedTask.originalTask;
    context.taskState.userRequest = persistedTask.metadata.userRequest;
    context.taskState.workspaceRoot = persistedTask.metadata.workspaceRoot;

    // Resume the same step unless it was durably completed. Awaiting-approval
    // checkpoints must never skip an unapproved mutation.
    const resumedTask = {
      ...persistedTask.originalTask,
      steps: persistedTask.originalTask.steps.map(step => ({ ...step })),
    };
    resumedTask.status = 'in_progress';
    const checkpointIndex = persistedTask.currentStepIndex;
    const checkpointStep = resumedTask.steps[checkpointIndex];
    const resumeIndex =
      checkpointStep?.status === 'completed' ? checkpointIndex + 1 : checkpointIndex;
    if (checkpointStep && checkpointStep.status !== 'completed') {
      checkpointStep.status = 'pending';
      checkpointStep.approved = false;
    }

    return await this.executeTaskFromStep(resumedTask, resumeIndex, context, callbacks, true);
  }

  /**
   * Gets list of resumable tasks
   */
  async getResumableTasks(): Promise<
    Array<{ id: string; title: string; progress: string; timestamp: Date }>
  > {
    const persistedTasks = await this.taskPersistence.getPersistedTasks();
    return persistedTasks.map(task => ({
      id: task.id,
      title: task.originalTask.title,
      progress: `${task.metadata.completedStepsCount}/${task.metadata.totalSteps} steps completed`,
      timestamp: new Date(task.timestamp),
    }));
  }

  /**
   * Executes a task starting from a specific step (used for resumption)
   */
  private async executeTaskFromStep(
    task: AgentTask,
    startStepIndex: number,
    context: StepExecutionContext,
    callbacks?: ExecutionCallbacks,
    isResume = false
  ): Promise<AgentTask> {
    const startTime = task.startedAt?.getTime() ?? Date.now();
    task.status = 'in_progress';
    task.startedAt ??= new Date(startTime);
    await this.taskPersistence.recordTransition(
      task,
      context.taskState.userRequest,
      context.taskState.workspaceRoot,
      startStepIndex,
      { eventType: isResume ? 'execution_resumed' : 'execution_started' }
    );

    // Reset AI layers for new task execution
    if (!isResume) {
      context.metacognitiveLayer.resetForNewTask();
      context.reactExecutor.resetAllHistory();
      logger.debug('[TaskLifecycle] 🧠 Metacognitive monitoring active');
      logger.debug('[TaskLifecycle] 🔄 ReAct pattern enabled:', context.enableReAct);
      logger.debug('[TaskLifecycle] 💾 Strategy memory enabled:', context.enableMemory);

      // Log memory stats
      if (context.enableMemory) {
        const stats = context.strategyMemory.getStats();
        logger.debug(
          `[TaskLifecycle] 📊 Memory has ${stats.totalPatterns} pattern(s), ${stats.averageSuccessRate.toFixed(1)}% avg success rate`
        );
      }
    }

    try {
      // Sequential execution with context preservation
      for (let i = startStepIndex; i < task.steps.length; i++) {
        if (this.isPaused) {
          task.status = 'paused';
          if (context.taskState.userRequest && context.taskState.workspaceRoot) {
            await this.taskPersistence.recordTransition(
              task,
              context.taskState.userRequest,
              context.taskState.workspaceRoot,
              i,
              { eventType: 'execution_paused' }
            );
          }
          break;
        }

        const step = task.steps[i];
        if (!step) {
          continue;
        }
        let deferredApproval:
          | {
              outcome: ApprovalOutcome;
              request: ApprovalRequest;
            }
          | undefined;
        context.requestMutationApproval = async (approvalStep, approvalRequest) => {
          task.status = 'awaiting_approval';
          approvalStep.status = 'awaiting_approval';
          await this.taskPersistence.recordTransition(
            task,
            context.taskState.userRequest,
            context.taskState.workspaceRoot,
            i,
            this.approvalEvent('approval_requested', approvalStep, approvalRequest)
          );
          if (!callbacks?.onStepApprovalRequired) {
            deferredApproval = {
              outcome: {
                kind: 'aborted',
                message: `Approval UI is unavailable for step ${approvalStep.order}`,
              },
              request: approvalRequest,
            };
            task.status = 'cancelled';
            approvalStep.status = 'rejected';
            return false;
          }
          const outcome = await this.requestApproval(
            callbacks.onStepApprovalRequired,
            approvalStep,
            approvalRequest
          );
          deferredApproval = { outcome, request: approvalRequest };
          const approved = outcome.kind === 'approved';
          task.status = approved ? 'in_progress' : 'cancelled';
          approvalStep.status = approved ? 'approved' : 'rejected';
          if (approved) {
            await this.taskPersistence.recordTransition(
              task,
              context.taskState.userRequest,
              context.taskState.workspaceRoot,
              i,
              this.approvalEvent('approval_granted', approvalStep, approvalRequest)
            );
          }
          return approved;
        };

        // Check if approval is required (human-in-the-loop pattern)
        if (
          (step.requiresApproval || isMutationStep(step)) &&
          (!step.approved || isMutationStep(step)) &&
          !usesDeferredMutationApproval(step)
        ) {
          step.status = 'awaiting_approval';
          task.status = 'awaiting_approval';
          const approvalRequest = isMutationStep(step)
            ? await this.buildMutationApproval(task, step, context)
            : buildApprovalRequest(task, step);
          await this.taskPersistence.recordTransition(
            task,
            context.taskState.userRequest,
            context.taskState.workspaceRoot,
            i,
            this.approvalEvent('approval_requested', step, approvalRequest)
          );

          if (callbacks?.onStepApprovalRequired) {
            const outcome = await this.requestApproval(
              callbacks.onStepApprovalRequired,
              step,
              approvalRequest
            );

            if (outcome.kind !== 'approved') {
              const cancellation = this.describeApprovalCancellation(outcome);
              step.status = 'rejected';
              task.status = 'cancelled';
              await this.persistTerminal(
                task,
                context,
                cancellation.message,
                cancellation.reasonCode,
                this.approvalEvent(
                  cancellation.eventType,
                  step,
                  approvalRequest,
                  cancellation.reasonCode
                ),
                i
              );
              callbacks.onTaskCancelled?.(task, cancellation.message);
              return task;
            }

            step.approved = true;
            step.status = 'approved';
            if (approvalRequest.proposalId && approvalRequest.proposalHash) {
              approveStagedMutation(step, approvalRequest.proposalId, approvalRequest.proposalHash);
            }
            task.status = 'in_progress';
            await this.taskPersistence.recordTransition(
              task,
              context.taskState.userRequest,
              context.taskState.workspaceRoot,
              i,
              this.approvalEvent('approval_granted', step, approvalRequest)
            );
          } else {
            const outcome: ApprovalOutcome = {
              kind: 'aborted',
              message: `Approval UI is unavailable for step ${step.order}`,
            };
            const cancellation = this.describeApprovalCancellation(outcome);
            step.status = 'rejected';
            task.status = 'cancelled';
            await this.persistTerminal(
              task,
              context,
              cancellation.message,
              cancellation.reasonCode,
              this.approvalEvent(
                cancellation.eventType,
                step,
                approvalRequest,
                cancellation.reasonCode
              ),
              i
            );
            callbacks?.onTaskCancelled?.(task, cancellation.message);
            return task;
          }
        }

        // Execute step with fallback support (includes retry logic)
        let result = await executeStepWithFallbacks(step, context, callbacks);

        if (result.cancelled) {
          const cancellation = this.describeApprovalCancellation(
            deferredApproval?.outcome ?? { kind: 'rejected' }
          );
          step.status = 'rejected';
          task.status = 'cancelled';
          const reason = result.message ?? cancellation.message;
          await this.persistTerminal(
            task,
            context,
            reason,
            cancellation.reasonCode,
            deferredApproval
              ? this.approvalEvent(
                  cancellation.eventType,
                  step,
                  deferredApproval.request,
                  cancellation.reasonCode
                )
              : undefined,
            i
          );
          callbacks?.onTaskCancelled?.(task, reason);
          return task;
        }

        if (
          result.success &&
          this.requiresValidatedMutation(step) &&
          !this.hasValidatedMutation(result)
        ) {
          result = {
            success: false,
            message: `Step ${step.order} did not return validated mutation metadata`,
            data: result.data,
          };
          step.status = 'failed';
          step.result = result;
        }

        // Store result for potential rollback
        storeStepResult(this.executionHistory, task.id, result);

        // Save progress after each step completion
        if (result.success && context.taskState.userRequest && context.taskState.workspaceRoot) {
          await this.taskPersistence.recordTransition(
            task,
            context.taskState.userRequest,
            context.taskState.workspaceRoot,
            i,
            { eventType: 'step_completed', stepId: step.id }
          );
        }

        // Update progress
        if (callbacks?.onTaskProgress) {
          callbacks.onTaskProgress(i + 1, task.steps.length);
        }

        // The step executor returns only after its permitted retries have
        // finished. Mutations intentionally return on their first failure.
        if (!result.success) {
          task.error = `Step ${step.order} failed: ${result.message}`;
          task.status = 'failed';
          const reasonCode = this.requiresValidatedMutation(step)
            ? 'mutation_failed'
            : 'step_failed';
          await this.persistTerminal(task, context, task.error, reasonCode, undefined, i);
          callbacks?.onTaskError?.(task, new Error(task.error));

          return task;
        }
      }

      // Task completed successfully
      if (!this.isPaused) {
        // Structured plans already include a final generate_code synthesis step for
        // multi-file work. Do not wait on a redundant provider request before the
        // terminal audit can be persisted.
        if (this.hasCompletedPlannedSynthesis(task)) {
          logger.debug(
            '[TaskLifecycle] Skipping auto-synthesis; planned synthesis already completed'
          );
        } else {
          const synthesisStep = await this.generateAutoSynthesis(task, context);
          if (synthesisStep) {
            task.steps.push(synthesisStep);
            logger.debug('[TaskLifecycle] Added auto-synthesis step to task');

            if (callbacks?.onStepComplete) {
              callbacks.onStepComplete(synthesisStep, synthesisStep.result!);
            }
          }
        }

        const finalReport = this.resolveFinalReport(task);
        if (!finalReport) {
          task.status = 'failed';
          task.error = 'Completed execution produced no non-empty user-facing final report.';
          await this.persistTerminal(task, context, task.error, 'final_output_missing');
          callbacks?.onTaskError?.(task, new Error(task.error));
          return task;
        }

        task.finalReport = finalReport;
        task.status = 'completed';
        task.completedAt = new Date();
        task.metadata = {
          ...task.metadata,
          executionTimeMs: Date.now() - startTime,
        };

        logger.debug('[TaskLifecycle] ✅ TASK COMPLETED - Status:', task.status);

        await this.persistTerminal(task, context, finalReport, 'completed');
        callbacks?.onTaskComplete?.(task);
        logger.debug('[TaskLifecycle] ✅ onTaskComplete callback fired');
      }

      return task;
    } catch (error) {
      task.status = 'failed';
      const originalError = error instanceof Error ? error : new Error(String(error));
      task.error = originalError.message || 'Unknown error';

      try {
        await this.persistTerminal(task, context, task.error, 'execution_failed');
      } catch (persistenceError) {
        const persistenceMessage =
          persistenceError instanceof Error ? persistenceError.message : String(persistenceError);
        task.error = `${task.error} Lifecycle audit persistence also failed: ${persistenceMessage}`;
        logger.error('[TaskLifecycle] Terminal audit persistence failed:', persistenceError);
      }
      callbacks?.onTaskError?.(task, new Error(task.error));

      return task;
    }
  }

  private async requestApproval(
    callback: NonNullable<ExecutionCallbacks['onStepApprovalRequired']>,
    step: AgentStep,
    request: ApprovalRequest
  ): Promise<ApprovalOutcome> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const callbackResult = callback(step, request, controller.signal)
        .then<ApprovalOutcome>(approved => (approved ? { kind: 'approved' } : { kind: 'rejected' }))
        .catch(
          (error): ApprovalOutcome => ({
            kind: 'aborted',
            message: error instanceof Error ? error.message : String(error),
          })
        );
      return await Promise.race([
        callbackResult,
        new Promise<ApprovalOutcome>(resolve => {
          timer = setTimeout(() => {
            controller.abort();
            resolve({ kind: 'timed_out' });
          }, 120_000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async buildMutationApproval(
    task: AgentTask,
    step: AgentStep,
    context: StepExecutionContext
  ) {
    const { service, proposal } = await prepareStepMutation(step, context);
    return service.toApprovalRequest(task.id, step, proposal);
  }

  private async persistTerminal(
    task: AgentTask,
    context: StepExecutionContext,
    summary: string,
    reasonCode: AgentTaskReasonCode,
    event?: TaskPersistenceEvent,
    currentStepIndex?: number
  ): Promise<void> {
    const completedAt = task.completedAt ?? new Date();
    task.completedAt = completedAt;
    const startedAt = task.startedAt ?? task.createdAt;
    task.metadata = {
      ...task.metadata,
      executionTimeMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
    };
    const changedFiles = task.steps.flatMap(step => [
      ...(step.result?.filesCreated ?? []),
      ...(step.result?.filesModified ?? []),
      ...(step.result?.filesDeleted ?? []),
    ]);
    const mutations = task.steps.flatMap(step => {
      const data = step.result?.data;
      if (!data || typeof data !== 'object' || !('mutation' in data)) return [];
      return [(data as { mutation: unknown }).mutation];
    });
    const validations = task.steps.flatMap(step => {
      if (step.action.type !== 'run_tests' || !step.result?.data) return [];
      return [step.result.data];
    });
    await this.taskPersistence.recordTerminalOutcome(
      task,
      context.taskState.userRequest,
      context.taskState.workspaceRoot,
      {
        summary,
        changedFiles: [...new Set(changedFiles)],
        validation: { mutations, validations },
        modelMetadata: task.metadata,
        reasonCode,
        ...(task.error || task.status !== 'completed'
          ? { errorMessage: task.error ?? summary }
          : {}),
        ...(currentStepIndex === undefined ? {} : { currentStepIndex }),
        ...(event ? { event } : {}),
      }
    );
  }

  private approvalEvent(
    eventType: Extract<
      TaskPersistenceEvent['eventType'],
      | 'approval_requested'
      | 'approval_granted'
      | 'approval_rejected'
      | 'approval_timed_out'
      | 'approval_aborted'
    >,
    step: AgentStep,
    request: ApprovalRequest,
    reasonCode?: AgentTaskReasonCode
  ): TaskPersistenceEvent {
    return {
      eventType,
      stepId: step.id,
      details: { actionType: request.action.type },
      ...(request.proposalId ? { proposalId: request.proposalId } : {}),
      ...(request.proposalHash ? { proposalHash: request.proposalHash } : {}),
      ...(request.impact.filesAffected[0] ? { path: request.impact.filesAffected[0] } : {}),
      ...(request.changeType ? { changeType: request.changeType } : {}),
      ...(reasonCode ? { reasonCode } : {}),
    };
  }

  private describeApprovalCancellation(outcome: ApprovalOutcome): {
    message: string;
    reasonCode: AgentTaskReasonCode;
    eventType: 'approval_rejected' | 'approval_timed_out' | 'approval_aborted';
  } {
    if (outcome.kind === 'timed_out') {
      return {
        message: 'Approval timed out after 120 seconds; no workspace mutation was applied.',
        reasonCode: 'approval_timed_out',
        eventType: 'approval_timed_out',
      };
    }
    if (outcome.kind === 'aborted' || outcome.kind === 'approved') {
      const detail =
        outcome.kind === 'aborted'
          ? outcome.message
          : 'Execution cancelled after approval before the mutation was applied.';
      return {
        message: `Approval was cancelled; no workspace mutation was applied. ${detail}`,
        reasonCode: 'approval_aborted',
        eventType: 'approval_aborted',
      };
    }
    return {
      message: 'Approval was rejected; no workspace mutation was applied.',
      reasonCode: 'approval_rejected',
      eventType: 'approval_rejected',
    };
  }

  private requiresValidatedMutation(step: AgentStep): boolean {
    return isMutationStep(step) || usesDeferredMutationApproval(step);
  }

  private hasValidatedMutation(result: StepResult): boolean {
    if (!result.data || typeof result.data !== 'object' || !('mutation' in result.data)) {
      return false;
    }
    const mutation = (result.data as { mutation?: unknown }).mutation;
    if (!mutation || typeof mutation !== 'object') return false;
    const metadata = mutation as Record<string, unknown>;
    return (
      metadata['validated'] === true &&
      typeof metadata['proposalId'] === 'string' &&
      typeof metadata['proposalHash'] === 'string'
    );
  }

  private hasCompletedPlannedSynthesis(task: AgentTask): boolean {
    const finalStep = task.steps[task.steps.length - 1];
    return (
      finalStep?.action.type === 'generate_code' &&
      finalStep.status === 'completed' &&
      finalStep.result?.success === true &&
      this.stepGeneratedText(finalStep).length > 0
    );
  }

  private resolveFinalReport(task: AgentTask): string {
    const finalStep = task.steps[task.steps.length - 1];
    const synthesis =
      finalStep?.action.type === 'generate_code' ? this.stepGeneratedText(finalStep) : '';
    if (synthesis) return synthesis;
    const evidence = task.steps
      .filter(step => step.status === 'completed' && step.result?.success === true)
      .map(step => {
        const generated = this.stepGeneratedText(step);
        if (generated) return `${step.title}:\n${generated}`;
        const message = step.result?.message?.trim();
        return message ? `${step.title}: ${message}` : '';
      })
      .filter(Boolean);
    return evidence.length > 0 ? `Completed execution evidence:\n\n${evidence.join('\n\n')}` : '';
  }

  private stepGeneratedText(step: AgentStep): string {
    const data = step.result?.data;
    if (!data || typeof data !== 'object') return '';
    const generated = (data as Record<string, unknown>)['generatedCode'];
    return typeof generated === 'string' ? generated.trim() : '';
  }

  /**
   * Automatically generate synthesis when multiple files analyzed
   */
  private async generateAutoSynthesis(
    task: AgentTask,
    context: StepExecutionContext
  ): Promise<AgentStep | null> {
    try {
      logger.debug('[TaskLifecycle] 🔍 Checking if auto-synthesis needed...');

      // Collect all steps with AI-generated content
      const stepsWithAIContent = task.steps.filter(step => {
        const d = step.result?.data;
        return (
          step.status === 'completed' &&
          step.result?.success &&
          typeof d === 'object' &&
          d !== null &&
          'generatedCode' in d
        );
      });

      // Only synthesize if we have 2+ AI-analyzed files
      if (stepsWithAIContent.length < 2) {
        logger.debug(
          `[TaskLifecycle] Skipping auto-synthesis (only ${stepsWithAIContent.length} AI-analyzed steps)`
        );
        return null;
      }

      logger.debug(
        `[TaskLifecycle] ✨ Auto-synthesizing results from ${stepsWithAIContent.length} analyzed files...`
      );

      // Collect file paths and reviews
      const fileAnalyses = stepsWithAIContent
        .map(step => {
          const data = step.result!.data as Record<string, unknown>;
          const analysis =
            typeof data?.['analysis'] === 'object' && data['analysis'] !== null
              ? (data['analysis'] as Record<string, unknown>)
              : undefined;
          const filePath =
            (data?.['filePath'] as string | undefined) ??
            (analysis?.['filePath'] as string | undefined) ??
            'unknown';
          const review =
            (data?.['generatedCode'] as string | undefined) ??
            (analysis?.['aiReview'] as string | undefined) ??
            '';
          return `\n### ${filePath}\n${review}`;
        })
        .join('\n\n---\n');

      // Generate synthesis prompt
      const synthesisPrompt = `You are reviewing a codebase. You've analyzed ${stepsWithAIContent.length} files individually. Now provide a COMPREHENSIVE SYNTHESIS of your findings.

## Individual File Analyses:
${fileAnalyses}

## Your Task:
Synthesize the above analyses into a cohesive, actionable code review report. Include:

1. **Overall Assessment** - High-level code quality summary
2. **Common Patterns** - Repeated issues or good practices across files
3. **Priority Improvements** - Top 3-5 most important changes needed
4. **Architecture Insights** - How the files work together, design patterns observed
5. **Positive Highlights** - What's done well

Be detailed, specific, and actionable. Reference specific files when making points.`;

      // Call AI for synthesis
      const response = await context.aiService.sendContextualMessage({
        userQuery: synthesisPrompt,
        workspaceContext: {
          rootPath: context.taskState.workspaceRoot || '',
          totalFiles: stepsWithAIContent.length,
          languages: [],
          testFiles: 0,
          projectStructure: {},
          dependencies: {},
          exports: {},
          symbols: {},
          lastIndexed: new Date(),
          summary: 'Code review synthesis',
        },
        currentFile: undefined,
        relatedFiles: [],
        conversationHistory: [],
      });

      // Create virtual synthesis step
      const synthesisStep: AgentStep = {
        id: `synthesis-${Date.now()}`,
        taskId: task.id,
        order: task.steps.length + 1,
        title: '📊 Comprehensive Review Summary',
        description: `Synthesis of ${stepsWithAIContent.length} file analyses`,
        action: {
          type: 'generate_code',
          params: {
            description: 'Final synthesis',
          },
        },
        status: 'completed',
        requiresApproval: false,
        maxRetries: 0,
        retryCount: 0,
        result: {
          success: true,
          data: {
            generatedCode: response.content,
            isSynthesis: true,
          },
          message: `✅ Synthesized findings from ${stepsWithAIContent.length} files`,
        },
      };

      logger.debug('[TaskLifecycle] ✅ Auto-synthesis complete!');
      return synthesisStep;
    } catch (error) {
      logger.error('[TaskLifecycle] ❌ Auto-synthesis failed:', error);
      return null;
    }
  }

  /**
   * Rolls back a task by reversing completed steps
   */
  async rollbackTask(
    task: AgentTask,
    context: ActionContext
  ): Promise<{
    success: boolean;
    stepsRolledBack: string[];
    filesRestored: string[];
    error?: string;
  }> {
    void context;
    this.executionHistory.delete(task.id);
    return {
      success: false,
      stepsRolledBack: [],
      filesRestored: [],
      error:
        'Automatic rollback is disabled because rollback mutations require a new diff approval.',
    };
  }

  // Control methods
  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  clearHistory(taskId: string): void {
    this.executionHistory.delete(taskId);
  }
}
