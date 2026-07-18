import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isCancellationLifecycleEnabled } from '../../config/aiRolloutFlags';
import { useAIChat } from '../../hooks/useAIChat';
import { entitlementsService } from '../../services/EntitlementsService';
import { telemetry } from '../../services/TelemetryService';
import type { UnifiedAIService } from '../../services/ai/UnifiedAIService';
import type { AIContextRequest, AIMessage, AgentTask } from '../../types';

vi.mock('../../services/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/EntitlementsService', () => ({
  entitlementsService: {
    getCurrentPlan: vi.fn(() => 'pro'),
  },
}));

vi.mock('../../config/aiRolloutFlags', () => ({
  isCancellationLifecycleEnabled: vi.fn(() => true),
}));

vi.mock('../../services/TelemetryService', () => ({
  telemetry: {
    trackEvent: vi.fn(),
    trackError: vi.fn(),
  },
}));

function createAbortError(): Error {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
}

function createMockAIService() {
  const sessions = new Map<string, AbortController>();
  let sessionCounter = 0;

  const createGenerationSession = vi.fn(() => {
    const id = `session-${++sessionCounter}`;
    const controller = new AbortController();
    sessions.set(id, controller);
    return { id, signal: controller.signal };
  });

  const cancelGenerationSession = vi.fn((sessionId: string) => {
    const controller = sessions.get(sessionId);
    if (!controller) {
      return false;
    }

    controller.abort();
    sessions.delete(sessionId);
    return true;
  });

  const completeGenerationSession = vi.fn((sessionId: string) => {
    sessions.delete(sessionId);
  });

  const sendContextualMessageStream = vi.fn(async function* (
    context: AIContextRequest
  ): AsyncGenerator<string, void, unknown> {
    const query = context.userQuery ?? '';

    if (query === 'first message' || query === 'manual cancel') {
      yield `${query}:chunk`;
      await new Promise<void>((_resolve, reject) => {
        const signal = context.signal;
        if (!signal) {
          return;
        }

        if (signal.aborted) {
          reject(createAbortError());
          return;
        }

        signal.addEventListener('abort', () => reject(createAbortError()), { once: true });
      });
      return;
    }

    if (query === 'trigger error') {
      throw new Error('Simulated stream failure');
    }

    yield `reply:${query}`;
  });

  const service = {
    createGenerationSession,
    cancelGenerationSession,
    completeGenerationSession,
    sendContextualMessageStream,
  } as unknown as UnifiedAIService;

  return {
    service,
    createGenerationSession,
    cancelGenerationSession,
    completeGenerationSession,
    sendContextualMessageStream,
  };
}

describe('useAIChat cancellation lifecycle', () => {
  beforeEach(() => {
    window.electron = undefined;
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(entitlementsService.getCurrentPlan).mockReturnValue('pro');
    vi.mocked(isCancellationLifecycleEnabled).mockReturnValue(true);
  });

  it('hydrates the exact native terminal report before persisting desktop chat history', async () => {
    const task: AgentTask = {
      id: 'task-reload-1',
      title: 'Reload verification',
      description: 'Verify the terminal result after reload.',
      userRequest: 'Verify reload',
      steps: [],
      status: 'in_progress',
      createdAt: new Date('2026-07-12T05:00:00.000Z'),
    };
    const storedMessages: AIMessage[] = [
      {
        id: 'agent-task-reload-1',
        role: 'assistant',
        content: '**Agent Task**: Reload verification\n\nStale plan text',
        timestamp: new Date('2026-07-12T05:00:00.000Z'),
        agentTask: { task, phase: 'executing' },
      },
    ];
    const storeSet = vi.fn().mockResolvedValue(undefined);
    window.electron = {
      store: {
        get: vi.fn().mockResolvedValue(JSON.stringify(storedMessages)),
        set: storeSet,
        delete: vi.fn().mockResolvedValue(undefined),
      },
      db: {
        getAgentChatOutcomes: vi.fn().mockResolvedValue({
          success: true,
          data: [
            {
              taskId: task.id,
              outcome: 'completed',
              finalReport: 'Concrete persisted report. LIVE-REPORT-7319',
              createdAt: '2026-07-12T05:01:00.000Z',
            },
          ],
        }),
      },
    } as Window['electron'];

    const mockService = createMockAIService();
    const { result } = renderHook(() => useAIChat({ aiService: mockService.service }));

    await waitFor(() => {
      expect(result.current.aiMessages[0]?.content).toContain(
        'Concrete persisted report. LIVE-REPORT-7319'
      );
    });
    expect(result.current.aiMessages[0]?.agentTask?.task.finalReport).toBe(
      'Concrete persisted report. LIVE-REPORT-7319'
    );
    expect(result.current.aiMessages[0]?.agentTask?.phase).toBe('completed');
    expect(storeSet).not.toHaveBeenCalledWith(
      'vibe-code-studio:chat-messages',
      expect.stringContaining('Welcome to Vibe Code Studio')
    );
  });

  it('auto-cancels an active generation before starting a new one', async () => {
    const mockService = createMockAIService();
    const { result } = renderHook(() => useAIChat({ aiService: mockService.service }));

    await act(async () => {
      void result.current.handleSendMessage('first message');
    });

    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(true);
      expect(result.current.aiResponseState).toBe('streaming');
    });

    await act(async () => {
      await result.current.handleSendMessage('second message');
    });

    expect(mockService.cancelGenerationSession).toHaveBeenCalledWith('session-1');
    await waitFor(() => {
      expect(result.current.aiResponseState).toBe('idle');
      expect(result.current.isAiResponding).toBe(false);
      expect(
        result.current.aiMessages.some(msg => msg.content.includes('Generation cancelled'))
      ).toBe(true);
      expect(
        result.current.aiMessages.some(msg => msg.content.includes('reply:second message'))
      ).toBe(true);
    });
  });

  it('supports manual cancellation through cancelAiResponse()', async () => {
    const mockService = createMockAIService();
    const { result } = renderHook(() => useAIChat({ aiService: mockService.service }));

    await act(async () => {
      void result.current.handleSendMessage('manual cancel');
    });

    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(true);
    });

    act(() => {
      result.current.cancelAiResponse();
    });

    expect(mockService.cancelGenerationSession).toHaveBeenCalledWith('session-1');
    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(false);
      expect(result.current.aiResponseState).toBe('cancelled');
    });
  });

  it('falls back to legacy cancellation state when lifecycle flag is disabled', async () => {
    vi.mocked(isCancellationLifecycleEnabled).mockReturnValue(false);
    const mockService = createMockAIService();
    const { result } = renderHook(() => useAIChat({ aiService: mockService.service }));

    await act(async () => {
      void result.current.handleSendMessage('manual cancel');
    });

    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(true);
    });

    act(() => {
      result.current.cancelAiResponse();
    });

    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(false);
      expect(result.current.aiResponseState).toBe('idle');
      expect(
        result.current.aiMessages.some(msg => msg.content.includes('_Generation cancelled._'))
      ).toBe(false);
    });
  });

  it('cancels active generation when the chat is closed', async () => {
    const mockService = createMockAIService();
    const { result } = renderHook(() => useAIChat({ aiService: mockService.service }));

    await act(async () => {
      void result.current.handleSendMessage('manual cancel');
    });

    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(true);
    });

    act(() => {
      result.current.setAiChatOpen(false);
    });

    expect(mockService.cancelGenerationSession).toHaveBeenCalledWith('session-1');
    expect(result.current.aiChatOpen).toBe(false);
  });

  it('aborts active generation on unmount to avoid stale updates', async () => {
    const mockService = createMockAIService();
    const { result, unmount } = renderHook(() => useAIChat({ aiService: mockService.service }));

    await act(async () => {
      void result.current.handleSendMessage('manual cancel');
    });

    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(true);
    });

    unmount();

    expect(mockService.cancelGenerationSession).toHaveBeenCalledWith('session-1');
  });

  it('emits telemetry for start, cancel, complete, and error lifecycles', async () => {
    const mockService = createMockAIService();
    const { result } = renderHook(() => useAIChat({ aiService: mockService.service }));

    await act(async () => {
      void result.current.handleSendMessage('manual cancel');
    });
    await waitFor(() => {
      expect(result.current.isAiResponding).toBe(true);
    });

    act(() => {
      result.current.cancelAiResponse();
    });
    await waitFor(() => {
      expect(result.current.aiResponseState).toBe('cancelled');
    });

    await act(async () => {
      await result.current.handleSendMessage('second message');
    });
    await waitFor(() => {
      expect(result.current.aiResponseState).toBe('idle');
    });

    await act(async () => {
      await result.current.handleSendMessage('trigger error');
    });
    await waitFor(() => {
      expect(result.current.aiResponseState).toBe('error');
    });

    const eventNames = vi.mocked(telemetry.trackEvent).mock.calls.map(([event]) => event);
    expect(eventNames).toEqual(
      expect.arrayContaining([
        'generation_request_started',
        'stream_started',
        'stream_cancel_requested',
        'stream_cancelled',
        'stream_completed',
        'stream_error',
      ])
    );
  });
});

describe('useAIChat error-message hints', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(entitlementsService.getCurrentPlan).mockReturnValue('pro');
    vi.mocked(isCancellationLifecycleEnabled).mockReturnValue(true);
  });

  function createThrowingService(error: unknown): UnifiedAIService {
    return {
      createGenerationSession: vi.fn(() => ({
        id: 'session-err',
        signal: new AbortController().signal,
      })),
      cancelGenerationSession: vi.fn(() => false),
      completeGenerationSession: vi.fn(),
      sendContextualMessageStream: vi.fn(async function* (): AsyncGenerator<string, void, unknown> {
        yield 'partial ';
        throw error;
      }),
    } as unknown as UnifiedAIService;
  }

  async function sendAndGetLastMessage(error: unknown): Promise<string> {
    const service = createThrowingService(error);
    const { result } = renderHook(() => useAIChat({ aiService: service }));

    await act(async () => {
      await result.current.handleSendMessage('boom');
    });
    await waitFor(() => {
      expect(result.current.aiResponseState).toBe('error');
    });

    const last = result.current.aiMessages[result.current.aiMessages.length - 1];
    return last?.content ?? '';
  }

  it('shows the out-of-credit hint for a 429 quota error', async () => {
    const content = await sendAndGetLastMessage(new Error('AI proxy error (429): rate limited'));
    expect(content).toContain('AI proxy error (429): rate limited');
    expect(content).toContain('out of credit');
    expect(content).toContain('check Settings > API Keys or switch model');
  });

  it('shows the out-of-credit hint for an insufficient-balance (402) error', async () => {
    const content = await sendAndGetLastMessage(
      new Error('AI proxy error (402): insufficient balance')
    );
    expect(content).toContain('out of credit');
  });

  it('shows the API-key hint when the error mentions an API key', async () => {
    const content = await sendAndGetLastMessage(new Error('No API key configured for provider'));
    expect(content).toContain('Please add your API key in Settings > API Keys.');
    expect(content).not.toContain('out of credit');
  });

  it('falls back to the generic retry hint for non-Error throws', async () => {
    const content = await sendAndGetLastMessage('string failure');
    expect(content).toContain('Sorry, I encountered an error: Unknown error');
    expect(content).toContain('Please try again.');
  });

  it('uses the generic retry hint for ordinary errors without quota/key markers', async () => {
    const content = await sendAndGetLastMessage(new Error('socket hang up'));
    expect(content).toContain('socket hang up');
    expect(content).toContain('Please try again.');
    expect(content).not.toContain('out of credit');
  });
});
