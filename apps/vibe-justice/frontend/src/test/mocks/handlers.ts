/**
 * Mock API handlers for testing
 * These are used with the vi.fn() mock in setup.ts
 */

export interface MockResponse {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
}

export const mockResponses = {
  chat: {
    content: 'Mock AI response for testing',
    reasoning: 'Mock reasoning process',
    model_used: 'deepseek-reasoner'
  },
  
  analysis: {
    analysis_id: 'test-analysis-123',
    status: 'completed',
    results: {
      summary: 'Mock analysis summary',
      key_points: ['Point 1', 'Point 2', 'Point 3']
    }
  },
  
  health: {
    status: 'healthy',
    timestamp: new Date().toISOString()
  },
  
  document: {
    document_id: 'test-doc-456',
    filename: 'test-document.pdf',
    status: 'uploaded'
  }
}

/**
 * Create a mock response helper
 */
export function createMockResponse<T>(data: T, ok = true, status = 200): MockResponse {
  return {
    ok,
    status,
    json: async () => data
  }
}

/**
 * Create an error response helper
 */
export function createErrorResponse(message: string, status = 500): MockResponse {
  return {
    ok: false,
    status,
    json: async () => ({ error: message })
  }
}
