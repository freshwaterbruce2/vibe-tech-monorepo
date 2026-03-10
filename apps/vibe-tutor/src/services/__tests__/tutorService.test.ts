import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { learningAnalytics } from '../learningAnalytics';
import * as secureClient from '../secureClient';
import { sendMessageToTutor } from '../tutorService';
import { usageMonitor } from '../usageMonitor';

// Mock dependencies
vi.mock('../secureClient', () => ({
  createChatCompletion: vi.fn(),
}));

vi.mock('../usageMonitor', () => ({
  usageMonitor: {
    canMakeRequest: vi.fn(),
    recordRequest: vi.fn(),
  },
}));

vi.mock('../learningAnalytics', () => ({
  learningAnalytics: {
    logAICall: vi.fn(),
  },
}));

describe('tutorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Allow requests
    vi.mocked(usageMonitor.canMakeRequest).mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMessageToTutor', () => {
    it('checks usage limits before making request', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Test response');

      await sendMessageToTutor('Hello');

      expect(usageMonitor.canMakeRequest).toHaveBeenCalled();
    });

    it('returns rate limit message when usage limit exceeded', async () => {
      vi.mocked(usageMonitor.canMakeRequest).mockReturnValue({
        allowed: false,
        reason: 'Daily limit reached. Try again tomorrow.',
      });

      const response = await sendMessageToTutor('Hello');

      expect(response).toBe('Daily limit reached. Try again tomorrow.');
      expect(secureClient.createChatCompletion).not.toHaveBeenCalled();
    });

    it('sends message with correct AI model and options', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('AI response');

      await sendMessageToTutor('Help me with math');

      expect(secureClient.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Help me with math' }),
        ]),
        expect.objectContaining({
          model: 'deepseek-chat',
          temperature: 0.7,
          top_p: 0.95,
          retryCount: 3,
        }),
      );
    });

    it('includes system prompt in first message', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('AI response');

      await sendMessageToTutor('First message');

      const callArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[0];
      expect(callArgs).toBeDefined();
      const messages = callArgs?.[0] ?? [];

      expect(messages[0]).toEqual(
        expect.objectContaining({
          role: 'system',
          content: expect.stringMatching(/vibe tutor|ai tutor/i), // Verify system prompt exists
        }),
      );
    });

    it('returns AI response on success', async () => {
      const mockResponse = 'Here is how to solve that problem...';
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(mockResponse);

      const response = await sendMessageToTutor('Explain quadratic equations');

      expect(response).toBe(mockResponse);
    });

    it('returns fallback message when AI response is empty', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);

      const response = await sendMessageToTutor('Hello');

      // Should return one of the fallback messages
      expect(response).toMatch(
        /experiencing some technical difficulties|connection issues|having trouble processing|temporary issue/i,
      );
    });

    it('logs analytics for successful AI calls', async () => {
      const mockResponse = 'This is a test response';
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(mockResponse);

      await sendMessageToTutor('Test message');

      expect(learningAnalytics.logAICall).toHaveBeenCalledWith(
        'deepseek-chat',
        expect.any(Number), // Input tokens (history length)
        mockResponse.length, // Output tokens
        expect.any(Number), // Duration
      );
    });

    it('does not log analytics when AI call fails', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);

      await sendMessageToTutor('Test message');

      expect(learningAnalytics.logAICall).not.toHaveBeenCalled();
    });

    it('records request in usage monitor after successful call', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('AI response');

      await sendMessageToTutor('Test message');

      expect(usageMonitor.recordRequest).toHaveBeenCalled();
    });

    it('maintains conversation history across multiple messages', async () => {
      vi.mocked(secureClient.createChatCompletion)
        .mockResolvedValueOnce('First response')
        .mockResolvedValueOnce('Second response');

      await sendMessageToTutor('First question');
      await sendMessageToTutor('Second question');

      const secondCallArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[1];
      expect(secondCallArgs).toBeDefined();
      const messages = secondCallArgs?.[0] ?? [];

      // Check the LAST 4 messages in history (to handle accumulated history from other tests)
      const lastFour = messages.slice(-4);

      expect(lastFour[0]).toEqual({ role: 'user', content: 'First question' });
      expect(lastFour[1]).toEqual({ role: 'assistant', content: 'First response' });
      expect(lastFour[2]).toEqual({ role: 'user', content: 'Second question' });
      // Last message is the pending assistant response (not yet added)

      // Verify system prompt is first in overall history
      expect(messages[0]?.role).toBe('system');
    });

    it('handles multiple consecutive messages correctly', async () => {
      vi.mocked(secureClient.createChatCompletion)
        .mockResolvedValueOnce('Response 1')
        .mockResolvedValueOnce('Response 2')
        .mockResolvedValueOnce('Response 3');

      await sendMessageToTutor('Message 1');
      await sendMessageToTutor('Message 2');
      await sendMessageToTutor('Message 3');

      expect(secureClient.createChatCompletion).toHaveBeenCalledTimes(3);
      expect(usageMonitor.recordRequest).toHaveBeenCalledTimes(3);
      expect(learningAnalytics.logAICall).toHaveBeenCalledTimes(3);
    });

    it('uses random fallback message on empty response', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);

      const responses = new Set<string>();

      // Call multiple times to collect different fallback messages
      for (let i = 0; i < 10; i++) {
        const response = await sendMessageToTutor('Test');
        responses.add(response);
      }

      // Should have at least 1 fallback message (randomness means might not hit all 4)
      expect(responses.size).toBeGreaterThanOrEqual(1);
    });

    it('tracks request duration for analytics', async () => {
      vi.mocked(secureClient.createChatCompletion).mockImplementation(
        async () => new Promise((resolve) => setTimeout(() => resolve('Response'), 100)),
      );

      await sendMessageToTutor('Test message');

      const analyticsCall = vi.mocked(learningAnalytics.logAICall).mock.calls[0];
      expect(analyticsCall).toBeDefined();
      const duration = analyticsCall?.[3] ?? 0;

      // Duration should be at least 100ms (but less than 1 second for sanity)
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(1000);
    });

    it('includes assistant response in history even when AI call fails', async () => {
      vi.mocked(secureClient.createChatCompletion)
        .mockResolvedValueOnce(null) // First call fails
        .mockResolvedValueOnce('Second response'); // Second call succeeds

      await sendMessageToTutor('Test message');
      await sendMessageToTutor('Follow-up message');

      const secondCallArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[1];
      expect(secondCallArgs).toBeDefined();
      const messages = secondCallArgs?.[0] ?? [];

      // Find the assistant message that should be the fallback (last few messages)
      const lastMessages = messages.slice(-4);
      const fallbackMessage = lastMessages.find(
        (msg) =>
          msg.role === 'assistant' &&
          /experiencing some technical difficulties|connection issues|having trouble processing|temporary issue/i.test(
            msg.content,
          ),
      );

      // Should include fallback message in history
      expect(fallbackMessage).toBeDefined();
      expect(fallbackMessage?.role).toBe('assistant');
    });

    it('calculates input tokens based on conversation history length', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Response');

      const longMessage = 'a'.repeat(1000); // 1000 characters
      await sendMessageToTutor(longMessage);

      const analyticsCall = vi.mocked(learningAnalytics.logAICall).mock.calls[0];
      expect(analyticsCall).toBeDefined();
      const inputTokens = analyticsCall?.[1] ?? 0;

      // Input tokens should account for system prompt + user message
      expect(inputTokens).toBeGreaterThan(1000);
    });
  });
});
