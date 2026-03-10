import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMoodAnalysis, sendMessageToBuddy } from '../buddyService';
import { learningAnalytics } from '../learningAnalytics';
import * as secureClient from '../secureClient';
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

describe('buddyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Allow requests
    vi.mocked(usageMonitor.canMakeRequest).mockReturnValue({ allowed: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMessageToBuddy', () => {
    it('checks usage limits before making request', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Test response');

      await sendMessageToBuddy('Hello');

      expect(usageMonitor.canMakeRequest).toHaveBeenCalled();
    });

    it('returns rate limit message when usage limit exceeded', async () => {
      vi.mocked(usageMonitor.canMakeRequest).mockReturnValue({
        allowed: false,
        reason: 'Daily limit reached. Try again tomorrow.',
      });

      const response = await sendMessageToBuddy('Hello');

      expect(response).toBe('Daily limit reached. Try again tomorrow.');
      expect(secureClient.createChatCompletion).not.toHaveBeenCalled();
    });

    it('sends message with correct AI model and default options', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('AI response');

      await sendMessageToBuddy("I'm feeling anxious");

      expect(secureClient.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: "I'm feeling anxious" }),
        ]),
        expect.objectContaining({
          model: 'deepseek-chat',
          temperature: 0.8,
          top_p: 0.95,
          useReasoning: false,
        }),
      );
    });

    it('enables reasoning mode when useReasoning parameter is true', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('AI response');

      await sendMessageToBuddy('Help me understand algebra', true);

      expect(secureClient.createChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          useReasoning: true,
        }),
      );
    });

    it('includes system prompt with AI Buddy personality', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('AI response');

      await sendMessageToBuddy('First message');

      const callArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[0];
      expect(callArgs).toBeDefined();
      const messages = callArgs?.[0] ?? [];

      expect(messages[0]).toEqual(
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('AI buddy'), // Verify buddy system prompt (lowercase)
        }),
      );
    });

    it('returns AI response on success', async () => {
      const mockResponse = 'I understand how you feel. Let me help...';
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(mockResponse);

      const response = await sendMessageToBuddy("I'm stressed about homework");

      expect(response).toBe(mockResponse);
    });

    it('returns fallback message when AI response is empty', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);

      const response = await sendMessageToBuddy('Hello');

      expect(response).toBe(
        "Sorry, I'm having a little trouble connecting right now. Let's talk later.",
      );
    });

    it('logs analytics for successful AI calls', async () => {
      const mockResponse = 'This is a supportive response';
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(mockResponse);

      await sendMessageToBuddy('Test message');

      expect(learningAnalytics.logAICall).toHaveBeenCalledWith(
        'deepseek-chat',
        expect.any(Number), // Input tokens
        mockResponse.length, // Output tokens
        expect.any(Number), // Duration
      );
    });

    it('does not log analytics when AI call fails', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);

      await sendMessageToBuddy('Test message');

      expect(learningAnalytics.logAICall).not.toHaveBeenCalled();
    });

    it('records request in usage monitor after successful call', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('AI response');

      await sendMessageToBuddy('Test message');

      expect(usageMonitor.recordRequest).toHaveBeenCalled();
    });

    it('maintains conversation history across multiple messages', async () => {
      vi.mocked(secureClient.createChatCompletion)
        .mockResolvedValueOnce('First response')
        .mockResolvedValueOnce('Second response');

      await sendMessageToBuddy('How are you?');
      await sendMessageToBuddy("I'm doing well!");

      const secondCallArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[1];
      expect(secondCallArgs).toBeDefined();
      const messages = secondCallArgs?.[0] ?? [];

      // Check the LAST 4 messages (to handle accumulated history from other tests)
      const lastFour = messages.slice(-4);

      expect(lastFour[0]).toEqual({ role: 'user', content: 'How are you?' });
      expect(lastFour[1]).toEqual({ role: 'assistant', content: 'First response' });
      expect(lastFour[2]).toEqual({ role: 'user', content: "I'm doing well!" });

      // Verify system prompt is first in overall history
      expect(messages[0]?.role).toBe('system');
    });

    it('handles errors gracefully with fallback message', async () => {
      vi.mocked(secureClient.createChatCompletion).mockRejectedValue(new Error('Network error'));

      const response = await sendMessageToBuddy('Test message');

      expect(response).toBe(
        "Sorry, I'm having a little trouble connecting right now. Let's talk later.",
      );
    });

    it('logs errors to console when exception occurs', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('API failure');
      vi.mocked(secureClient.createChatCompletion).mockRejectedValue(testError);

      await sendMessageToBuddy('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('Error sending message to buddy:', testError);

      consoleSpy.mockRestore();
    });

    it('tracks request duration for analytics', async () => {
      vi.mocked(secureClient.createChatCompletion).mockImplementation(
        async () => new Promise((resolve) => setTimeout(() => resolve('Response'), 100)),
      );

      await sendMessageToBuddy('Test message');

      const analyticsCall = vi.mocked(learningAnalytics.logAICall).mock.calls[0];
      expect(analyticsCall).toBeDefined();
      const duration = analyticsCall?.[3] ?? 0;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(1000);
    });

    it('handles multiple consecutive messages correctly', async () => {
      vi.mocked(secureClient.createChatCompletion)
        .mockResolvedValueOnce('Response 1')
        .mockResolvedValueOnce('Response 2')
        .mockResolvedValueOnce('Response 3');

      await sendMessageToBuddy('Message 1');
      await sendMessageToBuddy('Message 2');
      await sendMessageToBuddy('Message 3');

      expect(secureClient.createChatCompletion).toHaveBeenCalledTimes(3);
      expect(usageMonitor.recordRequest).toHaveBeenCalledTimes(3);
      expect(learningAnalytics.logAICall).toHaveBeenCalledTimes(3);
    });

    it('includes assistant response in history even when AI call fails', async () => {
      vi.mocked(secureClient.createChatCompletion)
        .mockResolvedValueOnce(null) // First call fails
        .mockResolvedValueOnce('Second response'); // Second call succeeds

      await sendMessageToBuddy('Test message');
      await sendMessageToBuddy('Follow-up message');

      const secondCallArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[1];
      expect(secondCallArgs).toBeDefined();
      const messages = secondCallArgs?.[0] ?? [];

      // Find the fallback message in the last few messages
      const lastMessages = messages.slice(-4);
      const fallbackMessage = lastMessages.find(
        (msg) =>
          msg.role === 'assistant' &&
          msg.content ===
            "Sorry, I'm having a little trouble connecting right now. Let's talk later.",
      );

      // Should include fallback message in history
      expect(fallbackMessage).toBeDefined();
      expect(fallbackMessage?.role).toBe('assistant');
    });

    it('calculates input tokens based on conversation history length', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Response');

      const longMessage = 'a'.repeat(1000);
      await sendMessageToBuddy(longMessage);

      const analyticsCall = vi.mocked(learningAnalytics.logAICall).mock.calls[0];
      expect(analyticsCall).toBeDefined();
      const inputTokens = analyticsCall?.[1] ?? 0;

      expect(inputTokens).toBeGreaterThan(1000);
    });
  });

  describe('getMoodAnalysis', () => {
    it('generates supportive reflection for mood without note', async () => {
      const mockResponse = 'It sounds like you are feeling happy. That is wonderful!';
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(mockResponse);

      const response = await getMoodAnalysis('happy');

      expect(response).toBe(mockResponse);
      expect(secureClient.createChatCompletion).toHaveBeenCalledWith(
        [
          {
            role: 'user',
            content: expect.stringContaining('A user has logged their mood as "happy"'),
          },
        ],
        expect.objectContaining({
          model: 'deepseek-chat',
          temperature: 0.7,
          max_tokens: 100,
        }),
      );
    });

    it('includes optional note in mood analysis prompt', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Supportive message');

      await getMoodAnalysis('anxious', 'I have a test tomorrow');

      const callArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs?.[0]?.[0]?.content ?? '';

      expect(prompt).toContain('anxious');
      expect(prompt).toContain('I have a test tomorrow');
    });

    it('returns fallback message when AI call fails', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);

      const response = await getMoodAnalysis('sad');

      expect(response).toBe("It's okay to feel your feelings. Be kind to yourself today.");
    });

    it('handles errors gracefully with fallback message', async () => {
      vi.mocked(secureClient.createChatCompletion).mockRejectedValue(new Error('Network error'));

      const response = await getMoodAnalysis('stressed');

      expect(response).toBe("It's okay to feel your feelings. Be kind to yourself today.");
    });

    it('logs analytics for successful mood analysis', async () => {
      const mockResponse = 'Gentle supportive message';
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(mockResponse);

      await getMoodAnalysis('tired', 'Long day at school');

      expect(learningAnalytics.logAICall).toHaveBeenCalledWith(
        'deepseek-chat',
        expect.any(Number), // Prompt length
        mockResponse.length, // Response length
        expect.any(Number), // Duration
      );
    });

    it('does not log analytics when mood analysis fails', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue(null);

      await getMoodAnalysis('happy');

      expect(learningAnalytics.logAICall).not.toHaveBeenCalled();
    });

    it('logs errors to console when exception occurs', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('API failure');
      vi.mocked(secureClient.createChatCompletion).mockRejectedValue(testError);

      await getMoodAnalysis('anxious');

      expect(consoleSpy).toHaveBeenCalledWith('Error getting mood analysis:', testError);

      consoleSpy.mockRestore();
    });

    it('limits response tokens to 100 for brief reflection', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Brief message');

      await getMoodAnalysis('excited');

      expect(secureClient.createChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          max_tokens: 100,
        }),
      );
    });

    it('requests brief 2-3 sentence responses in prompt', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Response');

      await getMoodAnalysis('calm');

      const callArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs?.[0]?.[0]?.content ?? '';

      expect(prompt).toContain('short (2-3 sentences)');
    });

    it('instructs AI not to give medical advice', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Response');

      await getMoodAnalysis('depressed', 'Feeling down lately');

      const callArgs = vi.mocked(secureClient.createChatCompletion).mock.calls[0];
      expect(callArgs).toBeDefined();
      const prompt = callArgs?.[0]?.[0]?.content ?? '';

      expect(prompt).toContain('Do not give medical advice');
    });

    it('tracks request duration for mood analysis', async () => {
      vi.mocked(secureClient.createChatCompletion).mockImplementation(
        async () => new Promise((resolve) => setTimeout(() => resolve('Response'), 50)),
      );

      await getMoodAnalysis('happy');

      const analyticsCall = vi.mocked(learningAnalytics.logAICall).mock.calls[0];
      expect(analyticsCall).toBeDefined();
      const duration = analyticsCall?.[3] ?? 0;

      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(500);
    });

    it('does not call usage monitor for mood analysis', async () => {
      vi.mocked(secureClient.createChatCompletion).mockResolvedValue('Response');

      await getMoodAnalysis('happy');

      // Mood analysis is quick and doesn't count against usage limits
      expect(usageMonitor.canMakeRequest).not.toHaveBeenCalled();
      expect(usageMonitor.recordRequest).not.toHaveBeenCalled();
    });
  });
});
