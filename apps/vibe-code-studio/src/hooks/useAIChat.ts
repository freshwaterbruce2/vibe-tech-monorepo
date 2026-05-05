import { startTransition, useCallback, useEffect, useState } from 'react';

import { MultiFileEditDetector } from '../services/ai/MultiFileEditDetector';
import type { UnifiedAIService } from '../services/ai/UnifiedAIService';
import { logger } from '../services/Logger';
import type { AIContextRequest, AIMessage, EditorFile, WorkspaceContext } from '../types';
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

function loadPersistedMessages(): AIMessage[] {
  try {
    // Synchronous context — electron-store is async so localStorage is the only option here
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(raw) as Array<AIMessage & { timestamp: string }>;
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [WELCOME_MESSAGE];
  }
}

export interface UseAIChatReturn {
  aiMessages: AIMessage[];
  aiChatOpen: boolean;
  isAiResponding: boolean;
  setAiChatOpen: (open: boolean) => void;
  handleSendMessage: (message: string, contextRequest?: Partial<AIContextRequest>) => Promise<void>;
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
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(loadPersistedMessages);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);

  const addAiMessage = useCallback((message: AIMessage) => {
    // Use startTransition for non-urgent message additions (e.g., agent task updates)
    // Urgent messages (e.g., user messages) will skip this and update immediately
    const isUrgent = message.role === 'user';

    if (isUrgent) {
      setAiMessages((prev) => [...prev, message]);
    } else {
      startTransition(() => {
        setAiMessages((prev) => [...prev, message]);
      });
    }
  }, []);

  const updateAiMessage = useCallback(
    (messageId: string, updater: (msg: AIMessage) => AIMessage) => {
      // Use startTransition for non-urgent message updates (agent task step progress)
      startTransition(() => {
        setAiMessages((prev) => prev.map((msg) => (msg.id === messageId ? updater(msg) : msg)));
      });
    },
    [],
  );

  const clearAiMessages = useCallback(() => {
    setAiMessages([WELCOME_MESSAGE]);
    if (window.electron?.store) {
      void window.electron.store.delete(CHAT_STORAGE_KEY);
    } else {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, []);

  // Persist messages on every change — use electron-store in Electron, localStorage as web fallback
  useEffect(() => {
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
  }, [aiMessages]);

  const handleSendMessage = useCallback(
    async (message: string, contextRequest?: Partial<AIContextRequest>) => {
      // Add user message
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      addAiMessage(userMessage);

      setIsAiResponding(true);

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
          systemPrompt += `\n\n## Open Files\n${openFiles.map((f) => `- ${f.name}`).join('\n')}`;
        }

        systemPrompt += `\n\nWhen the user asks you to review, explain, or modify code, use the file contents above. Provide specific, actionable feedback referencing line numbers and code snippets.`;

        // Build conversation history from previous messages
        const conversationMessages = aiMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-10) // Last 10 messages for context
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        // Build context request with enhanced user activity
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
            recentFiles: openFiles.slice(0, 5).map((f) => f.name),
            workspaceFolder,
          },
          ...contextRequest,
        };

        // Get AI response using streaming
        let aiResponseContent = '';
        let aiReasoningContent = '';
        let isCollectingReasoning = false;
        const aiResponseId = crypto.randomUUID();

        // Add initial AI message
        const aiMessage: AIMessage = {
          id: aiResponseId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
        addAiMessage(aiMessage);

        // Stream the response
        for await (const chunk of aiService.sendContextualMessageStream(fullContextRequest)) {
          // Check if this is reasoning content
          if (chunk.startsWith('[REASONING] ')) {
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
            setAiMessages((prev) => {
              return prev.map((msg) => {
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
        logger.error('AI chat error:', error);

        // Add error message
        const errorMessage: AIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. ${
            error instanceof Error && error.message.includes('API key')
              ? 'Please add your API key in Settings > API Keys.'
              : 'Please try again.'
          }`,
          timestamp: new Date(),
        };
        addAiMessage(errorMessage);

        onError?.(error as Error);
      } finally {
        setIsAiResponding(false);
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
    ],
  );

  return {
    aiMessages,
    aiChatOpen,
    isAiResponding,
    setAiChatOpen,
    handleSendMessage,
    clearAiMessages,
    addAiMessage,
    updateAiMessage,
  };
}
