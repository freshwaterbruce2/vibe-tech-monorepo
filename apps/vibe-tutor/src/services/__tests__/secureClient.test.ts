import type { HttpResponse } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    post: vi.fn(),
    request: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/config', () => ({
  BLAKE_CONFIG: {
    apiEndpoint: 'http://localhost:3001',
    endpoints: {
      chat: '/api/chat',
      session: '/api/session/init',
      health: '/api/health',
    },
  },
}));

vi.mock('@/utils/electronStore', () => ({
  sessionStore: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocks are set up
import type { ChatOptions, DeepSeekMessage } from '@/types';
import { sessionStore } from '@/utils/electronStore';
import { createChatCompletion, secureClient } from '../secureClient';

describe('SecureAPIClient', () => {
  const mockSessionResponse: HttpResponse = {
    url: '',
    status: 200,
    headers: {},
    data: {
      token: 'test-session-token',
      expiresIn: 3600, // 1 hour
    },
  };

  const mockChatResponse: HttpResponse = {
    url: '',
    status: 200,
    headers: {},
    data: {
      choices: [
        {
          message: {
            content: 'This is a test response from AI',
          },
        },
      ],
    },
  };

  const mockMessages: DeepSeekMessage[] = [{ role: 'user', content: 'Hello AI' }];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine to true by default
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    // Reset secureClient instance state (clear any previous session)
    (secureClient as any).sessionToken = null;
    (secureClient as any).tokenExpiry = 0;
    // Default: No stored session (returns null)
    vi.mocked(sessionStore.get).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Initialization', () => {
    it('initializes session and stores token', async () => {
      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockChatResponse);

      await secureClient.chatCompletion(mockMessages);

      // Verify session init was called
      expect(CapacitorHttp.post).toHaveBeenCalledWith({
        url: 'http://localhost:3001/api/session/init',
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });

      // Verify token was stored
      expect(sessionStore.set).toHaveBeenCalledWith('vibetutor_session', 'test-session-token');
      expect(sessionStore.set).toHaveBeenCalledWith('vibetutor_expiry', expect.any(String));
    });

    it('restores valid token from storage', async () => {
      const futureExpiry = Date.now() + 3600000; // 1 hour from now

      // Clear default mock and set up token restoration
      vi.mocked(sessionStore.get).mockReset();
      vi.mocked(sessionStore.get)
        .mockReturnValueOnce('stored-token') // vibetutor_session (first call in ensureValidSession)
        .mockReturnValueOnce(String(futureExpiry)); // vibetutor_expiry (second call)

      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockChatResponse);

      await secureClient.chatCompletion(mockMessages);

      // Should NOT call session init (token restored from storage)
      expect(CapacitorHttp.post).not.toHaveBeenCalled();

      // Should use stored token for chat
      expect(CapacitorHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer stored-token',
          }),
        }),
      );
    });

    it('reinitializes session when stored token is expired', async () => {
      const pastExpiry = Date.now() - 1000; // 1 second ago

      // Clear default mock and set up expired token
      vi.mocked(sessionStore.get).mockReset();
      vi.mocked(sessionStore.get)
        .mockReturnValueOnce('expired-token') // vibetutor_session
        .mockReturnValueOnce(String(pastExpiry)); // vibetutor_expiry (expired)

      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockChatResponse);

      await secureClient.chatCompletion(mockMessages);

      // Should call session init (token expired)
      expect(CapacitorHttp.post).toHaveBeenCalledTimes(1);
      expect(CapacitorHttp.post).toHaveBeenCalledWith({
        url: 'http://localhost:3001/api/session/init',
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });
    });
  });

  describe('Chat Completion', () => {
    beforeEach(async () => {
      // Set up valid session for all chat completion tests
      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
    });

    it('sends chat completion request successfully', async () => {
      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockChatResponse);

      const result = await secureClient.chatCompletion(mockMessages);

      expect(CapacitorHttp.request).toHaveBeenCalledWith({
        url: 'http://localhost:3001/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-session-token',
        },
        data: expect.objectContaining({
          messages: mockMessages,
        }),
        connectTimeout: 30000,
        readTimeout: 30000,
      });

      expect(result).toEqual(mockChatResponse.data);
    });

    it('uses custom options when provided', async () => {
      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockChatResponse);

      const options: ChatOptions = {
        model: 'gpt-4',
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 2000,
      };

      await secureClient.chatCompletion(mockMessages, options);

      expect(CapacitorHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            model: 'gpt-4',
            temperature: 0.8,
            top_p: 0.95,
            max_tokens: 2000,
            options: expect.objectContaining({
              model: 'gpt-4',
              temperature: 0.8,
              top_p: 0.95,
              max_tokens: 2000,
            }),
          }),
        }),
      );
    });
  });

  describe('402 Paid Model Fallback', () => {
    beforeEach(() => {
      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
    });

    it('retries with openrouter/free after 402 from paid model', async () => {
      const paymentRequired: HttpResponse = {
        url: '',
        status: 402,
        headers: {},
        data: { error: 'Payment Required' },
      };

      vi.mocked(CapacitorHttp.request)
        .mockResolvedValueOnce(paymentRequired)
        .mockResolvedValueOnce(mockChatResponse);

      const result = await secureClient.chatCompletion(mockMessages, {
        model: 'deepseek/deepseek-v3.2',
        retryCount: 2,
      });

      expect(result).toEqual(mockChatResponse.data);
      expect(CapacitorHttp.request).toHaveBeenCalledTimes(2);

      const secondRequest = vi.mocked(CapacitorHttp.request).mock.calls[1]?.[0];
      expect(secondRequest?.data?.model).toBe('openrouter/free');
      expect(secondRequest?.data?.options?.model).toBe('openrouter/free');
    });
  });

  describe('401 Session Expiry Handling', () => {
    it('reinitializes session on 401 and retries', async () => {
      const expired401Response: HttpResponse = {
        url: '',
        status: 401,
        headers: {},
        data: { error: 'Session expired' },
      };

      // Initial session init succeeds
      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
      // First request fails with 401
      vi.mocked(CapacitorHttp.request).mockResolvedValueOnce(expired401Response);
      // Retry request succeeds
      vi.mocked(CapacitorHttp.request).mockResolvedValueOnce(mockChatResponse);

      const result = await secureClient.chatCompletion(mockMessages);

      // Verify session was initialized + reinitialized (2 calls total)
      expect(CapacitorHttp.post).toHaveBeenCalledTimes(2);

      // Verify request was retried with new token
      expect(CapacitorHttp.request).toHaveBeenCalledTimes(2);

      expect(result).toEqual(mockChatResponse.data);
    });
  });

  describe('429 Rate Limit Handling', () => {
    beforeEach(() => {
      // Set up valid session for rate limit tests
      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
    });

    it('waits retryAfter seconds on 429 and retries', async () => {
      const rateLimitResponse: HttpResponse = {
        url: '',
        status: 429,
        headers: {},
        data: { error: 'Rate limit exceeded', retryAfter: 1 }, // 1 second wait
      };

      vi.useFakeTimers();

      // First request fails with 429
      vi.mocked(CapacitorHttp.request).mockResolvedValueOnce(rateLimitResponse);
      // Retry succeeds
      vi.mocked(CapacitorHttp.request).mockResolvedValueOnce(mockChatResponse);

      const resultPromise = secureClient.chatCompletion(mockMessages);

      // Fast-forward 1 second
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result).toEqual(mockChatResponse.data);
      expect(CapacitorHttp.request).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('fails after max retries on persistent 429', async () => {
      const rateLimitResponse: HttpResponse = {
        url: '',
        status: 429,
        headers: {},
        data: { error: 'Rate limit exceeded', retryAfter: 1 },
      };

      vi.useFakeTimers();

      // All requests fail with 429
      vi.mocked(CapacitorHttp.request).mockResolvedValue(rateLimitResponse);

      const resultPromise = secureClient.chatCompletion(mockMessages, { retryCount: 3 });
      const expectation = expect(resultPromise).rejects.toThrow();

      // Fast-forward through all retries
      await vi.advanceTimersByTimeAsync(5000);

      await expectation;

      // Should have tried 3 times
      expect(CapacitorHttp.request).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  describe('Exponential Backoff on Errors', () => {
    beforeEach(() => {
      // Set up valid session for backoff tests
      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
    });

    it('retries with exponential backoff on network errors', async () => {
      vi.useFakeTimers();

      // First two attempts fail
      vi.mocked(CapacitorHttp.request)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockChatResponse);

      const resultPromise = secureClient.chatCompletion(mockMessages, { retryCount: 3 });

      // First backoff: 1 second (2^0 * 1000)
      await vi.advanceTimersByTimeAsync(1000);

      // Second backoff: 2 seconds (2^1 * 1000)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(result).toEqual(mockChatResponse.data);
      expect(CapacitorHttp.request).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('caps backoff at 10 seconds', async () => {
      vi.useFakeTimers();

      // Fail first 4 attempts
      vi.mocked(CapacitorHttp.request)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockChatResponse);

      const resultPromise = secureClient.chatCompletion(mockMessages, { retryCount: 5 });

      // Backoffs: 1s, 2s, 4s, 8s (should cap next at 10s)
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(10000); // Capped at 10s (not 16s)

      const result = await resultPromise;

      expect(result).toEqual(mockChatResponse.data);

      vi.useRealTimers();
    });

    it('throws error after all retries exhausted', async () => {
      const error = new Error('Persistent network error');

      // All attempts fail
      vi.mocked(CapacitorHttp.request).mockRejectedValue(error);

      await expect(secureClient.chatCompletion(mockMessages, { retryCount: 3 })).rejects.toThrow(
        'Persistent network error',
      );

      expect(CapacitorHttp.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('Health Check', () => {
    it('checks health endpoint successfully', async () => {
      const healthResponse: HttpResponse = {
        url: '',
        status: 200,
        headers: {},
        data: { status: 'healthy' },
      };

      vi.mocked(CapacitorHttp.get).mockResolvedValue(healthResponse);

      const result = await secureClient.healthCheck();

      expect(CapacitorHttp.get).toHaveBeenCalledWith({
        url: 'http://localhost:3001/api/health',
      });

      expect(result).toBe(true);
    });
  });

  describe('createChatCompletion Helper', () => {
    beforeEach(() => {
      vi.mocked(CapacitorHttp.post).mockResolvedValue(mockSessionResponse);
    });

    it('returns content from successful response', async () => {
      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockChatResponse);

      const result = await createChatCompletion(mockMessages);

      expect(result).toBe('This is a test response from AI');
    });

    it('returns fallback message when no content in response', async () => {
      const emptyResponse: HttpResponse = {
        url: '',
        status: 200,
        headers: {},
        data: {
          choices: [{ message: {} }],
        },
      };

      vi.mocked(CapacitorHttp.request).mockResolvedValue(emptyResponse);

      const result = await createChatCompletion(mockMessages, {
        fallbackMessage: 'Custom fallback',
      });

      expect(result).toBe('Custom fallback');
    });

    it('returns default fallback when no content and no custom fallback', async () => {
      const emptyResponse: HttpResponse = {
        url: '',
        status: 200,
        headers: {},
        data: {
          choices: [{ message: {} }],
        },
      };

      vi.mocked(CapacitorHttp.request).mockResolvedValue(emptyResponse);

      const result = await createChatCompletion(mockMessages);

      expect(result).toBe(null);
    });

    it('returns offline message when not connected', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Set low retry count to prevent timeout
      vi.mocked(CapacitorHttp.request).mockRejectedValue(new Error('Network error'));

      const result = await createChatCompletion(mockMessages, { retryCount: 1 });

      expect(result).toBe(
        "I'm having trouble connecting right now. Please try again in a moment! 🔄",
      );
    });

    it('returns fallback message on error when online', async () => {
      // Set low retry count to prevent timeout
      vi.mocked(CapacitorHttp.request).mockRejectedValue(new Error('API error'));

      const result = await createChatCompletion(mockMessages, {
        fallbackMessage: 'Custom error message',
        retryCount: 1,
      });

      expect(result).toBe('Custom error message');
    });

    it('returns default error message when no custom fallback', async () => {
      // Set low retry count to prevent timeout
      vi.mocked(CapacitorHttp.request).mockRejectedValue(new Error('API error'));

      const result = await createChatCompletion(mockMessages, { retryCount: 1 });

      expect(result).toBe(
        "I'm having trouble connecting right now. Please try again in a moment! 🔄",
      );
    });
  });
});
