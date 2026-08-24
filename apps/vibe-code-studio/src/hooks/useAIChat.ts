import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

import { isCancellationLifecycleEnabled } from '../config/aiRolloutFlags';
import { MultiFileEditDetector } from '../services/ai/MultiFileEditDetector';
import { TaskPersistence } from '../services/ai/TaskPersistence';
import type { UnifiedAIService } from '../services/ai/UnifiedAIService';
import { logger } from '../services/Logger';
import { telemetry } from '../services/TelemetryService';
import { entitlementsService } from '../services/EntitlementsService';
import type {
  AIContextRequest,
  AIMessage,
  AIResponseState,
  EditorFile,
  WorkspaceContext,
} from '../types';
import type { FileChange, MultiFileEditPlan } from '../types/multifile';

const CHAT_STORAGE_KEY = 'vibe-code-studio:chat-messages';
const MAX_PERSISTED_MESSAGES = 100;

const WELCOME_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Welcome to Vibe Code Studio! 🚀

I'm your AI coding assistant. I can help you with:

• **Code completion** — Smart suggestions as you type
• **Code generation** — Write functions, classes, and more
• **Code explanation** — Understand complex code
• **Debugging** — Find and fix issues
• **Refactoring** — Improve code structure

Try asking me something like:
- "Write a React component for a login form"
- "Explain this function"
- "Help me debug this error"

Let's build something amazing together!`,
  timestamp: new Date(),
};

interface ActiveGenerationSession {
  sessionId: string;
  responseMessageId: string;
}

type CancelReason =
  | 'user_action'
  | 'chat_closed'
  | 'superseded_by_new_request'
  | 'component_unmount'
  | 'unknown';

type TelemetryValue = string | number | boolean | undefined;

function emitLifecycleTelemetry(event: string, dimensions: Record<string, TelemetryValue>): void {
  const sanitizedDimensions: Record<string, string | number | boolean> = {};
  Object.entries(dimensions).forEach(([key, value]) => {
    if (value !== undefined) {
      sanitizedDimensions[key] = value;
    }
  });

  telemetry.trackEvent(event, sanitizedDimensions);
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'AbortError' || /abort(ed|ing)?/i.test(error.message);
}

function loadPersistedMessages(): AIMessage[] {
  try {
    // Synchronous context — electron-store is async so localStorage is the only option here
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(raw) as Array<AIMessage & { timestamp: string }>;
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [WELCOME_MESSAGE];
  }
}

function parsePersistedMessages(raw: unknown): AIMessage[] {
  if (typeof raw !== 'string' || !raw.trim()) return [WELCOME_MESSAGE];
  const parsed = JSON.parse(raw) as Array<AIMessage & { timestamp: string }>;
  if (!Array.isArray(parsed)) return [WELCOME_MESSAGE];
  return parsed.map(message => ({
    ...message,
    timestamp: new Date(message.timestamp),
    ...(message.agentTask
      ? {
          agentTask: {
            ...message.agentTask,
            task: {
              ...message.agentTask.task,
              createdAt: new Date(message.agentTask.task.createdAt),
              ...(message.agentTask.task.startedAt
                ? { startedAt: new Date(message.agentTask.task.startedAt) }
                : {}),
              ...(message.agentTask.task.completedAt
                ? { completedAt: new Date(message.agentTask.task.completedAt) }
                : {}),
            },
          },
        }
      : {}),
  }));
}

async function restoreTerminalOutcomes(messages: AIMessage[]): Promise<AIMessage[]> {
  const persistence = new TaskPersistence();
  return Promise.all(
    messages.map(async message => {
      const task = message.agentTask?.task;
      if (!task) return message;
      let outcome;
      try {
        [outcome] = await persistence.getChatOutcomes(task.id, 1);
      } catch (error) {
        logger.warn(`[useAIChat] Failed to restore terminal outcome for ${task.id}:`, error);
        return message;
      }
      if (!outcome?.finalReport.trim()) return message;

      const finalReport = outcome.finalReport.trim();
      const status = outcome.outcome;
      return {
        ...message,
        content:
          status === 'completed' ? `**Agent Task**: ${task.title}\n\n${finalReport}` : finalReport,
        timestamp: new Date(outcome.createdAt),
        agentTask: {
          ...message.agentTask,
          task: {
            ...task,
            status,
            finalReport,
            completedAt: new Date(outcome.createdAt),
          },
          currentStep: undefined,
          pendingApproval: undefined,
          phase: status,
        },
      };
    })
  );
}

export interface UseAIChatReturn {
  aiMessages: AIMessage[];
  aiChatOpen: boolean;
  isAiResponding: boolean;
  aiResponseState: AIResponseState;
  setAiChatOpen: (open: boolean) => void;
  handleSendMessage: (message: string, contextRequest?: Partial<AIContextRequest>) => Promise<void>;
  cancelAiResponse: () => void;
  clearAiMessages: () => void;
  addAiMessage: (message: AIMessage) => void;
  updateAiMessage: (messageId: string, updater: (msg: AIMessage) => AIMessage) => void;
}

export interface UseAIChatProps {
  aiService: UnifiedAIService;
  currentFile?: EditorFile | null | undefined;
  workspaceContext?: WorkspaceContext | undefined;
  onError?: ((error: Error) => void) | undefined;
  onMultiFileEditDetected?: ((plan: MultiFileEditPlan, changes: FileChange[]) => void) | undefined;
  openFiles?: EditorFile[];
  workspaceFolder?: string | null;
  sidebarOpen?: boolean;
  previewOpen?: boolean;
}

export function useAIChat({
  aiService,
  currentFile,
  workspaceContext,
  onError,
  onMultiFileEditDetected,
  openFiles = [],
  workspaceFolder = null,
  sidebarOpen = true,
  previewOpen = false,
}: UseAIChatProps): UseAIChatReturn {
  const cancellationLifecycleEnabled = isCancellationLifecycleEnabled();
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(loadPersistedMessages);
  const [messagesHydrated, setMessagesHydrated] = useState(() => !window.electron?.store);
  const [aiChatOpen, setAiChatOpenState] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [aiResponseState, setAiResponseState] = useState<AIResponseState>('idle');
  const activeSessionRef = useRef<ActiveGenerationSession | null>(null);
  const cancellationReasonsRef = useRef<Map<string, CancelReason>>(new Map());
  const activeRequestTokenRef = useRef(0);
  const isMountedRef = useRef(true);

  const emitGenerationTelemetry = useCallback(
    (event: string, dimensions: Record<string, TelemetryValue>) => {
      emitLifecycleTelemetry(event, {
        request_mode: 'chat',
        cancellation_lifecycle_enabled: cancellationLifecycleEnabled,
        ...dimensions,
      });
    },
    [cancellationLifecycleEnabled]
  );

  const addAiMessage = useCallback((message: AIMessage) => {
    // Use startTransition for non-urgent message additions (e.g., agent task updates)
    // Urgent messages (e.g., user messages) will skip this and update immediately
    const isUrgent = message.role === 'user';

    if (isUrgent) {
      setAiMessages(prev => [...prev, message]);
    } else {
      startTransition(() => {
        setAiMessages(prev => [...prev, message]);
      });
    }
  }, []);

  const updateAiMessage = useCallback(
    (messageId: string, updater: (msg: AIMessage) => AIMessage) => {
      // Use startTransition for non-urgent message updates (agent task step progress)
      startTransition(() => {
        setAiMessages(prev => prev.map(msg => (msg.id === messageId ? updater(msg) : msg)));
      });
    },
    []
  );

  const clearAiMessages = useCallback(() => {
    setAiMessages([WELCOME_MESSAGE]);
    if (window.electron?.store) {
      void window.electron.store.delete(CHAT_STORAGE_KEY);
    } else {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, []);

  const markResponseCancelled = useCallback((responseMessageId: string) => {
    startTransition(() => {
      setAiMessages(prev =>
        prev.map(msg => {
          if (msg.id !== responseMessageId || msg.role !== 'assistant') {
            return msg;
          }

          const trimmed = msg.content.trim();
          if (trimmed.length === 0) {
            return { ...msg, content: 'Generation cancelled.' };
          }

          if (trimmed.includes('_Generation cancelled._')) {
            return msg;
          }

          return { ...msg, content: `${trimmed}\n\n_Generation cancelled._` };
        })
      );
    });
  }, []);

  const cancelAiResponseWithReason = useCallback(
    (reason: CancelReason) => {
      const activeSession = activeSessionRef.current;
      if (!activeSession) {
        return false;
      }

      if (cancellationLifecycleEnabled) {
        setAiResponseState('cancelling');
      }

      const cancelled = aiService.cancelGenerationSession(activeSession.sessionId);
      activeSessionRef.current = null;
      cancellationReasonsRef.current.set(activeSession.sessionId, reason);

      emitGenerationTelemetry('stream_cancel_requested', {
        reason,
        result_status: cancelled ? 'accepted' : 'session_missing',
        session_id: activeSession.sessionId,
      });

      if (!cancelled) {
        cancellationReasonsRef.current.delete(activeSession.sessionId);
        setAiResponseState('idle');
        return false;
      }

      setIsAiResponding(false);

      if (cancellationLifecycleEnabled) {
        markResponseCancelled(activeSession.responseMessageId);
        setAiResponseState('cancelled');
      } else {
        setAiResponseState('idle');
      }

      return true;
    },
    [aiService, cancellationLifecycleEnabled, emitGenerationTelemetry, markResponseCancelled]
  );

  const cancelAiResponse = useCallback(() => {
    void cancelAiResponseWithReason('user_action');
  }, [cancelAiResponseWithReason]);

  const setAiChatOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        void cancelAiResponseWithReason('chat_closed');
      }
      setAiChatOpenState(open);
    },
    [cancelAiResponseWithReason]
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      void cancelAiResponseWithReason('component_unmount');
    };
  }, [cancelAiResponseWithReason]);

  useEffect(() => {
    const store = window.electron?.store;
    if (!store) return;
    let cancelled = false;
    void store
      .get(CHAT_STORAGE_KEY)
      .then(parsePersistedMessages)
      .then(restoreTerminalOutcomes)
      .then(messages => {
        if (!cancelled) setAiMessages(messages);
      })
      .catch(error => logger.error('[useAIChat] Failed to restore chat history:', error))
      .finally(() => {
        if (!cancelled) setMessagesHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist messages on every change — use electron-store in Electron, localStorage as web fallback
  useEffect(() => {
    if (!messagesHydrated) return;
    try {
      const json = JSON.stringify(aiMessages.slice(-MAX_PERSISTED_MESSAGES));
      if (window.electron?.store) {
        void window.electron.store.set(CHAT_STORAGE_KEY, json);
      } else {
        localStorage.setItem(CHAT_STORAGE_KEY, json);
      }
    } catch {
      // ignore quota / store errors
    }
  }, [aiMessages, messagesHydrated]);

  const handleSendMessage = useCallback(
    async (message: string, contextRequest?: Partial<AIContextRequest>) => {
      const plan = entitlementsService.getCurrentPlan();
      if (plan === 'free') {
        const userMsgsCount = aiMessages.filter(m => m.role === 'user').length;
        if (userMsgsCount >= 10) {
          const limitMsg: AIMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ **Free Plan Limit Reached**\n\nYou have used your daily limit of 10 messages. Please click the [Upgrade to Pro](#login) link or go to Settings to unlock unlimited AI assistant queries, autocomplete, custom rules, and multi-agent execution.`,
            timestamp: new Date(),
          };
          setAiMessages(prev => [...prev, limitMsg]);
          return;
        }
      }

      const requestToken = activeRequestTokenRef.current + 1;
      activeRequestTokenRef.current = requestToken;

      if (activeSessionRef.current) {
        void cancelAiResponseWithReason('superseded_by_new_request');
      }

      // Add user message
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      addAiMessage(userMessage);

      setIsAiResponding(true);
      setAiResponseState('streaming');
      emitGenerationTelemetry('generation_request_started', {
        request_token: requestToken,
        has_current_file: Boolean(currentFile),
        open_file_count: openFiles.length,
        has_workspace_folder: Boolean(workspaceFolder),
        has_context_override: Boolean(contextRequest),
      });

      let generationSessionId: string | null = null;
      let activeResponseId: string | null = null;
      let streamStartedAt = Date.now();
      let streamedChunkCount = 0;
      let streamCancelled = false;

      try {
        // Build system prompt with workspace and file context
        const wsCtx = workspaceContext ?? {
          rootPath: '/',
          totalFiles: 0,
          languages: ['JavaScript', 'TypeScript'],
          testFiles: 0,
          projectStructure: {},
          dependencies: {},
          exports: {},
          symbols: {},
          lastIndexed: new Date(),
          summary: 'Demo project',
        };

        let systemPrompt = `You are Vibe Code Studio, an AI coding assistant embedded in a desktop code editor. You have access to the user's workspace and can read their files.

## Workspace
- **Root**: ${wsCtx.rootPath}
- **Files**: ${wsCtx.totalFiles} total
- **Languages**: ${(wsCtx.languages || []).join(', ')}
- **Summary**: ${wsCtx.summary || 'No summary'}`;

        if (currentFile) {
          systemPrompt += `\n\n## Current File
- **Name**: ${currentFile.name}
- **Path**: ${currentFile.path || currentFile.name}
- **Language**: ${currentFile.language || 'unknown'}`;
          if (currentFile.content) {
            const truncated =
              currentFile.content.length > 8000
                ? currentFile.content.substring(0, 8000) + '\n... (truncated)'
                : currentFile.content;
            systemPrompt += `\n\n### File Contents\n\`\`\`${currentFile.language || ''}\n${truncated}\n\`\`\``;
          }
        }

        if (openFiles.length > 0) {
          systemPrompt += `\n\n## Open Files\n${openFiles.map(f => `- ${f.name}`).join('\n')}`;
        }

        systemPrompt += `\n\nWhen the user asks you to review, explain, or modify code, use the file contents above. Provide specific, actionable feedback referencing line numbers and code snippets.`;

        // Build conversation history from previous messages
        const conversationMessages = aiMessages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .slice(-10) // Last 10 messages for context
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // Get AI response using streaming
        let aiResponseContent = '';
        let aiReasoningContent = '';
        let isCollectingReasoning = false;
        const aiResponseId = crypto.randomUUID();
        activeResponseId = aiResponseId;

        // Add initial AI message
        const aiMessage: AIMessage = {
          id: aiResponseId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
        addAiMessage(aiMessage);

        const generationSession = aiService.createGenerationSession();
        generationSessionId = generationSession.id;
        streamStartedAt = Date.now();
        activeSessionRef.current = {
          sessionId: generationSession.id,
          responseMessageId: aiResponseId,
        };
        cancellationReasonsRef.current.delete(generationSession.id);
        emitGenerationTelemetry('stream_started', {
          session_id: generationSession.id,
          model: typeof aiService.getModel === 'function' ? aiService.getModel() : 'unknown',
        });

        // Stream the response
        const fullContextRequest: AIContextRequest = {
          userQuery: message,
          systemPrompt,
          messages: [...conversationMessages, { role: 'user' as const, content: message }],
          relatedFiles: [],
          workspaceContext: wsCtx,
          conversationHistory: [],
          currentFile: currentFile ?? undefined,
          userActivity: {
            openFiles,
            sidebarOpen,
            previewOpen,
            aiChatOpen,
            recentFiles: openFiles.slice(0, 5).map(f => f.name),
            workspaceFolder,
          },
          ...contextRequest,
          signal: generationSession.signal,
        };

        for await (const chunk of aiService.sendContextualMessageStream(fullContextRequest)) {
          if (
            !isMountedRef.current ||
            activeSessionRef.current?.sessionId !== generationSession.id
          ) {
            break;
          }
          streamedChunkCount += 1;

          // Check if this is reasoning content
          if (chunk.startsWith('[REASONING] ') && chunk.endsWith('[/REASONING]')) {
            aiReasoningContent += chunk.slice(12, -12);
          } else if (chunk.startsWith('[REASONING] ')) {
            isCollectingReasoning = true;
            aiReasoningContent += chunk.substring(12); // Remove [REASONING] prefix
          } else if (isCollectingReasoning && chunk === '[/REASONING]') {
            isCollectingReasoning = false;
          } else if (isCollectingReasoning) {
            aiReasoningContent += chunk;
          } else {
            aiResponseContent += chunk;
          }

          // Use startTransition to mark streaming updates as non-urgent (improves performance)
          startTransition(() => {
            if (
              !isMountedRef.current ||
              activeSessionRef.current?.sessionId !== generationSession.id
            ) {
              return;
            }
            setAiMessages(prev => {
              return prev.map(msg => {
                if (msg.id === aiResponseId) {
                  const updatedMsg: AIMessage = {
                    ...msg,
                    content: aiResponseContent,
                    ...(aiReasoningContent ? { reasoning_content: aiReasoningContent } : {}),
                  };
                  return updatedMsg;
                }
                return msg;
              });
            });
          });
        }

        if (generationSession.signal.aborted) {
          const cancelReason =
            cancellationReasonsRef.current.get(generationSession.id) ?? 'unknown';
          streamCancelled = true;
          emitGenerationTelemetry('stream_cancelled', {
            session_id: generationSession.id,
            reason: cancelReason,
            result_status: 'aborted',
            chunk_count: streamedChunkCount,
            duration_ms: Date.now() - streamStartedAt,
          });
          if (cancellationLifecycleEnabled) {
            markResponseCancelled(aiResponseId);
          }
          if (activeRequestTokenRef.current === requestToken) {
            setAiResponseState(cancellationLifecycleEnabled ? 'cancelled' : 'idle');
          }
          return;
        }

        emitGenerationTelemetry('stream_completed', {
          session_id: generationSession.id,
          result_status: 'completed',
          chunk_count: streamedChunkCount,
          response_char_count: aiResponseContent.length,
          duration_ms: Date.now() - streamStartedAt,
        });

        // Check for multi-file edit patterns in the AI response
        if (onMultiFileEditDetected && aiResponseContent) {
          const detector = new MultiFileEditDetector();
          const result = detector.detect(aiResponseContent);
          if (result.detected && result.plan && result.changes) {
            logger.info('[useAIChat] Multi-file edit detected, triggering approval panel');
            onMultiFileEditDetected(result.plan, result.changes);
          }
        }

        // Response is complete (no need to mark anything since we don't have isTyping)
      } catch (error) {
        if (isAbortError(error)) {
          logger.info('[useAIChat] Generation cancelled');
          const cancelReason =
            (generationSessionId && cancellationReasonsRef.current.get(generationSessionId)) ??
            'unknown';
          if (!streamCancelled) {
            emitGenerationTelemetry('stream_cancelled', {
              session_id: generationSessionId ?? 'unknown',
              reason: cancelReason,
              result_status: 'abort_error',
              chunk_count: streamedChunkCount,
              duration_ms: Date.now() - streamStartedAt,
            });
          }
          if (activeResponseId && cancellationLifecycleEnabled) {
            markResponseCancelled(activeResponseId);
          }
          if (activeRequestTokenRef.current === requestToken) {
            setAiResponseState(cancellationLifecycleEnabled ? 'cancelled' : 'idle');
          }
          return;
        }

        logger.error('AI chat error:', error);
        setAiResponseState('error');
        emitGenerationTelemetry('stream_error', {
          session_id: generationSessionId ?? 'unknown',
          result_status: 'error',
          error_name: error instanceof Error ? error.name : 'unknown_error',
          duration_ms: Date.now() - streamStartedAt,
        });

        // Add error message
        const detail = error instanceof Error ? error.message : 'Unknown error';
        const quotaError = /\b(429|402)\b|insufficient balance|quota/i.test(detail);
        const hint = quotaError
          ? 'The provider account is out of credit — check Settings > API Keys or switch model.'
          : detail.includes('API key')
            ? 'Please add your API key in Settings > API Keys.'
            : 'Please try again.';
        const errorMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${detail}. ${hint}`,
          timestamp: new Date(),
        };
        addAiMessage(errorMessage);

        onError?.(error as Error);
      } finally {
        if (generationSessionId) {
          aiService.completeGenerationSession(generationSessionId);
          cancellationReasonsRef.current.delete(generationSessionId);
          if (activeSessionRef.current?.sessionId === generationSessionId) {
            activeSessionRef.current = null;
          }
        }

        if (isMountedRef.current && activeRequestTokenRef.current === requestToken) {
          setIsAiResponding(false);
          setAiResponseState(prev =>
            prev === 'streaming' || prev === 'cancelling' ? 'idle' : prev
          );
        }
      }
    },
    [
      aiService,
      currentFile,
      workspaceContext,
      addAiMessage,
      onError,
      openFiles,
      workspaceFolder,
      sidebarOpen,
      previewOpen,
      aiMessages,
      aiChatOpen,
      cancelAiResponseWithReason,
      cancellationLifecycleEnabled,
      emitGenerationTelemetry,
      markResponseCancelled,
      onMultiFileEditDetected,
    ]
  );

  return {
    aiMessages,
    aiChatOpen,
    isAiResponding,
    aiResponseState,
    setAiChatOpen,
    handleSendMessage,
    cancelAiResponse,
    clearAiMessages,
    addAiMessage,
    updateAiMessage,
  };
}
