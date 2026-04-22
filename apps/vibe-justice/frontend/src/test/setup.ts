import '@testing-library/jest-dom'
import { vi } from 'vitest'

// React 19 compatibility: Mock react-dom/test-utils to use React's act
// React 19 moved `act` from react-dom/test-utils to react
// This mock makes @testing-library/react work with React 19
vi.mock('react-dom/test-utils', async () => {
  const React = await import('react')
  return {
    act: React.act,
  }
})

// Set the React act environment flag for proper testing behavior
// @ts-expect-error - React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Mock fetch globally for API tests
const mockFetch = vi.fn() as unknown as typeof fetch & ReturnType<typeof vi.fn>
global.fetch = mockFetch

// Default mock implementation
mockFetch.mockImplementation(async (url: string, _options?: RequestInit) => {
  const urlStr = url.toString()
  
  // Chat endpoint
  if (urlStr.includes('/api/chat/simple')) {
    return {
      ok: true,
      json: async () => ({
        content: 'Mock AI response for testing',
        reasoning: 'Mock reasoning process',
        model_used: 'deepseek-reasoner'
      })
    }
  }
  
  // Analysis endpoint
  if (urlStr.includes('/api/analysis/run')) {
    return {
      ok: true,
      json: async () => ({
        analysis_id: 'test-analysis-123',
        status: 'completed',
        results: {
          summary: 'Mock analysis summary',
          key_points: ['Point 1', 'Point 2', 'Point 3']
        }
      })
    }
  }

  // Cases list endpoint
  if (urlStr.includes('/api/cases/list')) {
    return {
      ok: true,
      json: async () => ([
        {
          case_id: 'test-case-001',
          name: 'Test Case',
          created_at: '2026-01-01T00:00:00Z',
          status: 'Active',
          jurisdiction: 'sc_unemployment',
          research_goals: 'Test goals',
          assigned_agent: 'LegalAssistant_V1',
          is_archived: false,
          archived_at: null
        }
      ])
    }
  }

  // Cases archive endpoint
  if (urlStr.includes('/api/cases/archive/')) {
    return {
      ok: true,
      json: async () => ({ status: 'success', message: 'Case archived' })
    }
  }

  // Cases restore endpoint
  if (urlStr.includes('/api/cases/restore/')) {
    return {
      ok: true,
      json: async () => ({ status: 'success', message: 'Case restored' })
    }
  }

  // Policy download endpoint (indexes document to knowledge base)
  if (urlStr.includes('/api/policy/download')) {
    return {
      ok: true,
      json: async () => ({
        success: true,
        message: 'Document indexed successfully',
        document_id: 'doc-test-123',
        chunks_indexed: 5
      })
    }
  }

  // Policy search endpoint
  if (urlStr.includes('/api/policy/search')) {
    return {
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'policy-1',
            title: 'Test Policy Document',
            snippet: 'Test policy content snippet',
            url: 'https://example.com/policy.pdf',
            source: 'walmart',
            relevanceScore: 0.95
          }
        ]
      })
    }
  }
  
  // Health endpoint
  if (urlStr.includes('/api/health')) {
    return {
      ok: true,
      json: async () => ({
        status: 'healthy',
        timestamp: new Date().toISOString()
      })
    }
  }
  
  // Default response
  return {
    ok: false,
    status: 404,
    json: async () => ({ error: 'Not found' })
  }
})

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('mocked'),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(null),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn().mockResolvedValue(''),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

// Export mock for use in tests
export { mockFetch }
