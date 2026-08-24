/**
 * AIChat Component - Main AI chat interface with chat and agent modes
 */
import { Play, Send, Square, Trash2, X, Zap } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { logger } from '../../services/Logger';
import { recordMessageFeedback } from '../../services/ai/completionTracker';
import { handleScheduleChatCommand } from '../../services/scheduling/scheduleChatCommand';
import { useAIActions } from '../../stores/useAIStore';
import type { AIMessage, AgentStep, AgentTask, ApprovalRequest } from '../../types';

import {
  ApprovalResolverRegistry,
  matchesApproval,
  type ApprovalResolverIdentity,
  withApprovalIdentity,
} from './approvalResolvers';
import {
  getCancelledStatus,
  getCompletedStatus,
  getCompletedTaskContent,
  getStepOrdinal,
  snapshotTask,
  snapshotTerminalTask,
  updateTaskStep,
} from './agentTaskLifecycle';
import { MessageItem, TypingMessage } from './MessageItem';
import { MemoizedStepCard } from './StepCard';
import {
  AgentEmptyState,
  AgentStatusBadge,
  AgentStatusCard,
  AgentStatusHeader,
  AgentStatusText,
  AgentStepsList,
  AgentWarningList,
  CancelButton,
  ChatContainer,
  ChatHeader,
  CloseButton,
  InputContainer,
  InputWrapper,
  MessagesContainer,
  ModeButton,
  ModeDescription,
  ModeSwitcher,
  QuickActionButton,
  QuickActions,
  ResizeHandle,
  ResponseStatus,
  SendButton,
  TaskProgressBar,
  TaskProgressFill,
  TextInput,
} from './styled';
import type { AIChatProps, ChatMode, ModeInfo } from './types';
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from './types';

const MODE_DESCRIPTIONS: Record<ChatMode, ModeInfo> = {
  chat: {
    title: 'Chat Mode',
    description: 'Have conversations with AI, ask questions, get code explanations.',
  },
  agent: {
    title: 'Agent Mode',
    description: 'Let AI autonomously plan and execute complex multi-step tasks.',
  },
};

const MODE_QUICK_ACTIONS: Record<ChatMode, string[]> = {
  chat: [
    'Explain this code',
    'Generate function',
    'Add comments',
    'Fix bugs',
    'Optimize code',
    'Write tests',
  ],
  agent: [
    'Create a new feature',
    'Refactor this component',
    'Add error handling',
    'Generate test suite',
  ],
};

const AIChat = ({
  messages,
  onSendMessage,
  onClose,
  isAiResponding = false,
  responseState = 'idle',
  onCancelResponse,
  showReasoningProcess = false,
  currentModel: _currentModel = 'deepseek/deepseek-v4-pro',
  mode: externalMode,
  onModeChange,
  taskPlanner,
  executionEngine,
  agentRuntime,
  workspaceContext,
  onAddMessage,
  onUpdateMessage,
  onFileChanged,
  onTaskComplete,
  onTaskError,
  onTaskCancelled,
  onApprovalRequired,
  onMultiFileEditDetected: _onMultiFileEditDetected,
  onClearMessages,
}: AIChatProps) => {
  const [input, setInput] = useState('');
  const [pendingSendCount, setPendingSendCount] = useState(0);
  const { clearMessages } = useAIActions();
  const approvalResolversRef = useRef(new ApprovalResolverRegistry());
  const activeAgentRef = useRef<{
    controller: AbortController;
    messageId: string;
    phase: 'planning' | 'executing';
  } | null>(null);
  const isMountedRef = useRef(true);
  // The rendered conversation lives in useAIChat (via the messages prop);
  // clear BOTH it and the useAIStore copy so no layer keeps stale history.
  const handleClearChat = useCallback(() => {
    approvalResolversRef.current.settleAll();
    onClearMessages?.();
    clearMessages();
  }, [onClearMessages, clearMessages]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalMode, setInternalMode] = useState<ChatMode>('chat');
  const mode = externalMode ?? internalMode;
  const isTyping = pendingSendCount > 0;
  const isChatBusy = mode === 'chat' && (isAiResponding || isTyping);
  const inputDisabled = mode === 'agent' ? isTyping : responseState === 'cancelling';
  const sendDisabled =
    !input.trim() || (mode === 'agent' && isTyping) || responseState === 'cancelling';
  const showCancelButton =
    mode === 'agent' ? isTyping : isAiResponding && typeof onCancelResponse === 'function';

  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(width);
  const modeInfo = MODE_DESCRIPTIONS[mode];
  const quickActions = MODE_QUICK_ACTIONS[mode];
  const agentPlaceholder = workspaceContext?.workspaceRoot
    ? 'Describe a multi-step task for the agent...'
    : 'Open a folder to use agent mode effectively...';
  const hasAgentHistory = messages.some(message => !!message.agentTask);

  // Load width on mount
  useEffect(() => {
    const loadWidth = async () => {
      try {
        if (window.electron?.store) {
          const saved = await window.electron.store.get('aiChatWidth');
          if (saved) {
            setWidth(parseInt(saved, 10));
          }
        }
      } catch (error) {
        logger.error('Failed to load chat width', error);
      }
    };
    loadWidth();
  }, []);

  const handleModeChange = useCallback(
    (newMode: ChatMode) => {
      if (onModeChange) {
        onModeChange(newMode);
      } else {
        setInternalMode(newMode);
      }
      if (newMode === 'agent') {
        setWidth(w => Math.max(w, 600));
      }
      inputRef.current?.focus();
    },
    [onModeChange]
  );

  const handleResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = width;
    },
    [width]
  );

  useEffect(() => {
    if (!isResizing) {
      return;
    }
    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = resizeStartX.current - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartWidth.current + deltaX)));
    };
    const handleResizeEnd = () => {
      setIsResizing(false);
      window.electron?.store
        ?.set('aiChatWidth', width.toString())
        .catch(e => logger.error('Failed to save chat width', e));
    };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, width]);

  useEffect(() => {
    if (!isResizing && window.electron?.store) {
      window.electron.store
        .set('aiChatWidth', width.toString())
        .catch(e => logger.error('Failed to save chat width', e));
    }
  }, [width, isResizing]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    approvalResolversRef.current.reconcile(
      messages.map(message => ({
        messageId: message.id,
        taskId: message.agentTask?.task.id,
        pendingApproval: message.agentTask?.pendingApproval,
      }))
    );
  }, [messages]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const approvalResolvers = approvalResolversRef.current;
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      activeAgentRef.current?.controller.abort();
      activeAgentRef.current = null;
      approvalResolvers.settleAll();
    };
  }, []);

  const updateAgentMessage = useCallback(
    (messageId: string, updater: (message: AIMessage) => AIMessage) => {
      if (!isMountedRef.current) return;
      onUpdateMessage?.(messageId, updater);
    },
    [onUpdateMessage]
  );

  const handleCancelAgent = useCallback(() => {
    const active = activeAgentRef.current;
    if (!active || active.controller.signal.aborted) return;
    active.controller.abort();
    approvalResolversRef.current.settleMessage(active.messageId);
    if (active.phase === 'executing') executionEngine?.pause?.();
    updateAgentMessage(active.messageId, message =>
      message.agentTask
        ? {
            ...message,
            content: '**Agent Task Cancelled**\n\nCancelled by the user.',
            agentTask: {
              ...message.agentTask,
              task: snapshotTerminalTask(message.agentTask.task, 'cancelled'),
              currentStep: undefined,
              pendingApproval: undefined,
              phase: 'cancelled',
              statusMessage: getCancelledStatus('Cancelled by the user.'),
              lastError: undefined,
            },
          }
        : message
    );
  }, [executionEngine, updateAgentMessage]);

  const handleApprovalDecision = useCallback(
    (identity: ApprovalResolverIdentity, approved: boolean) => {
      if (!approvalResolversRef.current.settle(identity, approved)) return;
      updateAgentMessage(identity.messageId, message => {
        if (!message.agentTask || !matchesApproval(message, identity)) return message;

        const decidedStep = message.agentTask.task.steps.find(step => step.id === identity.stepId);
        const nextTask = decidedStep
          ? updateTaskStep(message.agentTask.task, {
              ...decidedStep,
              approved,
              status: approved ? 'approved' : 'rejected',
            })
          : { ...message.agentTask.task };
        nextTask.status = approved ? 'in_progress' : 'cancelled';

        return {
          ...message,
          agentTask: {
            ...message.agentTask,
            pendingApproval: undefined,
            currentStep:
              approved && decidedStep
                ? { ...decidedStep, approved: true, status: 'approved' }
                : undefined,
            task: nextTask,
            phase: approved ? 'executing' : 'cancelled',
            statusMessage: approved
              ? 'Approval granted. Applying only the exact approved proposal.'
              : 'Approval rejected. The pending proposal was not applied; earlier approved steps remain unchanged.',
            lastError: undefined,
          },
        };
      });
    },
    [updateAgentMessage]
  );

  const getAgentPreflightError = useCallback((): string | null => {
    if (!workspaceContext?.workspaceRoot) {
      return 'Open a workspace folder before starting agent mode so the agent has a project root to work from.';
    }

    if (!agentRuntime && (!taskPlanner || typeof taskPlanner.planTask !== 'function')) {
      return 'Agent planning is unavailable right now because the task planner service is not ready.';
    }

    if (!agentRuntime && (!executionEngine || typeof executionEngine.executeTask !== 'function')) {
      return 'Agent execution is unavailable right now because the execution engine is not ready.';
    }

    if (!agentRuntime && typeof executionEngine?.setTaskContext !== 'function') {
      return 'Agent execution context could not be initialized. Please reload the app and try again.';
    }

    return null;
  }, [agentRuntime, executionEngine, taskPlanner, workspaceContext]);

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

      activeAgentRef.current?.controller.abort();
      if (activeAgentRef.current) {
        approvalResolversRef.current.settleMessage(activeAgentRef.current.messageId);
      }
      executionEngine?.resume?.();
      const controller = new AbortController();
      activeAgentRef.current = { controller, messageId: agentMessageId, phase: 'planning' };

      const planningTask: AgentTask = {
        id: `${agentMessageId}-planning`,
        title: 'Planning task',
        description: userRequest,
        userRequest,
        steps: [],
        status: 'planning',
        createdAt: new Date(),
      };
      let activeTaskId = planningTask.id;

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
        executionEngine?.setTaskContext(userRequest, safeWorkspaceContext.workspaceRoot);
        const planRequest = {
          userRequest,
          signal: controller.signal,
          context: safeWorkspaceContext,
          options: { maxSteps: 10, requireApprovalForAll: false, allowDestructiveActions: true },
        };
        const planResponse = agentRuntime
          ? await agentRuntime.planTask(planRequest)
          : await taskPlanner!.planTask(planRequest);
        if (controller.signal.aborted) throw controller.signal.reason;
        activeTaskId = planResponse.task.id;
        if (activeAgentRef.current?.controller === controller) {
          activeAgentRef.current.phase = 'executing';
        }

        updateAgentMessage(agentMessageId, message => ({
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
            if (controller.signal.aborted) return;
            logger.debug('[AIChat] Step started:', step.title);
            approvalResolversRef.current.settleStep(agentMessageId, step.taskId, step.id);
            updateAgentMessage(agentMessageId, message => ({
              ...message,
              agentTask:
                message.agentTask?.task.id === step.taskId
                  ? {
                      ...message.agentTask,
                      task: updateTaskStep(message.agentTask.task, step),
                      currentStep: { ...step },
                      phase: 'executing',
                      pendingApproval: undefined,
                      statusMessage:
                        `Executing step ${getStepOrdinal(message.agentTask.task, step.id)} ` +
                        `of ${message.agentTask.task.steps.length}: ${step.title}`,
                      lastError: undefined,
                    }
                  : message.agentTask,
            }));
          },
          onStepComplete: (step: AgentStep) => {
            if (controller.signal.aborted) return;
            logger.debug('[AIChat] Step completed:', step.title);
            approvalResolversRef.current.settleStep(agentMessageId, step.taskId, step.id);
            updateAgentMessage(agentMessageId, message => ({
              ...message,
              agentTask:
                message.agentTask?.task.id === step.taskId
                  ? {
                      ...message.agentTask,
                      task: updateTaskStep(message.agentTask.task, step),
                      currentStep: { ...step },
                      pendingApproval: undefined,
                      phase: 'executing',
                      statusMessage:
                        `Completed step ${getStepOrdinal(message.agentTask.task, step.id)} ` +
                        `of ${message.agentTask.task.steps.length}: ${step.title}`,
                    }
                  : message.agentTask,
            }));
          },
          onStepError: (step: AgentStep, error: Error) => {
            if (controller.signal.aborted) return;
            logger.error('[AIChat] Step failed:', step.title, error);
            approvalResolversRef.current.settleStep(agentMessageId, step.taskId, step.id);
            updateAgentMessage(agentMessageId, message => ({
              ...message,
              agentTask:
                message.agentTask?.task.id === step.taskId
                  ? {
                      ...message.agentTask,
                      task: updateTaskStep(message.agentTask.task, step),
                      currentStep: { ...step },
                      phase: 'executing',
                      pendingApproval: undefined,
                      statusMessage:
                        `Step "${step.title}" failed. Task execution is stopping; ` +
                        'review the error below before retrying.',
                      lastError: error.message,
                    }
                  : message.agentTask,
            }));
          },
          onFileChanged: (filePath: string, action: 'created' | 'modified' | 'deleted') => {
            onFileChanged?.(filePath, action);
          },
          onStepApprovalRequired: async (
            step: AgentStep,
            request: ApprovalRequest,
            signal?: AbortSignal
          ) => {
            if (controller.signal.aborted) return false;
            const identifiedRequest = withApprovalIdentity(request);
            const identity: ApprovalResolverIdentity = {
              messageId: agentMessageId,
              taskId: identifiedRequest.taskId,
              stepId: identifiedRequest.stepId,
              proposalId: identifiedRequest.proposalId,
            };
            const decision = approvalResolversRef.current.register(identity, signal);

            updateAgentMessage(agentMessageId, message => ({
              ...message,
              agentTask:
                message.agentTask?.task.id === identifiedRequest.taskId
                  ? {
                      ...message.agentTask,
                      task: updateTaskStep(message.agentTask.task, step),
                      currentStep: { ...step },
                      pendingApproval: identifiedRequest,
                      phase: 'awaiting_approval',
                      statusMessage:
                        `Review the exact proposal for "${step.title}", then choose Approve or Reject. ` +
                        'No workspace mutation will run without approval.',
                      lastError: undefined,
                    }
                  : message.agentTask,
            }));

            if (onApprovalRequired) {
              void Promise.resolve()
                .then(() => onApprovalRequired(step, identifiedRequest, signal))
                .then(approved => {
                  if (!signal?.aborted) {
                    approvalResolversRef.current.settle(identity, approved);
                  }
                })
                .catch(error => {
                  if (!signal?.aborted) {
                    approvalResolversRef.current.reject(identity, error);
                  }
                });
            }

            const approved = await decision;
            if (signal?.aborted || !isMountedRef.current) return false;

            updateAgentMessage(agentMessageId, message => {
              if (!message.agentTask || !matchesApproval(message, identity)) return message;
              const nextTask = snapshotTask(
                message.agentTask.task,
                approved ? 'in_progress' : 'cancelled'
              );
              const matchingStep = nextTask.steps.find(taskStep => taskStep.id === step.id);
              if (matchingStep) {
                matchingStep.approved = approved;
                matchingStep.status = approved ? 'approved' : 'rejected';
              }
              return {
                ...message,
                agentTask: {
                  ...message.agentTask,
                  task: nextTask,
                  currentStep: approved && matchingStep ? { ...matchingStep } : undefined,
                  pendingApproval: undefined,
                  phase: approved ? 'executing' : 'cancelled',
                  statusMessage: approved
                    ? `Approval granted for "${step.title}". Applying only the exact approved proposal.`
                    : 'Approval rejected. The pending proposal was not applied; ' +
                      'earlier approved steps remain unchanged.',
                  lastError: undefined,
                },
              };
            });
            return approved;
          },
          onTaskComplete: (task: AgentTask) => {
            if (controller.signal.aborted) return;
            approvalResolversRef.current.settleTask(task.id);
            updateAgentMessage(agentMessageId, message => {
              if (message.agentTask?.task.id !== task.id) return message;
              return {
                ...message,
                content: getCompletedTaskContent(task),
                agentTask: {
                  ...message.agentTask,
                  task: snapshotTask(task, 'completed'),
                  currentStep: undefined,
                  pendingApproval: undefined,
                  phase: 'completed',
                  statusMessage: getCompletedStatus(task),
                  lastError: undefined,
                },
              };
            });
            onTaskComplete?.(task);
          },
          onTaskError: (task: AgentTask, error: Error) => {
            if (controller.signal.aborted) return;
            approvalResolversRef.current.settleTask(task.id);
            updateAgentMessage(agentMessageId, message => {
              if (message.agentTask?.task.id !== task.id) return message;
              return {
                ...message,
                content: `**Agent Task Failed**: ${task.title}\n\n${task.description}`,
                agentTask: {
                  ...message.agentTask,
                  task: snapshotTerminalTask(task, 'failed'),
                  currentStep: undefined,
                  pendingApproval: undefined,
                  phase: 'failed',
                  statusMessage:
                    'Task failed. Review the error below, correct the cause, then retry.',
                  lastError: error.message,
                },
              };
            });
            onTaskError?.(task, error);
          },
          onTaskCancelled: (task: AgentTask, reason: string) => {
            if (controller.signal.aborted) return;
            approvalResolversRef.current.settleTask(task.id);
            updateAgentMessage(agentMessageId, message => {
              if (message.agentTask?.task.id !== task.id) return message;
              return {
                ...message,
                content: `**Agent Task Cancelled**: ${task.title}\n\n${reason}`,
                agentTask: {
                  ...message.agentTask,
                  task: snapshotTerminalTask(task, 'cancelled'),
                  currentStep: undefined,
                  pendingApproval: undefined,
                  phase: 'cancelled',
                  statusMessage: getCancelledStatus(reason),
                  lastError: undefined,
                },
              };
            });
            onTaskCancelled?.(task, reason);
          },
        };
        if (agentRuntime) {
          await agentRuntime.executeTask(
            planResponse.task,
            safeWorkspaceContext.workspaceRoot,
            callbacks
          );
        } else {
          await executionEngine!.executeTask(planResponse.task, callbacks);
        }
      } catch (error) {
        logger.error('Agent task failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        const cancelled = controller.signal.aborted;
        approvalResolversRef.current.settleMessage(agentMessageId);
        updateAgentMessage(agentMessageId, existingMessage => {
          if (existingMessage.agentTask?.task.id !== activeTaskId) return existingMessage;
          return {
            ...existingMessage,
            content: cancelled
              ? '**Agent Task Cancelled**\n\nCancelled by the user.'
              : `**Agent Task Failed**\n\n${message}`,
            agentTask: {
              ...existingMessage.agentTask,
              task: {
                ...snapshotTerminalTask(
                  existingMessage.agentTask.task,
                  cancelled ? 'cancelled' : 'failed'
                ),
                error: message,
              },
              currentStep: undefined,
              pendingApproval: undefined,
              phase: cancelled ? 'cancelled' : 'failed',
              statusMessage: cancelled
                ? getCancelledStatus('Cancelled by the user.')
                : 'Task failed before execution completed. Review the error below, ' +
                  'correct the cause, then retry.',
              lastError: cancelled ? undefined : message,
            },
          };
        });
      } finally {
        if (activeAgentRef.current?.controller === controller) activeAgentRef.current = null;
      }
    },
    [
      taskPlanner,
      executionEngine,
      agentRuntime,
      workspaceContext,
      onAddMessage,
      getAgentPreflightError,
      updateAgentMessage,
      onFileChanged,
      onApprovalRequired,
      onTaskComplete,
      onTaskError,
      onTaskCancelled,
    ]
  );

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const messageText = (overrideText ?? input).trim();
      if (!messageText) {
        return;
      }
      // Chat variant of the palette /schedule command (spec 16) — opens the
      // schedule-creation flow instead of sending the message to the AI.
      if (handleScheduleChatCommand(messageText)) {
        if (!overrideText) {
          setInput('');
        }
        return;
      }
      const blockedByState = responseState === 'cancelling' || (mode === 'agent' && isTyping);
      if (blockedByState) {
        return;
      }
      if (!overrideText) setInput('');
      setPendingSendCount(count => count + 1);
      try {
        if (mode === 'agent') {
          await handleAgentTask(messageText);
        } else {
          await onSendMessage(messageText);
        }
      } catch (error) {
        logger.error('[AIChat] Failed to send message:', error);
        if (!overrideText) setInput(messageText);
        onAddMessage?.({
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: `⚠️ Error: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date(),
        });
      } finally {
        setPendingSendCount(count => Math.max(0, count - 1));
      }
    },
    [input, responseState, mode, isTyping, onSendMessage, handleAgentTask, onAddMessage]
  );

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      void handleSend(action);
    },
    [handleSend]
  );

  const renderAgentTask = useCallback(
    (message: AIMessage) => {
      if (!message.agentTask) {
        return null;
      }
      const {
        task,
        pendingApproval,
        phase = 'planning',
        statusMessage,
        warnings,
        lastError,
      } = message.agentTask;
      const completedSteps = task.steps.filter(s => s.status === 'completed').length;
      const progress = task.steps.length > 0 ? (completedSteps / task.steps.length) * 100 : 0;
      return (
        <div data-testid="agent-task">
          <AgentStatusCard>
            <AgentStatusHeader>
              <AgentStatusText>{statusMessage ?? 'Preparing agent workflow.'}</AgentStatusText>
              <AgentStatusBadge $phase={phase}>{phase.replace('_', ' ')}</AgentStatusBadge>
            </AgentStatusHeader>
            {lastError && <AgentStatusText>{lastError}</AgentStatusText>}
            {warnings && warnings.length > 0 && (
              <AgentWarningList>
                {warnings.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </AgentWarningList>
            )}
          </AgentStatusCard>
          {task.steps.length > 0 && (
            <TaskProgressBar>
              <TaskProgressFill
                $progress={progress}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </TaskProgressBar>
          )}
          <AgentStepsList>
            {task.steps.map(step => (
              <MemoizedStepCard
                key={step.id}
                messageId={message.id}
                step={step}
                pendingApproval={pendingApproval ?? null}
                handleApproval={handleApprovalDecision}
              />
            ))}
          </AgentStepsList>
        </div>
      );
    },
    [handleApprovalDecision]
  );

  return (
    <ChatContainer $width={width} $mode={mode}>
      <ResizeHandle $isResizing={isResizing} onMouseDown={handleResizeStart} />
      <ChatHeader>
        {mode === 'chat' && <Zap size={16} />}
        {mode === 'agent' && <Play size={16} />}
        {mode === 'chat' ? 'AI Assistant' : 'Agent Mode'}
        <ModeSwitcher>
          <ModeButton
            $active={mode === 'chat'}
            aria-pressed={mode === 'chat'}
            onClick={() => handleModeChange('chat')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="mode-chat"
          >
            Chat
          </ModeButton>
          <ModeButton
            $active={mode === 'agent'}
            aria-pressed={mode === 'agent'}
            onClick={() => handleModeChange('agent')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="mode-agent"
          >
            Agent
          </ModeButton>
        </ModeSwitcher>
        <CloseButton
          onClick={handleClearChat}
          title="Clear chat"
          aria-label="Clear chat"
          data-testid="clear-chat"
          disabled={isChatBusy}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 size={16} />
        </CloseButton>
        <CloseButton
          onClick={onClose}
          title="Close AI Chat"
          aria-label="Close AI Chat"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={16} />
        </CloseButton>
      </ChatHeader>
      <ModeDescription
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        key={mode}
      >
        <strong>{modeInfo.title}</strong>
        {modeInfo.description}
      </ModeDescription>
      <MessagesContainer>
        {mode === 'agent' && !hasAgentHistory && (
          <AgentEmptyState
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="agent-empty-state"
          >
            <strong>Agent mode is ready</strong>
            {workspaceContext?.workspaceRoot
              ? `Describe a multi-step task and the agent will plan it against ${workspaceContext.workspaceRoot}.`
              : 'Open a folder first so the agent can plan and execute work against your workspace.'}
          </AgentEmptyState>
        )}
        {messages.map(message => (
          <MessageItem
            key={message.id}
            message={message}
            showReasoningProcess={showReasoningProcess}
            renderAgentTask={renderAgentTask}
            onCopy={text => {
              navigator?.clipboard?.writeText(text).catch(err => {
                logger.warn('Failed to copy message', err);
              });
            }}
            onFeedback={(messageId, feedback) => {
              recordMessageFeedback(messageId, feedback);
            }}
          />
        ))}
        {isChatBusy && <TypingMessage />}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <InputContainer>
        <QuickActions>
          {quickActions.map(action => (
            <QuickActionButton
              key={action}
              onClick={() => handleQuickAction(action)}
              disabled={isChatBusy}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {action}
            </QuickActionButton>
          ))}
        </QuickActions>
        <InputWrapper>
          <TextInput
            ref={inputRef}
            id="ai-chat-input"
            name="aiChatMessage"
            data-testid="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={mode === 'agent' ? agentPlaceholder : 'Ask AI about your code...'}
            disabled={inputDisabled}
            aria-label="Message input"
          />
          <SendButton
            onClick={() => handleSend()}
            disabled={sendDisabled}
            title="Send message (Enter)"
            aria-label="Send message"
            whileHover={!sendDisabled ? { scale: 1.05 } : {}}
            whileTap={!sendDisabled ? { scale: 0.95 } : {}}
          >
            <Send size={16} />
          </SendButton>
          {showCancelButton && (
            <CancelButton
              data-testid={mode === 'agent' ? 'cancel-agent-task' : 'cancel-response'}
              onClick={mode === 'agent' ? handleCancelAgent : onCancelResponse}
              title={mode === 'agent' ? 'Cancel agent task' : 'Cancel generation'}
              aria-label={mode === 'agent' ? 'Cancel agent task' : 'Cancel generation'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Square size={14} />
            </CancelButton>
          )}
        </InputWrapper>
        {mode === 'chat' && responseState !== 'idle' && (
          <ResponseStatus data-testid="ai-response-state" $state={responseState}>
            {responseState === 'streaming' && 'AI is responding...'}
            {responseState === 'cancelling' && 'Cancelling generation...'}
            {responseState === 'cancelled' && 'Generation cancelled.'}
            {responseState === 'error' && 'Last response failed. You can retry now.'}
          </ResponseStatus>
        )}
      </InputContainer>
    </ChatContainer>
  );
};

export default AIChat;
export type { AIChatProps, ChatMode } from './types';
