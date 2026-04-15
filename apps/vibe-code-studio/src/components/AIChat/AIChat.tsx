/**
 * AIChat Component - Main AI chat interface with chat and agent modes
 */
import { Play, Send, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';

import { logger } from '../../services/Logger';
import type { AIMessage, AgentStep, AgentTask, ApprovalRequest } from '../../types';

import { MessageItem, TypingMessage } from './MessageItem';
import { MemoizedStepCard, getStepIcon } from './StepCard';
import {
    AgentEmptyState, AgentStatusBadge, AgentStatusCard, AgentStatusHeader, AgentStatusText,
    AgentStepsList, AgentWarningList, ChatContainer, ChatHeader, CloseButton, InputContainer,
    InputWrapper, MessagesContainer, ModeButton, ModeDescription, ModeSwitcher, QuickActionButton,
    QuickActions, ResizeHandle, SendButton, TaskProgressBar, TaskProgressFill, TextInput,
} from './styled';
import type { AIChatProps, ChatMode, ModeInfo } from './types';
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from './types';

const MODE_DESCRIPTIONS: Record<ChatMode, ModeInfo> = {
  chat: { title: 'Chat Mode', description: 'Have conversations with AI, ask questions, get code explanations.' },
  agent: { title: 'Agent Mode', description: 'Let AI autonomously plan and execute complex multi-step tasks.' },
};

const MODE_QUICK_ACTIONS: Record<ChatMode, string[]> = {
  chat: ['Explain this code', 'Generate function', 'Add comments', 'Fix bugs', 'Optimize code', 'Write tests'],
  agent: ['Create a new feature', 'Refactor this component', 'Add error handling', 'Generate test suite'],
};

const AIChat = ({
  messages, onSendMessage, onClose, showReasoningProcess = false, currentModel: _currentModel = 'moonshot/kimi-2.5-pro',
  mode: externalMode, onModeChange, taskPlanner, executionEngine, workspaceContext,
  onAddMessage, onUpdateMessage, onFileChanged, onTaskComplete, onTaskError, onApprovalRequired,
  onMultiFileEditDetected: _onMultiFileEditDetected,
}: AIChatProps) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalMode, setInternalMode] = useState<ChatMode>('chat');
  const mode = externalMode ?? internalMode;

  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(width);
  const approvalResolversRef = useRef<Map<string, (approved: boolean) => void>>(new Map());
  const modeInfo = MODE_DESCRIPTIONS[mode];
  const quickActions = MODE_QUICK_ACTIONS[mode];
  const agentPlaceholder = workspaceContext?.workspaceRoot
    ? 'Describe a multi-step task for the agent...'
    : 'Open a folder to use agent mode effectively...';
  const hasAgentHistory = messages.some((message) => !!message.agentTask);

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

  const handleModeChange = useCallback((newMode: ChatMode) => {
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
    if (newMode === 'agent') { setWidth((w) => Math.max(w, 600)); }
    inputRef.current?.focus();
  }, [onModeChange]);

  const handleResizeStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) { return; }
    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = resizeStartX.current - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartWidth.current + deltaX)));
    };
    const handleResizeEnd = () => {
      setIsResizing(false);
      window.electron?.store?.set('aiChatWidth', width.toString()).catch((e) => logger.error('Failed to save chat width', e));
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
        window.electron.store.set('aiChatWidth', width.toString()).catch((e) => logger.error('Failed to save chat width', e));
    }
  }, [width, isResizing]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => () => {
    approvalResolversRef.current.forEach((resolve) => resolve(false));
    approvalResolversRef.current.clear();
  }, []);

  const updateAgentMessage = useCallback((messageId: string, updater: (message: AIMessage) => AIMessage) => {
    onUpdateMessage?.(messageId, updater);
  }, [onUpdateMessage]);

  const handleApprovalDecision = useCallback((messageId: string, stepId: string, approved: boolean) => {
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
  }, [updateAgentMessage]);

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

  const handleAgentTask = useCallback(async (userRequest: string) => {
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
      executionEngine.setTaskContext(userRequest, safeWorkspaceContext.workspaceRoot);
      const planResponse = await taskPlanner.planTask({
        userRequest, context: safeWorkspaceContext,
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
          updateAgentMessage(agentMessageId, (message) => ({
            ...message,
            agentTask: message.agentTask ? {
              ...message.agentTask,
              currentStep: step,
              phase: 'executing',
              pendingApproval: undefined,
              statusMessage: `Executing step ${step.order + 1} of ${message.agentTask.task.steps.length}: ${step.title}`,
              lastError: undefined,
            } : message.agentTask,
          }));
        },
        onStepComplete: (step: AgentStep) => {
          logger.debug('[AIChat] Step completed:', step.title);
          updateAgentMessage(agentMessageId, (message) => ({
            ...message,
            agentTask: message.agentTask ? {
              ...message.agentTask,
              currentStep: step,
              pendingApproval: undefined,
              phase: 'executing',
              statusMessage: `Completed step ${step.order + 1} of ${message.agentTask.task.steps.length}: ${step.title}`,
            } : message.agentTask,
          }));
        },
        onStepError: (step: AgentStep, error: Error) => {
          logger.error('[AIChat] Step failed:', step.title, error);
          updateAgentMessage(agentMessageId, (message) => ({
            ...message,
            agentTask: message.agentTask ? {
              ...message.agentTask,
              currentStep: step,
              phase: 'executing',
              statusMessage: `Step failed: ${step.title}`,
              lastError: error.message,
            } : message.agentTask,
          }));
        },
        onFileChanged: (filePath: string, action: 'created' | 'modified' | 'deleted') => {
          onFileChanged?.(filePath, action);
        },
        onStepApprovalRequired: async (step: AgentStep, request: ApprovalRequest) => {
          updateAgentMessage(agentMessageId, (message) => ({
            ...message,
            agentTask: message.agentTask ? {
              ...message.agentTask,
              currentStep: step,
              pendingApproval: request,
              phase: 'awaiting_approval',
              statusMessage: `Waiting for approval on "${step.title}".`,
            } : message.agentTask,
          }));

          if (onApprovalRequired) {
            const approved = await onApprovalRequired(step, request);
            updateAgentMessage(agentMessageId, (message) => ({
              ...message,
              agentTask: message.agentTask ? {
                ...message.agentTask,
                pendingApproval: undefined,
                phase: approved ? 'executing' : 'failed',
                statusMessage: approved
                  ? `Approval granted for "${step.title}".`
                  : `Approval rejected for "${step.title}".`,
                lastError: approved ? undefined : 'User rejected approval request.',
              } : message.agentTask,
            }));
            return approved;
          }

          return await new Promise<boolean>((resolve) => {
            approvalResolversRef.current.set(step.id, resolve);
          });
        },
        onTaskComplete: (task: AgentTask) => {
          updateAgentMessage(agentMessageId, (message) => ({
            ...message,
            content: `**Agent Task**: ${task.title}\n\n${task.description}`,
            agentTask: message.agentTask ? {
              ...message.agentTask,
              task,
              currentStep: undefined,
              pendingApproval: undefined,
              phase: 'completed',
              statusMessage: 'Task completed successfully.',
              lastError: undefined,
            } : message.agentTask,
          }));
          onTaskComplete?.(task);
        },
        onTaskError: (task: AgentTask, error: Error) => {
          updateAgentMessage(agentMessageId, (message) => ({
            ...message,
            content: `**Agent Task Failed**: ${task.title}\n\n${task.description}`,
            agentTask: message.agentTask ? {
              ...message.agentTask,
              task,
              pendingApproval: undefined,
              phase: 'failed',
              statusMessage: `Task failed: ${error.message}`,
              lastError: error.message,
            } : message.agentTask,
          }));
          onTaskError?.(task, error);
        },
      };
      await executionEngine.executeTask(planResponse.task, callbacks);
    } catch (error) {
      logger.error('Agent task failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      updateAgentMessage(agentMessageId, (existingMessage) => ({
        ...existingMessage,
        content: `**Agent Task Failed**\n\n${message}`,
        agentTask: existingMessage.agentTask ? {
          ...existingMessage.agentTask,
          phase: 'failed',
          statusMessage: `Task failed before execution could complete: ${message}`,
          lastError: message,
        } : existingMessage.agentTask,
      }));
    }
  }, [taskPlanner, executionEngine, workspaceContext, onAddMessage, getAgentPreflightError, updateAgentMessage, onFileChanged, onApprovalRequired, onTaskComplete, onTaskError]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const messageText = (overrideText ?? input).trim();
    if (!messageText) { return; }
    if (!overrideText) setInput('');
    setIsTyping(true);
    try {
      if (mode === 'agent') {
        await handleAgentTask(messageText);
      } else {
        await onSendMessage(messageText);
      }
    } catch (error) {
      logger.error('[AIChat] Failed to send message:', error);
      onAddMessage?.({
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: `⚠️ Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      });
    } finally {
      setIsTyping(false);
    }
  }, [input, mode, onSendMessage, handleAgentTask, onAddMessage]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleQuickAction = useCallback((action: string) => {
    void handleSend(action);
  }, [handleSend]);

  const renderAgentTask = useCallback((message: AIMessage) => {
    if (!message.agentTask) { return null; }
    const { task, pendingApproval, phase = 'planning', statusMessage, warnings, lastError } = message.agentTask;
    const completedSteps = task.steps.filter((s) => s.status === 'completed').length;
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
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </AgentWarningList>
          )}
        </AgentStatusCard>
        {task.steps.length > 0 && (
          <TaskProgressBar>
            <TaskProgressFill $progress={progress} initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </TaskProgressBar>
        )}
        <AgentStepsList>
          {task.steps.map((step) => (
            <MemoizedStepCard
              key={step.id}
              step={step}
              pendingApproval={pendingApproval ?? null}
              getStepIcon={getStepIcon}
              handleApproval={(stepId: string, approved: boolean) => {
                handleApprovalDecision(message.id, stepId, approved);
              }}
            />
          ))}
        </AgentStepsList>
      </div>
    );
  }, [handleApprovalDecision]);

  return (
    <ChatContainer $width={width} $mode={mode}>
      <ResizeHandle $isResizing={isResizing} onMouseDown={handleResizeStart} />
      <ChatHeader>
        {mode === 'chat' && <Zap size={16} />}
        {mode === 'agent' && <Play size={16} />}
        {mode === 'chat' ? 'AI Assistant' : 'Agent Mode'}
        <ModeSwitcher>
          <ModeButton $active={mode === 'chat'} onClick={() => handleModeChange('chat')}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} data-testid="mode-chat">Chat</ModeButton>
          <ModeButton $active={mode === 'agent'} onClick={() => handleModeChange('agent')}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} data-testid="mode-agent">Agent</ModeButton>
        </ModeSwitcher>
        <CloseButton onClick={onClose} title="Close AI Chat" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <X size={16} />
        </CloseButton>
      </ChatHeader>
      <ModeDescription initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} key={mode}>
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
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            showReasoningProcess={showReasoningProcess}
            renderAgentTask={renderAgentTask}
            onCopy={(text) => {
              navigator?.clipboard?.writeText(text).catch((err) => {
                logger.warn('Failed to copy message', err);
              });
            }}
            onFeedback={(messageId, feedback) => {
              logger.info('[AIChat] Feedback:', messageId, feedback);
            }}
          />
        ))}
        {isTyping && mode === 'chat' && <TypingMessage />}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <InputContainer>
        <QuickActions>
          {quickActions.map((action) => (
            <QuickActionButton key={action} onClick={() => handleQuickAction(action)}
              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>{action}</QuickActionButton>
          ))}
        </QuickActions>
        <InputWrapper>
          <TextInput ref={inputRef} id="ai-chat-input" name="aiChatMessage" data-testid="chat-input"
            value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress}
            placeholder={mode === 'agent' ? agentPlaceholder : 'Ask AI about your code...'} disabled={isTyping} />
          <SendButton onClick={() => handleSend()} disabled={!input.trim() || isTyping} title="Send message (Enter)"
            whileHover={!isTyping && input.trim() ? { scale: 1.05 } : {}}
            whileTap={!isTyping && input.trim() ? { scale: 0.95 } : {}}>
            <Send size={16} />
          </SendButton>
        </InputWrapper>
      </InputContainer>
    </ChatContainer>
  );
};

export default AIChat;
export type { AIChatProps, ChatMode } from './types';
