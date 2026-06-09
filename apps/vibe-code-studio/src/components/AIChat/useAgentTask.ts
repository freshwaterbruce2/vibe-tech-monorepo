/**
 * useAgentTask Hook
 * Manages agent task execution, approval flow, and message updates for AIChat.
 */
import { useCallback, useEffect, useRef } from 'react';

import { logger } from '../../services/Logger';
import type { AIMessage, AgentStep, AgentTask, ApprovalRequest } from '../../types';
import type { ExecutionEngine } from '../../services/ai/ExecutionEngine';
import type { TaskPlanner } from '../../services/ai/TaskPlanner';

import type { WorkspaceContext } from './types';

export interface UseAgentTaskOptions {
  taskPlanner?: TaskPlanner;
  executionEngine?: ExecutionEngine;
  workspaceContext?: WorkspaceContext;
  onAddMessage?: (message: AIMessage) => void;
  onUpdateMessage?: (messageId: string, updater: (msg: AIMessage) => AIMessage) => void;
  onFileChanged?: (filePath: string, action: 'created' | 'modified' | 'deleted') => void;
  onApprovalRequired?: (step: AgentStep, request: ApprovalRequest) => Promise<boolean>;
  onTaskComplete?: (task: AgentTask) => void;
  onTaskError?: (task: AgentTask, error: Error) => void;
}

export interface UseAgentTaskReturn {
  handleAgentTask: (userRequest: string) => Promise<void>;
  handleApprovalDecision: (messageId: string, stepId: string, approved: boolean) => void;
}

export function useAgentTask(options: UseAgentTaskOptions): UseAgentTaskReturn {
  const {
    taskPlanner,
    executionEngine,
    workspaceContext,
    onAddMessage,
    onUpdateMessage,
    onFileChanged,
    onApprovalRequired,
    onTaskComplete,
    onTaskError,
  } = options;

  const approvalResolversRef = useRef<Map<string, (approved: boolean) => void>>(new Map());

  // Reject any pending approvals when the hook unmounts
  useEffect(() => () => {
    approvalResolversRef.current.forEach((resolve) => resolve(false));
    approvalResolversRef.current.clear();
  }, []);

  const updateAgentMessage = useCallback(
    (messageId: string, updater: (message: AIMessage) => AIMessage) => {
      onUpdateMessage?.(messageId, updater);
    },
    [onUpdateMessage],
  );

  const getAgentPreflightError = useCallback((): string | null => {
    if (!workspaceContext?.workspaceRoot) {
      return 'Open a workspace folder before starting agent mode so the agent has a project root to work from.';
    }
    if (!taskPlanner || typeof taskPlanner.planTask !== 'function') {
      return 'Agent planning is unavailable right now because the task planner service is not ready.';
    }
    if (!executionEngine || typeof executionEngine.executeTask !== 'function') {
      return 'Agent execution is unavailable right now because the execution engine is not ready.';
    }
    if (typeof executionEngine.setTaskContext !== 'function') {
      return 'Agent execution context could not be initialized. Please reload the app and try again.';
    }
    return null;
  }, [executionEngine, taskPlanner, workspaceContext]);

  const handleApprovalDecision = useCallback(
    (messageId: string, stepId: string, approved: boolean) => {
      const resolver = approvalResolversRef.current.get(stepId);
      if (!resolver) {
        return;
      }
      approvalResolversRef.current.delete(stepId);
      updateAgentMessage(messageId, (message) => {
        if (!message.agentTask) {
          return message;
        }
        return {
          ...message,
          agentTask: {
            ...message.agentTask,
            pendingApproval: undefined,
            phase: approved ? 'executing' : 'failed',
            statusMessage: approved
              ? 'Approval granted. Resuming task.'
              : 'Approval rejected. Task execution stopped.',
            lastError: approved ? undefined : 'User rejected approval request.',
          },
        };
      });
      resolver(approved);
    },
    [updateAgentMessage],
  );

  const handleAgentTask = useCallback(
    async (userRequest: string) => {
      const agentMessageId = `${Date.now()}-agent`;
      const preflightError = getAgentPreflightError();

      if (preflightError) {
        logger.error('Agent mode preflight failed:', preflightError);
        onAddMessage?.({
          id: agentMessageId,
          role: 'assistant',
          content: `**Agent Mode Needs Attention**\n\n${preflightError}`,
          timestamp: new Date(),
          agentTask: {
            task: {
              id: `${agentMessageId}-preflight`,
              title: 'Agent setup issue',
              description: preflightError,
              userRequest,
              steps: [],
              status: 'failed',
              createdAt: new Date(),
              error: preflightError,
            },
            phase: 'failed',
            statusMessage: preflightError,
            lastError: preflightError,
          },
        });
        return;
      }

      const planningTask: AgentTask = {
        id: `${agentMessageId}-planning`,
        title: 'Planning task',
        description: userRequest,
        userRequest,
        steps: [],
        status: 'planning',
        createdAt: new Date(),
      };

      onAddMessage?.({
        id: agentMessageId,
        role: 'assistant',
        content: `**Agent Request**\n\n${userRequest}`,
        timestamp: new Date(),
        agentTask: {
          task: planningTask,
          phase: 'planning',
          statusMessage: 'Planning the task and validating workspace prerequisites.',
        },
      });

      try {
        const safeWorkspaceContext = workspaceContext!;
        executionEngine!.setTaskContext(userRequest, safeWorkspaceContext.workspaceRoot);
        const planResponse = await taskPlanner!.planTask({
          userRequest,
          context: safeWorkspaceContext,
          options: { maxSteps: 10, requireApprovalForAll: false, allowDestructiveActions: true },
        });

        updateAgentMessage(agentMessageId, (message) => ({
          ...message,
          content: `**Agent Task**: ${planResponse.task.title}\n\n${planResponse.task.description}`,
          agentTask: {
            task: planResponse.task,
            phase: 'executing',
            statusMessage:
              planResponse.task.steps.length > 0
                ? `Plan ready. Starting ${planResponse.task.steps.length} steps.`
                : 'Plan ready. No executable steps were generated.',
            warnings: planResponse.warnings,
          },
        }));

        const callbacks = {
          onStepStart: (step: AgentStep) => {
            logger.debug('[AIChat] Step started:', step.title);
            updateAgentMessage(agentMessageId, (message) => {
              if (!message.agentTask) return message;
              const updatedSteps = message.agentTask.task.steps.map((s) =>
                s.id === step.id ? { ...s, ...step, status: 'in_progress' as const } : s,
              );
              return {
                ...message,
                agentTask: {
                  ...message.agentTask,
                  task: { ...message.agentTask.task, steps: updatedSteps },
                  currentStep: step,
                  phase: 'executing',
                  pendingApproval: undefined,
                  statusMessage: `Executing step ${step.order + 1} of ${message.agentTask.task.steps.length}: ${step.title}`,
                  lastError: undefined,
                },
              };
            });
          },
          onStepComplete: (step: AgentStep) => {
            logger.debug('[AIChat] Step completed:', step.title);
            updateAgentMessage(agentMessageId, (message) => {
              if (!message.agentTask) return message;
              const updatedSteps = message.agentTask.task.steps.map((s) =>
                s.id === step.id ? { ...s, ...step, status: 'completed' as const } : s,
              );
              return {
                ...message,
                agentTask: {
                  ...message.agentTask,
                  task: { ...message.agentTask.task, steps: updatedSteps },
                  currentStep: step,
                  pendingApproval: undefined,
                  phase: 'executing',
                  statusMessage: `Completed step ${step.order + 1} of ${message.agentTask.task.steps.length}: ${step.title}`,
                },
              };
            });
          },
          onStepError: (step: AgentStep, error: Error) => {
            logger.error('[AIChat] Step failed:', step.title, error);
            updateAgentMessage(agentMessageId, (message) => {
              if (!message.agentTask) return message;
              const updatedSteps = message.agentTask.task.steps.map((s) =>
                s.id === step.id
                  ? { ...s, ...step, status: 'failed' as const, error: error.message }
                  : s,
              );
              return {
                ...message,
                agentTask: {
                  ...message.agentTask,
                  task: { ...message.agentTask.task, steps: updatedSteps },
                  currentStep: step,
                  phase: 'executing',
                  statusMessage: `Step failed: ${step.title}`,
                  lastError: error.message,
                },
              };
            });
          },
          onFileChanged: (filePath: string, action: 'created' | 'modified' | 'deleted') => {
            onFileChanged?.(filePath, action);
          },
          onStepApprovalRequired: async (step: AgentStep, request: ApprovalRequest) => {
            updateAgentMessage(agentMessageId, (message) => ({
              ...message,
              agentTask: message.agentTask
                ? {
                    ...message.agentTask,
                    currentStep: step,
                    pendingApproval: request,
                    phase: 'awaiting_approval',
                    statusMessage: `Waiting for approval on "${step.title}".`,
                  }
                : message.agentTask,
            }));

            if (onApprovalRequired) {
              const approved = await onApprovalRequired(step, request);
              updateAgentMessage(agentMessageId, (message) => ({
                ...message,
                agentTask: message.agentTask
                  ? {
                      ...message.agentTask,
                      pendingApproval: undefined,
                      phase: approved ? 'executing' : 'failed',
                      statusMessage: approved
                        ? `Approval granted for "${step.title}".`
                        : `Approval rejected for "${step.title}".`,
                      lastError: approved ? undefined : 'User rejected approval request.',
                    }
                  : message.agentTask,
              }));
              return approved;
            }

            return new Promise<boolean>((resolve) => {
              approvalResolversRef.current.set(step.id, resolve);
            });
          },
          onTaskComplete: (task: AgentTask) => {
            const synthesisStep = task.steps.find((s) => (s.result?.data as any)?.isSynthesis);
            const synthesisContent = (synthesisStep?.result?.data as any)?.generatedCode
              ? `\n\n${(synthesisStep?.result?.data as any)?.generatedCode}`
              : '';
            updateAgentMessage(agentMessageId, (message) => ({
              ...message,
              content: `**Agent Task**: ${task.title}\n\n${task.description}${synthesisContent}`,
              agentTask: message.agentTask
                ? {
                    ...message.agentTask,
                    task,
                    currentStep: undefined,
                    pendingApproval: undefined,
                    phase: 'completed',
                    statusMessage: 'Task completed successfully.',
                    lastError: undefined,
                  }
                : message.agentTask,
            }));
            onTaskComplete?.(task);
          },
          onTaskError: (task: AgentTask, error: Error) => {
            updateAgentMessage(agentMessageId, (message) => ({
              ...message,
              content: `**Agent Task Failed**: ${task.title}\n\n${task.description}`,
              agentTask: message.agentTask
                ? {
                    ...message.agentTask,
                    task,
                    pendingApproval: undefined,
                    phase: 'failed',
                    statusMessage: `Task failed: ${error.message}`,
                    lastError: error.message,
                  }
                : message.agentTask,
            }));
            onTaskError?.(task, error);
          },
        };

        await executionEngine!.executeTask(planResponse.task, callbacks);
      } catch (error) {
        logger.error('Agent task failed:', error);
        const errMessage = error instanceof Error ? error.message : String(error);
        updateAgentMessage(agentMessageId, (existingMessage) => ({
          ...existingMessage,
          content: `**Agent Task Failed**\n\n${errMessage}`,
          agentTask: existingMessage.agentTask
            ? {
                ...existingMessage.agentTask,
                phase: 'failed',
                statusMessage: `Task failed before execution could complete: ${errMessage}`,
                lastError: errMessage,
              }
            : existingMessage.agentTask,
        }));
      }
    },
    [
      taskPlanner,
      executionEngine,
      workspaceContext,
      onAddMessage,
      getAgentPreflightError,
      updateAgentMessage,
      onFileChanged,
      onApprovalRequired,
      onTaskComplete,
      onTaskError,
    ],
  );

  return { handleAgentTask, handleApprovalDecision };
}
