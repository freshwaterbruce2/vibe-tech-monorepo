import { useState, useCallback, useRef } from 'react';
import {
  Message,
  ChatResponse,
  legalChat,
  analyzeLegalDocument,
  performLegalReasoning,
  summarizeCaseDocument,
  analyzeInterrogation,
  generateStrategy,
  LEGAL_MODELS
} from '@/services/openrouter';

export interface UseOpenRouterOptions {
  initialMessages?: Message[];
  model?: keyof typeof LEGAL_MODELS;
  onError?: (error: Error) => void;
}

export interface UseOpenRouterReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  analyzeLegalDoc: (documentText: string, context?: string) => Promise<string>;
  performReasoning: (caseDescription: string, question: string) => Promise<string>;
  summarizeDoc: (documentText: string, maxLength?: number) => Promise<string>;
  analyzeInterrogationTranscript: (
    transcript: string,
    focus?: 'inconsistencies' | 'timeline' | 'credibility' | 'all'
  ) => Promise<string>;
  createStrategy: (caseDetails: string, objective: string) => Promise<string>;
}

/**
 * React hook for OpenRouter legal AI functionality
 * 
 * Usage:
 * ```tsx
 * const { messages, isLoading, sendMessage, analyzeLegalDoc } = useOpenRouter();
 * 
 * // Chat
 * await sendMessage("What are the key issues in this case?");
 * 
 * // Document analysis
 * const analysis = await analyzeLegalDoc(documentText);
 * ```
 */
export function useOpenRouter(options: UseOpenRouterOptions = {}): UseOpenRouterReturn {
  const { initialMessages = [], onError } = options;
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track conversation history for chat
  const conversationHistoryRef = useRef<Message[]>(initialMessages);

  /**
   * Send a chat message
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content: content.trim()
    };

    // Add user message to UI
    setMessages(prev => [...prev, userMessage]);
    conversationHistoryRef.current = [...conversationHistoryRef.current, userMessage];

    try {
      const response: ChatResponse = await legalChat(content, conversationHistoryRef.current);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.choices[0]?.message?.content || 'No response received.'
      };

      // Add assistant message to UI
      setMessages(prev => [...prev, assistantMessage]);
      conversationHistoryRef.current = [...conversationHistoryRef.current, assistantMessage];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Analyze legal document (wrapper for service function)
   */
  const analyzeLegalDoc = useCallback(async (
    documentText: string,
    context?: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      return await analyzeLegalDocument(documentText, context);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Perform legal reasoning (wrapper for service function)
   */
  const performReasoning = useCallback(async (
    caseDescription: string,
    question: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      return await performLegalReasoning(caseDescription, question);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reasoning failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Summarize document (wrapper for service function)
   */
  const summarizeDoc = useCallback(async (
    documentText: string,
    maxLength: number = 500
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      return await summarizeCaseDocument(documentText, maxLength);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Summarization failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Analyze interrogation transcript (wrapper for service function)
   */
  const analyzeInterrogationTranscript = useCallback(async (
    transcript: string,
    focus: 'inconsistencies' | 'timeline' | 'credibility' | 'all' = 'all'
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      return await analyzeInterrogation(transcript, focus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Interrogation analysis failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Generate legal strategy (wrapper for service function)
   */
  const createStrategy = useCallback(async (
    caseDetails: string,
    objective: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      return await generateStrategy(caseDetails, objective);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Strategy generation failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Clear conversation messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationHistoryRef.current = [];
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    analyzeLegalDoc,
    performReasoning,
    summarizeDoc,
    analyzeInterrogationTranscript,
    createStrategy
  };
}
