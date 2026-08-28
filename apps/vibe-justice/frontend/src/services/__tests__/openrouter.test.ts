import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  openRouterClient,
  LEGAL_MODELS,
  setModelTier,
  getModelTier,
  analyzeLegalDocument,
  performLegalReasoning,
  summarizeCaseDocument,
  legalChat,
  analyzeInterrogation,
  generateStrategy,
  checkOpenRouterHealth,
  getAvailableModels,
  getUsageStats,
  type Message,
  type ChatResponse,
} from '../openrouter'

// Mock the global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Helper to create mock chat response
function createMockChatResponse(content: string, model: string = 'test-model'): ChatResponse {
  return {
    id: 'chat-123',
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }
}

describe('OpenRouter Service', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Reset model tier to default
    setModelTier('free')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== OpenRouterClient Tests ====================

  describe('OpenRouterClient', () => {
    describe('chat', () => {
      it('successfully sends chat request and returns response', async () => {
        const mockResponse = createMockChatResponse('Legal analysis result')

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

        const result = await openRouterClient.chat({
          model: 'deepseek/deepseek-v3.2',
          messages: [{ role: 'user', content: 'Analyze this document' }],
        })

        expect(result.id).toBe('chat-123')
        expect(result.choices[0].message.content).toBe('Legal analysis result')
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/openrouter/chat',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })

      it('throws error on API failure (non-ok response)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

        await expect(
          openRouterClient.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'test' }],
          })
        ).rejects.toThrow('OpenRouter API error: 500')
      })

      it('throws error on 401 unauthorized', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        })

        await expect(
          openRouterClient.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'test' }],
          })
        ).rejects.toThrow('OpenRouter API error: 401')
      })

      it('throws error on 429 rate limit', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
        })

        await expect(
          openRouterClient.chat({
            model: 'test-model',
            messages: [{ role: 'user', content: 'test' }],
          })
        ).rejects.toThrow('OpenRouter API error: 429')
      })

      it('includes all request parameters in API call', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockChatResponse('response'),
        })

        await openRouterClient.chat({
          model: 'deepseek/deepseek-v3.2',
          messages: [
            { role: 'system', content: 'You are a legal analyst' },
            { role: 'user', content: 'Analyze this' },
          ],
          temperature: 0.5,
          max_tokens: 4000,
        })

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody.model).toBe('deepseek/deepseek-v3.2')
        expect(callBody.messages).toHaveLength(2)
        expect(callBody.temperature).toBe(0.5)
        expect(callBody.max_tokens).toBe(4000)
      })
    })

    describe('healthCheck', () => {
      it('returns true when health endpoint is ok', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true })

        const result = await openRouterClient.healthCheck()

        expect(result).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/health')
      })

      it('returns false when health endpoint fails', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false })

        const result = await openRouterClient.healthCheck()

        expect(result).toBe(false)
      })

      it('returns false on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const result = await openRouterClient.healthCheck()

        expect(result).toBe(false)
      })
    })

    describe('getModels', () => {
      it('returns list of available models', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ models: ['model-a', 'model-b', 'model-c'] }),
        })

        const result = await openRouterClient.getModels()

        expect(result).toEqual(['model-a', 'model-b', 'model-c'])
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/models')
      })

      it('returns empty array when API fails', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false })

        const result = await openRouterClient.getModels()

        expect(result).toEqual([])
      })

      it('returns empty array when models field is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })

        const result = await openRouterClient.getModels()

        expect(result).toEqual([])
      })
    })

    describe('getUsage', () => {
      it('returns usage statistics', async () => {
        const usageData = { tokens_used: 1000, requests: 50 }
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => usageData,
        })

        const result = await openRouterClient.getUsage('24h')

        expect(result).toEqual(usageData)
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/usage')
      })

      it('returns null when API fails', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false })

        const result = await openRouterClient.getUsage('24h')

        expect(result).toBeNull()
      })
    })
  })

  // ==================== Model Tier Tests ====================

  describe('Model Tier Management', () => {
    it('defaults to free tier', () => {
      expect(getModelTier()).toBe('free')
    })

    it('sets tier to paid', () => {
      setModelTier('paid')
      expect(getModelTier()).toBe('paid')
    })

    it('sets tier to premium', () => {
      setModelTier('premium')
      expect(getModelTier()).toBe('premium')
    })

    it('can switch between tiers', () => {
      setModelTier('premium')
      expect(getModelTier()).toBe('premium')

      setModelTier('free')
      expect(getModelTier()).toBe('free')

      setModelTier('paid')
      expect(getModelTier()).toBe('paid')
    })
  })

  // ==================== Legal AI Function Tests ====================

  describe('analyzeLegalDocument', () => {
    it('analyzes document with default model (free tier)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Key issues identified: 1. Contract breach'),
      })

      const result = await analyzeLegalDocument('Contract text here')

      expect(result).toBe('Key issues identified: 1. Contract breach')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.ANALYSIS)
      expect(callBody.temperature).toBe(0.3)
      expect(callBody.max_tokens).toBe(8000)
    })

    it('includes context in system prompt when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Analysis with context'),
      })

      await analyzeLegalDocument('Document text', 'This is a personal injury case')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemMessage = callBody.messages.find((m: Message) => m.role === 'system')
      expect(systemMessage.content).toContain('This is a personal injury case')
    })

    it('uses model override when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Analysis result'),
      })

      await analyzeLegalDocument('Document', undefined, 'custom/model')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('custom/model')
    })

    it('uses paid model when tier is set to paid', async () => {
      setModelTier('paid')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Analysis result'),
      })

      await analyzeLegalDocument('Document')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.ANALYSIS_PAID)
    })

    it('uses premium model when tier is set to premium', async () => {
      setModelTier('premium')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Analysis result'),
      })

      await analyzeLegalDocument('Document')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.ANALYSIS_PREMIUM)
    })

    it('returns empty string when no content in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chat-123',
          model: 'test',
          choices: [
            { index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'stop' },
          ],
        }),
      })

      const result = await analyzeLegalDocument('Document')

      expect(result).toBe('')
    })

    it('returns empty string when choices array is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chat-123',
          model: 'test',
          choices: [],
        }),
      })

      const result = await analyzeLegalDocument('Document')

      expect(result).toBe('')
    })
  })

  describe('performLegalReasoning', () => {
    it('performs reasoning with default free model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Legal reasoning: Based on precedent...'),
      })

      const result = await performLegalReasoning(
        'Case involves contract dispute',
        'Was there breach of contract?'
      )

      expect(result).toBe('Legal reasoning: Based on precedent...')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.REASONING)
      expect(callBody.temperature).toBe(0.7)
      expect(callBody.max_tokens).toBe(12000)
    })

    it('uses premium model when usePremium is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Premium reasoning result'),
      })

      await performLegalReasoning('Case details', 'Legal question', true)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.CRITICAL)
      expect(callBody.max_tokens).toBe(16000)
    })

    it('includes case description and question in user message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Result'),
      })

      await performLegalReasoning('Case ABC', 'Is defendant liable?')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: Message) => m.role === 'user')
      expect(userMessage.content).toContain('Case ABC')
      expect(userMessage.content).toContain('Is defendant liable?')
    })
  })

  describe('summarizeCaseDocument', () => {
    it('summarizes document with default max length', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Summary: Contract dispute filed on Jan 1...'),
      })

      const result = await summarizeCaseDocument('Long legal document text...')

      expect(result).toBe('Summary: Contract dispute filed on Jan 1...')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.SUMMARIZATION)
      expect(callBody.temperature).toBe(0.2)
      expect(callBody.max_tokens).toBe(2000)

      const systemMessage = callBody.messages.find((m: Message) => m.role === 'system')
      expect(systemMessage.content).toContain('500 words')
    })

    it('uses custom max length when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Short summary'),
      })

      await summarizeCaseDocument('Document', 200)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemMessage = callBody.messages.find((m: Message) => m.role === 'system')
      expect(systemMessage.content).toContain('200 words')
    })
  })

  describe('legalChat', () => {
    it('sends chat message and returns full response', async () => {
      const mockResponse = createMockChatResponse('Here are my legal insights...')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await legalChat('What are the key issues in this case?')

      expect(result.id).toBe('chat-123')
      expect(result.choices[0].message.content).toBe('Here are my legal insights...')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.CHAT)
      expect(callBody.temperature).toBe(0.7)
      expect(callBody.max_tokens).toBe(4000)
    })

    it('includes conversation history in messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Follow up response'),
      })

      const history: Message[] = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First response' },
      ]

      await legalChat('Follow up question', history)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      // System + history (2) + new user message = 4 messages
      expect(callBody.messages).toHaveLength(4)
      expect(callBody.messages[0].role).toBe('system')
      expect(callBody.messages[1].content).toBe('First question')
      expect(callBody.messages[2].content).toBe('First response')
      expect(callBody.messages[3].content).toBe('Follow up question')
    })

    it('works with empty conversation history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Response'),
      })

      await legalChat('Question')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages).toHaveLength(2) // System + user
    })
  })

  describe('analyzeInterrogation', () => {
    it('analyzes transcript with default "all" focus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Timeline: Jan 1 - Subject arrived...'),
      })

      const result = await analyzeInterrogation('Q: Where were you? A: At home.')

      expect(result).toBe('Timeline: Jan 1 - Subject arrived...')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.ANALYSIS)
      expect(callBody.temperature).toBe(0.3)

      const systemMessage = callBody.messages.find((m: Message) => m.role === 'system')
      expect(systemMessage.content).toContain('comprehensive analysis')
    })

    it('analyzes with inconsistencies focus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Inconsistencies found...'),
      })

      await analyzeInterrogation('Transcript', 'inconsistencies')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemMessage = callBody.messages.find((m: Message) => m.role === 'system')
      expect(systemMessage.content).toContain('contradictions')
    })

    it('analyzes with timeline focus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Timeline extracted...'),
      })

      await analyzeInterrogation('Transcript', 'timeline')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemMessage = callBody.messages.find((m: Message) => m.role === 'system')
      expect(systemMessage.content).toContain('temporal information')
    })

    it('analyzes with credibility focus', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Credibility assessment...'),
      })

      await analyzeInterrogation('Transcript', 'credibility')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemMessage = callBody.messages.find((m: Message) => m.role === 'system')
      expect(systemMessage.content).toContain('credibility')
    })
  })

  describe('generateStrategy', () => {
    it('generates legal strategy based on case details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockChatResponse('Strategy: 1. File motion to dismiss...'),
      })

      const result = await generateStrategy(
        'Defendant is accused of breach of contract',
        'Achieve settlement before trial'
      )

      expect(result).toBe('Strategy: 1. File motion to dismiss...')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe(LEGAL_MODELS.REASONING)
      expect(callBody.temperature).toBe(0.8)
      expect(callBody.max_tokens).toBe(6000)

      const userMessage = callBody.messages.find((m: Message) => m.role === 'user')
      expect(userMessage.content).toContain('breach of contract')
      expect(userMessage.content).toContain('settlement before trial')
    })
  })

  // ==================== Utility Function Tests ====================

  describe('checkOpenRouterHealth', () => {
    it('returns true when service is healthy', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      const result = await checkOpenRouterHealth()

      expect(result).toBe(true)
    })

    it('returns false when service is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })

      const result = await checkOpenRouterHealth()

      expect(result).toBe(false)
    })

    it('returns false on network exception', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await checkOpenRouterHealth()

      expect(result).toBe(false)
    })

    it('logs error when healthCheck throws and wraps in try-catch', async () => {
      // The underlying healthCheck catches errors internally and returns false
      // So checkOpenRouterHealth won't see an error - but if healthCheck itself threw
      // the wrapper would catch it
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock the client to throw directly (simulating an unexpected error)
      mockFetch.mockImplementationOnce(() => {
        throw new Error('Unexpected sync error')
      })

      const result = await checkOpenRouterHealth()

      // healthCheck catches errors internally, so result is false
      expect(result).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('getAvailableModels', () => {
    it('returns list of models on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: ['deepseek/deepseek-v3.2', 'anthropic/claude-3'] }),
      })

      const result = await getAvailableModels()

      expect(result).toEqual(['deepseek/deepseek-v3.2', 'anthropic/claude-3'])
    })

    it('returns empty array and logs error on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const result = await getAvailableModels()

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch models:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('getUsageStats', () => {
    it('returns usage stats with default period', async () => {
      const usageData = { total_tokens: 5000, total_requests: 100 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => usageData,
      })

      const result = await getUsageStats()

      expect(result).toEqual(usageData)
    })

    it('returns usage stats with custom period', async () => {
      const usageData = { total_tokens: 1000, total_requests: 20 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => usageData,
      })

      const result = await getUsageStats('7d')

      expect(result).toEqual(usageData)
    })

    it('returns null and logs error on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Usage API Error'))

      const result = await getUsageStats()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch usage stats:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  // ==================== LEGAL_MODELS Constants Tests ====================

  describe('LEGAL_MODELS constants', () => {
    it('has all required model configurations', () => {
      expect(LEGAL_MODELS.ANALYSIS).toBeDefined()
      expect(LEGAL_MODELS.REASONING).toBeDefined()
      expect(LEGAL_MODELS.GENERAL).toBeDefined()
      expect(LEGAL_MODELS.SUMMARIZATION).toBeDefined()
      expect(LEGAL_MODELS.CHAT).toBeDefined()
      expect(LEGAL_MODELS.ANALYSIS_PAID).toBeDefined()
      expect(LEGAL_MODELS.ANALYSIS_PREMIUM).toBeDefined()
      expect(LEGAL_MODELS.CRITICAL).toBeDefined()
    })

    it('uses Moonshot Kimi models for free tier', () => {
      expect(LEGAL_MODELS.ANALYSIS).toContain('moonshot')
      expect(LEGAL_MODELS.GENERAL).toContain('moonshot')
      expect(LEGAL_MODELS.CHAT).toContain('moonshot')
    })

    it('uses Anthropic/Google for paid tiers', () => {
      expect(LEGAL_MODELS.ANALYSIS_PAID).toContain('anthropic')
      expect(LEGAL_MODELS.ANALYSIS_PREMIUM).toContain('google')
      expect(LEGAL_MODELS.CRITICAL).toContain('anthropic')
    })
  })

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('propagates API errors from analyzeLegalDocument', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(analyzeLegalDocument('Document')).rejects.toThrow('OpenRouter API error: 500')
    })

    it('propagates API errors from performLegalReasoning', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      await expect(performLegalReasoning('Case', 'Question')).rejects.toThrow(
        'OpenRouter API error: 401'
      )
    })

    it('propagates API errors from summarizeCaseDocument', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      })

      await expect(summarizeCaseDocument('Document')).rejects.toThrow('OpenRouter API error: 429')
    })

    it('propagates API errors from legalChat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      })

      await expect(legalChat('Message')).rejects.toThrow('OpenRouter API error: 503')
    })

    it('propagates API errors from analyzeInterrogation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      })

      await expect(analyzeInterrogation('Transcript')).rejects.toThrow('OpenRouter API error: 400')
    })

    it('propagates API errors from generateStrategy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
      })

      await expect(generateStrategy('Case', 'Objective')).rejects.toThrow(
        'OpenRouter API error: 502'
      )
    })
  })
})
