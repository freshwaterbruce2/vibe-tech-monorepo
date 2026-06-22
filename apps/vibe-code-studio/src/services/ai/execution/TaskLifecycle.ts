/**
 * Task Lifecycle Module
 *
 * Handles task execution, persistence, resumption, and completion.
 * Implements 2025 best practices for agentic AI workflows.
 */
import { logger } from '../../../services/Logger';
import type { TaskPersistence } from '../TaskPersistence';

import { executeStepWithFallbacks } from './StepExecutor';
import type {
    ActionContext,
    AgentStep,
    AgentTask,
    ExecutionCallbacks,
    StepExecutionContext,
    StepResult,
} from './types';
import { buildApprovalRequest, storeStepResult } from './utils';

/**
 * Builds the comprehensive-synthesis prompt from per-file analyses
 */
function buildSynthesisPrompt(analyzedCount: number, fileAnalyses: string): string {
    return `You are reviewing a codebase. You've analyzed ${analyzedCount} files individually. Now provide a COMPREHENSIVE SYNTHESIS of your findings.

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
}

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

        logger.debug(`[TaskLifecycle] Resuming task: ${persistedTask.originalTask.title} from step ${persistedTask.currentStepIndex + 1}`);

        // Update task context
        context.taskState.task = persistedTask.originalTask;
        context.taskState.userRequest = persistedTask.metadata.userRequest;
        context.taskState.workspaceRoot = persistedTask.metadata.workspaceRoot;

        // Resume from the next step
        const resumedTask = { ...persistedTask.originalTask };
        resumedTask.status = 'in_progress';

        return await this.executeTaskFromStep(
            resumedTask,
            persistedTask.currentStepIndex + 1,
            context,
            callbacks
        );
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
        callbacks?: ExecutionCallbacks
    ): Promise<AgentTask> {
        const startTime = Date.now();
        task.status = 'in_progress';
        task.startedAt = new Date();

        // Reset AI layers for new task execution
        if (startStepIndex === 0) {
            this.resetAiLayersForTask(context);
        }

        try {
            // Sequential execution with context preservation
            for (let i = startStepIndex; i < task.steps.length; i++) {
                if (this.isPaused) {
                    task.status = 'paused';
                    await this.savePauseProgress(task, i, context);
                    break;
                }

                const step = task.steps[i];
                if (!step) { continue; }

                // Check if approval is required (human-in-the-loop pattern)
                if (step.requiresApproval && !step.approved) {
                    const approved = await this.resolveStepApproval(task, step, callbacks);
                    if (!approved) {
                        task.status = 'cancelled';
                        return task;
                    }
                }

                const stepOutcome = await this.runTaskStep(task, step, i, context, callbacks);
                if (stepOutcome === 'failed') {
                    return task;
                }
            }

            // Task completed successfully
            if (!this.isPaused) {
                await this.finalizeTaskCompletion(task, context, startTime, callbacks);
            }

            return task;
        } catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : 'Unknown error';

            // Attempt rollback on catastrophic failure
            await this.rollbackTask(task, context);

            if (callbacks?.onTaskError) {
                callbacks.onTaskError(task, error as Error);
            }

            return task;
        }
    }

    /**
     * Persists current task progress when execution is paused
     */
    private async savePauseProgress(
        task: AgentTask,
        stepIndex: number,
        context: StepExecutionContext
    ): Promise<void> {
        if (context.taskState.userRequest && context.taskState.workspaceRoot) {
            await this.taskPersistence.saveTaskState(
                task,
                stepIndex,
                context.taskState.userRequest,
                context.taskState.workspaceRoot
            );
        }
    }

    /**
     * Resets metacognitive, ReAct, and memory layers for a fresh task run
     */
    private resetAiLayersForTask(context: StepExecutionContext): void {
        context.metacognitiveLayer.resetForNewTask();
        context.reactExecutor.resetAllHistory();
        logger.debug('[TaskLifecycle] 🧠 Metacognitive monitoring active');
        logger.debug('[TaskLifecycle] 🔄 ReAct pattern enabled:', context.enableReAct);
        logger.debug('[TaskLifecycle] 💾 Strategy memory enabled:', context.enableMemory);

        // Log memory stats
        if (context.enableMemory) {
            const stats = context.strategyMemory.getStats();
            logger.debug(
                `[TaskLifecycle] 📊 Memory has ${stats.totalPatterns} pattern(s), ` +
                    `${stats.averageSuccessRate.toFixed(1)}% avg success rate`
            );
        }
    }

    /**
     * Executes one task step (post-approval): run, persist, progress, failure rollback.
     * Returns 'failed' when the task should stop, otherwise 'ok'.
     */
    private async runTaskStep(
        task: AgentTask,
        step: AgentStep,
        stepIndex: number,
        context: StepExecutionContext,
        callbacks?: ExecutionCallbacks
    ): Promise<'ok' | 'failed'> {
        // Execute step with fallback support (includes retry logic)
        const result = await executeStepWithFallbacks(step, context, callbacks);

        // Store result for potential rollback
        storeStepResult(this.executionHistory, task.id, result);

        // Save progress after each step completion
        if (
            result.success &&
            context.taskState.userRequest &&
            context.taskState.workspaceRoot
        ) {
            await this.taskPersistence.saveTaskState(
                task,
                stepIndex,
                context.taskState.userRequest,
                context.taskState.workspaceRoot
            );
        }

        // Update progress
        if (callbacks?.onTaskProgress) {
            callbacks.onTaskProgress(stepIndex + 1, task.steps.length);
        }

        // If step failed and no retries left, rollback and fail task
        if (!result.success && step.retryCount >= step.maxRetries) {
            task.error = `Step ${step.order} failed: ${result.message}`;
            task.status = 'failed';

            // Attempt rollback
            await this.rollbackTask(task, context);

            if (callbacks?.onTaskError) {
                callbacks.onTaskError(task, new Error(task.error));
            }

            return 'failed';
        }

        return 'ok';
    }

    /**
     * Resolves human-in-the-loop approval for a step.
     * Returns true to proceed, false if the step was rejected.
     */
    private async resolveStepApproval(
        task: AgentTask,
        step: AgentStep,
        callbacks?: ExecutionCallbacks
    ): Promise<boolean> {
        step.status = 'awaiting_approval';

        if (callbacks?.onStepApprovalRequired) {
            const approvalRequest = buildApprovalRequest(task, step);
            const approved = await callbacks.onStepApprovalRequired(step, approvalRequest);

            if (!approved) {
                step.status = 'rejected';
                return false;
            }

            step.approved = true;
            step.status = 'approved';
        } else {
            // No callback provided - auto-approve for testing
            step.approved = true;
            step.status = 'approved';
        }
        return true;
    }

    /**
     * Finalizes a successfully completed task: synthesis, status, and callbacks.
     */
    private async finalizeTaskCompletion(
        task: AgentTask,
        context: StepExecutionContext,
        startTime: number,
        callbacks?: ExecutionCallbacks
    ): Promise<void> {
        // Auto-generate synthesis if multiple files were analyzed
        const synthesisStep = await this.generateAutoSynthesis(task, context);
        if (synthesisStep) {
            task.steps.push(synthesisStep);
            logger.debug('[TaskLifecycle] Added auto-synthesis step to task');

            if (callbacks?.onStepComplete) {
                callbacks.onStepComplete(synthesisStep, synthesisStep.result!);
            }
        }

        // Mark task as completed
        task.status = 'completed';
        task.completedAt = new Date();
        task.metadata = {
            ...task.metadata,
            executionTimeMs: Date.now() - startTime,
        };

        logger.debug('[TaskLifecycle] ✅ TASK COMPLETED - Status:', task.status);

        if (callbacks?.onTaskComplete) {
            callbacks.onTaskComplete(task);
            logger.debug('[TaskLifecycle] ✅ onTaskComplete callback fired');
        }
    }

    /**
     * Automatically generate synthesis when multiple files analyzed
     */
    private formatStepAnalysis(step: AgentStep): string {
        const data = step.result!.data as Record<string, unknown>;
        const analysis = typeof data?.['analysis'] === 'object' && data['analysis'] !== null
            ? data['analysis'] as Record<string, unknown>
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
    }

    private buildSynthesisStep(
        task: AgentTask,
        analyzedCount: number,
        content: string
    ): AgentStep {
        return {
            id: `synthesis-${Date.now()}`,
            taskId: task.id,
            order: task.steps.length + 1,
            title: '📊 Comprehensive Review Summary',
            description: `Synthesis of ${analyzedCount} file analyses`,
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
                    generatedCode: content,
                    isSynthesis: true,
                },
                message: `✅ Synthesized findings from ${analyzedCount} files`,
            },
        };
    }

    private async requestSynthesis(
        context: StepExecutionContext,
        synthesisPrompt: string,
        analyzedCount: number
    ) {
        return await context.aiService.sendContextualMessage({
            userQuery: synthesisPrompt,
            workspaceContext: {
                rootPath: context.taskState.workspaceRoot || '',
                totalFiles: analyzedCount,
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
    }

    private async generateAutoSynthesis(
        task: AgentTask,
        context: StepExecutionContext
    ): Promise<AgentStep | null> {
        try {
            logger.debug('[TaskLifecycle] 🔍 Checking if auto-synthesis needed...');

            // Collect all steps with AI-generated content
            const stepsWithAIContent = task.steps.filter(step => {
                const d = step.result?.data;
                return step.status === 'completed' &&
                    step.result?.success &&
                    typeof d === 'object' && d !== null && 'generatedCode' in d;
            });

            // Only synthesize if we have 2+ AI-analyzed files
            if (stepsWithAIContent.length < 2) {
                logger.debug(
                    `[TaskLifecycle] Skipping auto-synthesis ` +
                        `(only ${stepsWithAIContent.length} AI-analyzed steps)`
                );
                return null;
            }

            logger.debug(
                `[TaskLifecycle] ✨ Auto-synthesizing results from ` +
                    `${stepsWithAIContent.length} analyzed files...`
            );

            // Collect file paths and reviews
            const fileAnalyses = stepsWithAIContent
                .map(step => this.formatStepAnalysis(step))
                .join('\n\n---\n');

            // Generate synthesis prompt
            const synthesisPrompt = buildSynthesisPrompt(stepsWithAIContent.length, fileAnalyses);

            // Call AI for synthesis
            const response = await this.requestSynthesis(
                context,
                synthesisPrompt,
                stepsWithAIContent.length
            );

            const synthesisStep = this.buildSynthesisStep(
                task,
                stepsWithAIContent.length,
                response.content
            );

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
    async rollbackTask(task: AgentTask, context: ActionContext): Promise<{
        success: boolean;
        stepsRolledBack: string[];
        filesRestored: string[];
        error?: string;
    }> {
        const rolledBackSteps: string[] = [];
        const restoredFiles: string[] = [];

        try {
            const stepResults = this.executionHistory.get(task.id) ?? [];

            // Reverse the steps
            for (let i = stepResults.length - 1; i >= 0; i--) {
                const result = stepResults[i];
                if (!result) { continue; }

                // Attempt to reverse the action
                if (result.filesCreated) {
                    for (const file of result.filesCreated) {
                        try {
                            await context.fileSystemService.deleteFile(file);
                            restoredFiles.push(file);
                        } catch (error) {
                            logger.error(`Failed to delete created file during rollback: ${file}`, error);
                        }
                    }
                }

                if (result.filesModified) {
                    logger.warn(`Cannot restore modified files without backup: ${result.filesModified.join(', ')}`);
                }

                if (result.filesDeleted) {
                    logger.warn(`Cannot restore deleted files: ${result.filesDeleted.join(', ')}`);
                }

                rolledBackSteps.push(`Step ${i + 1}`);
            }

            // Clear execution history for this task
            this.executionHistory.delete(task.id);

            return {
                success: true,
                stepsRolledBack: rolledBackSteps,
                filesRestored: restoredFiles,
            };
        } catch (error) {
            return {
                success: false,
                stepsRolledBack: rolledBackSteps,
                filesRestored: restoredFiles,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
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
