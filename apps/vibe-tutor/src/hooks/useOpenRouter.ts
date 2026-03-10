// React hook for OpenRouter chat functionality (MOBILE-OPTIMIZED)
import { useState, useCallback, useEffect } from 'react';
import type { Message, ChatResponse } from '../services/openrouter';
import { openRouterClient } from '../services/openrouter';

export interface UseOpenRouterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface UseOpenRouterReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  resetConversation: () => void;
}

/**
 * React hook for managing OpenRouter chat conversations
 * Mobile-optimized with offline detection and graceful error handling
 */
export function useOpenRouter(options: UseOpenRouterOptions = {}): UseOpenRouterReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    model = 'deepseek/deepseek-v3.2',
    temperature = 0.7,
    maxTokens = 1000,
    systemPrompt
  } = options;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) {
      setError('Message cannot be empty');
      return;
    }

    // Check if offline before sending
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Include system prompt if provided
      const chatMessages: Message[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages, userMessage]
        : [...messages, userMessage];

      const response: ChatResponse = await openRouterClient.chat({
        model,
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens
      });

      const assistantContent = response.choices[0]?.message?.content ?? 'No response received.';
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('[useOpenRouter] Error:', err);

      // Remove user message on error for cleaner UX
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [messages, model, temperature, maxTokens, systemPrompt]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    isOnline,
    sendMessage,
    clearMessages,
    resetConversation
  };
}

/**
 * Hook for simple one-off questions without conversation history
 * Mobile-optimized with offline detection
 */
export function useOpenRouterQuestion(options: UseOpenRouterOptions = {}) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    model = 'deepseek/deepseek-v3.2',
    temperature = 0.7,
    maxTokens = 500,
    systemPrompt
  } = options;

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const ask = useCallback(async (question: string) => {
    // Check if offline before asking
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const messages: Message[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }]
        : [{ role: 'user', content: question }];

      const response = await openRouterClient.chat({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      });

      const content = response.choices[0]?.message?.content ?? 'No response received.';
      setAnswer(content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get answer';
      setError(errorMessage);
      console.error('[useOpenRouterQuestion] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [model, temperature, maxTokens, systemPrompt]);

  return {
    answer,
    isLoading,
    error,
    isOnline,
    ask
  };
}
