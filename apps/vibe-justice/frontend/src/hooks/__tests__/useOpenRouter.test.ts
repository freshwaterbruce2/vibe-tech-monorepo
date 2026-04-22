import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOpenRouter } from '../useOpenRouter';
import * as openrouterService from '@/services/openrouter';
import type { ChatResponse, Message } from '@/services/openrouter';

// Mock the OpenRouter service
vi.mock('@/services/openrouter', () => ({
  legalChat: vi.fn(),
  analyzeLegalDocument: vi.fn(),
  performLegalReasoning: vi.fn(),
  summarizeCaseDocument: vi.fn(),
  analyzeInterrogation: vi.fn(),
  generateStrategy: vi.fn(),
  LEGAL_MODELS: {
    'deepseek-r1': { name: 'DeepSeek R1', reasoning: true },
    'deepseek-chat': { name: 'DeepSeek Chat', reasoning: false }
  }
}));

describe('useOpenRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('successfully sends a chat message and updates conversation', async () => {
      const mockResponse: ChatResponse = {
        id: 'chat-123',
        model: 'deepseek-r1',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Here is the analysis of your case...'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };

      vi.mocked(openrouterService.legalChat).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useOpenRouter());

      await act(async () => {
        await result.current.sendMessage('What are the key issues?');
      });

      expect(openrouterService.legalChat).toHaveBeenCalledWith(
        'What are the key issues?',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'What are the key issues?'
          })
        ])
      );

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual({
        role: 'user',
        content: 'What are the key issues?'
      });
      expect(result.current.messages[1]).toEqual({
        role: 'assistant',
        content: 'Here is the analysis of your case...'
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles empty or whitespace-only messages gracefully', async () => {
      const { result } = renderHook(() => useOpenRouter());

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(openrouterService.legalChat).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(0);
    });

    it('handles chat API errors and calls onError callback', async () => {
      const mockError = new Error('API rate limit exceeded');
      const onErrorMock = vi.fn();

      vi.mocked(openrouterService.legalChat).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() =>
        useOpenRouter({ onError: onErrorMock })
      );

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('API rate limit exceeded');
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages).toHaveLength(1); // Only user message
    });

    it('handles response with no content gracefully', async () => {
      const mockResponse: ChatResponse = {
        id: 'chat-456',
        model: 'deepseek-chat',
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10
        }
      };

      vi.mocked(openrouterService.legalChat).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useOpenRouter());

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toEqual({
        role: 'assistant',
        content: 'No response received.'
      });
    });
  });

  describe('analyzeLegalDoc', () => {
    it('successfully analyzes a legal document', async () => {
      const mockAnalysis = 'This document contains 3 key violations...';

      vi.mocked(openrouterService.analyzeLegalDocument).mockResolvedValueOnce(mockAnalysis);

      const { result } = renderHook(() => useOpenRouter());

      let analysis: string = '';
      await act(async () => {
        analysis = await result.current.analyzeLegalDoc('Document text here', 'Employment law context');
      });

      expect(openrouterService.analyzeLegalDocument).toHaveBeenCalledWith(
        'Document text here',
        'Employment law context'
      );
      expect(analysis).toBe(mockAnalysis);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles document analysis errors and throws', async () => {
      const mockError = new Error('Document too large');
      const onErrorMock = vi.fn();

      vi.mocked(openrouterService.analyzeLegalDocument).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() =>
        useOpenRouter({ onError: onErrorMock })
      );

      await act(async () => {
        await expect(
          result.current.analyzeLegalDoc('Large document')
        ).rejects.toThrow('Document too large');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Document too large');
      });

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('performReasoning', () => {
    it('successfully performs legal reasoning', async () => {
      const mockReasoning = 'Based on precedent X, the likely outcome is...';

      vi.mocked(openrouterService.performLegalReasoning).mockResolvedValueOnce(mockReasoning);

      const { result } = renderHook(() => useOpenRouter());

      let reasoning: string = '';
      await act(async () => {
        reasoning = await result.current.performReasoning(
          'Unemployment claim denied',
          'What are the grounds for appeal?'
        );
      });

      expect(openrouterService.performLegalReasoning).toHaveBeenCalledWith(
        'Unemployment claim denied',
        'What are the grounds for appeal?'
      );
      expect(reasoning).toBe(mockReasoning);
      expect(result.current.isLoading).toBe(false);
    });

    it('handles reasoning errors', async () => {
      const mockError = new Error('Reasoning timeout');

      vi.mocked(openrouterService.performLegalReasoning).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useOpenRouter());

      await act(async () => {
        await expect(
          result.current.performReasoning('Case details', 'Question')
        ).rejects.toThrow('Reasoning timeout');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Reasoning timeout');
      });
    });
  });

  describe('summarizeDoc', () => {
    it('successfully summarizes a document with default length', async () => {
      const mockSummary = 'This 50-page document discusses employment discrimination...';

      vi.mocked(openrouterService.summarizeCaseDocument).mockResolvedValueOnce(mockSummary);

      const { result } = renderHook(() => useOpenRouter());

      let summary: string = '';
      await act(async () => {
        summary = await result.current.summarizeDoc('Long document text...');
      });

      expect(openrouterService.summarizeCaseDocument).toHaveBeenCalledWith(
        'Long document text...',
        500 // Default maxLength
      );
      expect(summary).toBe(mockSummary);
    });

    it('successfully summarizes with custom max length', async () => {
      const mockSummary = 'Brief summary in 200 words...';

      vi.mocked(openrouterService.summarizeCaseDocument).mockResolvedValueOnce(mockSummary);

      const { result } = renderHook(() => useOpenRouter());

      await act(async () => {
        await result.current.summarizeDoc('Document', 200);
      });

      expect(openrouterService.summarizeCaseDocument).toHaveBeenCalledWith('Document', 200);
    });
  });

  describe('analyzeInterrogationTranscript', () => {
    it('successfully analyzes interrogation transcript with default focus', async () => {
      const mockAnalysis = 'Found 3 inconsistencies in timeline...';

      vi.mocked(openrouterService.analyzeInterrogation).mockResolvedValueOnce(mockAnalysis);

      const { result } = renderHook(() => useOpenRouter());

      let analysis: string = '';
      await act(async () => {
        analysis = await result.current.analyzeInterrogationTranscript('Q: Where were you? A: ...');
      });

      expect(openrouterService.analyzeInterrogation).toHaveBeenCalledWith(
        'Q: Where were you? A: ...',
        'all' // Default focus
      );
      expect(analysis).toBe(mockAnalysis);
    });

    it('successfully analyzes with specific focus', async () => {
      const mockAnalysis = 'Timeline analysis shows...';

      vi.mocked(openrouterService.analyzeInterrogation).mockResolvedValueOnce(mockAnalysis);

      const { result } = renderHook(() => useOpenRouter());

      await act(async () => {
        await result.current.analyzeInterrogationTranscript('Transcript', 'timeline');
      });

      expect(openrouterService.analyzeInterrogation).toHaveBeenCalledWith('Transcript', 'timeline');
    });
  });

  describe('createStrategy', () => {
    it('successfully generates a legal strategy', async () => {
      const mockStrategy = 'Step 1: File motion for discovery\nStep 2: Depose witnesses...';

      vi.mocked(openrouterService.generateStrategy).mockResolvedValueOnce(mockStrategy);

      const { result } = renderHook(() => useOpenRouter());

      let strategy: string = '';
      await act(async () => {
        strategy = await result.current.createStrategy(
          'Employment discrimination case',
          'Win summary judgment'
        );
      });

      expect(openrouterService.generateStrategy).toHaveBeenCalledWith(
        'Employment discrimination case',
        'Win summary judgment'
        );
      expect(strategy).toBe(mockStrategy);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearMessages', () => {
    it('clears all messages and conversation history', async () => {
      const mockResponse: ChatResponse = {
        id: 'chat-789',
        model: 'deepseek-r1',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20
        }
      };

      vi.mocked(openrouterService.legalChat).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useOpenRouter());

      // Send a message to create conversation
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(result.current.messages).toHaveLength(2);

      // Clear messages
      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('initialMessages option', () => {
    it('initializes hook with provided messages', () => {
      const initialMessages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const { result } = renderHook(() =>
        useOpenRouter({ initialMessages })
      );

      expect(result.current.messages).toEqual(initialMessages);
    });
  });

  describe('loading state management', () => {
    it('sets isLoading to true during API calls and false after', async () => {
      const mockAnalysis = 'Analysis result';

      vi.mocked(openrouterService.analyzeLegalDocument).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAnalysis), 100))
      );

      const { result } = renderHook(() => useOpenRouter());

      expect(result.current.isLoading).toBe(false);

      let analysisPromise: Promise<string>;
      act(() => {
        analysisPromise = result.current.analyzeLegalDoc('Document');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        await analysisPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
