import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatResponse } from '../../services/openrouter';
import { useOpenRouter, useOpenRouterQuestion } from '../useOpenRouter';

// Mock openrouter service
vi.mock('../../services/openrouter', () => ({
  openRouterClient: {
    chat: vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'Hello from AI' } }],
    }),
  },
}));

import { openRouterClient } from '../../services/openrouter';

const mockedChat = vi.mocked(openRouterClient.chat);

describe('useOpenRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedChat.mockResolvedValue({
      choices: [{ message: { content: 'Hello from AI' } }],
    } as unknown as ChatResponse);
    // Ensure navigator.onLine returns true by default
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('should initialise with empty state', () => {
    const { result } = renderHook(() => useOpenRouter());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isOnline).toBe(true);
  });

  it('should send a message and receive a response', async () => {
    const { result } = renderHook(() => useOpenRouter());

    await act(async () => {
      await result.current.sendMessage('What is 2+2?');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'What is 2+2?' });
    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: 'Hello from AI' });
    expect(result.current.isLoading).toBe(false);
  });

  it('should include system prompt in messages when provided', async () => {
    const { result } = renderHook(() => useOpenRouter({ systemPrompt: 'You are a tutor' }));

    await act(async () => {
      await result.current.sendMessage('Help me');
    });

    const chatCall = mockedChat.mock.calls[0]![0];
    expect(chatCall.messages[0]).toEqual({ role: 'system', content: 'You are a tutor' });
  });

  it('should set error for empty messages', async () => {
    const { result } = renderHook(() => useOpenRouter());

    await act(async () => {
      await result.current.sendMessage('   ');
    });

    expect(result.current.error).toBe('Message cannot be empty');
    expect(result.current.messages).toHaveLength(0);
  });

  it('should set error when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOpenRouter());

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.error).toContain('No internet connection');
    expect(mockedChat).not.toHaveBeenCalled();
  });

  it('should handle API errors and rollback user message', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedChat.mockRejectedValue(new Error('API rate limit'));

    const { result } = renderHook(() => useOpenRouter());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).toBe('API rate limit');
    expect(result.current.messages).toHaveLength(0); // rolled back
    expect(result.current.isLoading).toBe(false);

    errorSpy.mockRestore();
  });

  it('should clear messages', async () => {
    const { result } = renderHook(() => useOpenRouter());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should reset conversation', async () => {
    const { result } = renderHook(() => useOpenRouter());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    act(() => {
      result.current.resetConversation();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass custom model options to API', async () => {
    const { result } = renderHook(() =>
      useOpenRouter({
        model: 'openai/gpt-4',
        temperature: 0.5,
        maxTokens: 2000,
      }),
    );

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(mockedChat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-4',
        temperature: 0.5,
        max_tokens: 2000,
      }),
    );
  });

  it('should handle missing response content gracefully', async () => {
    mockedChat.mockResolvedValue({
      choices: [{ message: {} }],
    } as unknown as ChatResponse);

    const { result } = renderHook(() => useOpenRouter());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.messages[1]!.content).toBe('No response received.');
  });
});

describe('useOpenRouterQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedChat.mockResolvedValue({
      choices: [{ message: { content: 'The answer is 4' } }],
    } as unknown as ChatResponse);
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('should initialise with null answer', () => {
    const { result } = renderHook(() => useOpenRouterQuestion());

    expect(result.current.answer).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should ask a question and get an answer', async () => {
    const { result } = renderHook(() => useOpenRouterQuestion());

    await act(async () => {
      await result.current.ask('What is 2+2?');
    });

    expect(result.current.answer).toBe('The answer is 4');
    expect(result.current.isLoading).toBe(false);
  });

  it('should include system prompt when asking', async () => {
    const { result } = renderHook(() =>
      useOpenRouterQuestion({ systemPrompt: 'Answer concisely' }),
    );

    await act(async () => {
      await result.current.ask('Hello?');
    });

    const chatCall = mockedChat.mock.calls[0]![0];
    expect(chatCall.messages[0]).toEqual({ role: 'system', content: 'Answer concisely' });
  });

  it('should set error when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOpenRouterQuestion());

    await act(async () => {
      await result.current.ask('Test');
    });

    expect(result.current.error).toContain('No internet connection');
  });

  it('should handle API error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedChat.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useOpenRouterQuestion());

    await act(async () => {
      await result.current.ask('Hello');
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.answer).toBeNull();

    errorSpy.mockRestore();
  });
});
