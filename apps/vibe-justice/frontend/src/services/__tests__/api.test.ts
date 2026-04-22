import { describe, it, expect, beforeEach, vi } from 'vitest'
import { justiceApi } from '../api'

// Mock the global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('uploadEvidence', () => {
    it('successfully uploads file with case ID', async () => {
      const mockFile = new File(['evidence content'], 'evidence.pdf', { type: 'application/pdf' })
      const caseId = 'case-123'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          evidence_id: 'evidence-456',
          filename: 'evidence.pdf',
          status: 'uploaded',
          case_id: caseId
        })
      })

      const result = await justiceApi.uploadEvidence(mockFile, caseId)

      expect(result.evidence_id).toBe('evidence-456')
      expect(result.filename).toBe('evidence.pdf')
      expect(result.status).toBe('uploaded')
    })

    it('handles file upload errors gracefully', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        text: async () => 'File too large'
      })

      await expect(justiceApi.uploadEvidence(mockFile, 'case-123')).rejects.toThrow('Upload failed: 413')
    })

    it('handles network errors during upload', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(justiceApi.uploadEvidence(mockFile, 'case-123')).rejects.toThrow()
    })
  })

  describe('runAnalysis', () => {
    it('successfully runs analysis with case ID and document IDs', async () => {
      const caseId = 'case-123'
      const documentIds = ['doc-1', 'doc-2', 'doc-3']

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analysis_id: 'analysis-789',
          status: 'processing',
          estimated_time: 120
        })
      })

      const result = await justiceApi.runAnalysis(caseId, documentIds)

      expect(result.analysis_id).toBe('analysis-789')
      expect(result.status).toBe('processing')
      expect(result.estimated_time).toBe(120)

      // Verify fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analysis/run'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ case_id: caseId, document_ids: documentIds })
        })
      )
    })

    it('handles 400 Bad Request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid request'
      })

      await expect(justiceApi.runAnalysis('case-123', [])).rejects.toThrow('Analysis failed: 400')
    })

    it('handles 404 Not Found errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Case not found'
      })

      await expect(justiceApi.runAnalysis('invalid-case', ['doc-1'])).rejects.toThrow('Analysis failed: 404')
    })

    it('handles 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      })

      await expect(justiceApi.runAnalysis('case-123', ['doc-1'])).rejects.toThrow('Analysis failed: 500')
    })
  })

  describe('sendChat', () => {
    it('successfully sends chat message with default options', async () => {
      const message = 'What are the key legal issues in this case?'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Based on the case details, the key legal issues are...',
          reasoning: 'Legal analysis reasoning process',
          model_used: 'deepseek-reasoner'
        })
      })

      const result = await justiceApi.sendChat(message)

      expect(result.content).toContain('key legal issues')
      expect(result.reasoning).toBeTruthy()
      expect(result.model_used).toBe('deepseek-reasoner')
    })

    it('sends chat message with custom domain and options', async () => {
      const message = 'Calculate unemployment benefits'
      const options = {
        domain: 'sc_unemployment',
        model_type: 'cloud' as const,
        use_reasoning: true
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'SC unemployment benefits calculation...',
          reasoning: 'Detailed reasoning',
          model_used: 'deepseek-cloud'
        })
      })

      const result = await justiceApi.sendChat(message, options)

      expect(result.content).toContain('unemployment')
      expect(result.model_used).toBe('deepseek-cloud')
    })

    it('handles 401 Unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized'
      })

      await expect(justiceApi.sendChat('test message')).rejects.toThrow('Chat failed: 401')
    })

    it('handles 503 Service Unavailable errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service unavailable'
      })

      await expect(justiceApi.sendChat('test message')).rejects.toThrow('Chat failed: 503')
    })

    it('returns correct response structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Response content',
          reasoning: 'Detailed reasoning process',
          model_used: 'deepseek-reasoner',
          message: 'Success'
        })
      })

      const result = await justiceApi.sendChat('test')

      expect(result.content).toBe('Response content')
      expect(result.reasoning).toBe('Detailed reasoning process')
      expect(result.model_used).toBe('deepseek-reasoner')
      expect(result.message).toBe('Success')
    })
  })

  describe('listCases', () => {
    it('successfully lists active cases by default', async () => {
      const mockCases = [
        {
          case_id: 'case-001',
          name: 'Active Case 1',
          created_at: '2026-01-01T10:00:00Z',
          status: 'Active',
          jurisdiction: 'sc_unemployment',
          research_goals: 'Research unemployment benefits',
          assigned_agent: 'LegalAssistant_V1',
          is_archived: false,
          archived_at: null,
        },
        {
          case_id: 'case-002',
          name: 'Active Case 2',
          created_at: '2026-01-05T14:30:00Z',
          status: 'Pending',
          jurisdiction: 'walmart',
          research_goals: 'Dispute resolution',
          assigned_agent: 'LegalAssistant_V1',
          is_archived: false,
          archived_at: null,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCases,
      })

      const result = await justiceApi.listCases()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/cases/list?include_archived=false',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      expect(result).toHaveLength(2)
      expect(result[0].case_id).toBe('case-001')
      expect(result[1].case_id).toBe('case-002')
    })

    it('includes archived cases when requested', async () => {
      const casesWithArchived = [
        {
          case_id: 'case-001',
          name: 'Active Case',
          created_at: '2026-01-01T10:00:00Z',
          status: 'Active',
          jurisdiction: 'general',
          research_goals: 'Research',
          assigned_agent: 'LegalAssistant_V1',
          is_archived: false,
          archived_at: null,
        },
        {
          case_id: 'case-003',
          name: 'Archived Case',
          created_at: '2025-12-01T10:00:00Z',
          status: 'Closed',
          jurisdiction: 'general',
          research_goals: 'Completed research',
          assigned_agent: 'LegalAssistant_V1',
          is_archived: true,
          archived_at: '2025-12-31T23:59:59Z',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => casesWithArchived,
      })

      const result = await justiceApi.listCases(true)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/cases/list?include_archived=true',
        expect.anything()
      )

      expect(result).toHaveLength(2)
      expect(result[1].is_archived).toBe(true)
      expect(result[1].archived_at).toBe('2025-12-31T23:59:59Z')
    })

    it('handles empty case list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const result = await justiceApi.listCases()

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('handles 401 Unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Authentication required',
      })

      await expect(justiceApi.listCases()).rejects.toThrow(
        'List cases failed: 401 Authentication required'
      )
    })

    it('handles 500 Database error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Database connection failed',
      })

      await expect(justiceApi.listCases()).rejects.toThrow(
        'List cases failed: 500 Database connection failed'
      )
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(justiceApi.listCases()).rejects.toThrow('Network timeout')
    })
  })

  describe('archiveCase', () => {
    it('successfully archives a case', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Case archived successfully',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await justiceApi.archiveCase('case-001')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/cases/archive/case-001',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      expect(result).toEqual(mockResponse)
      expect(result.status).toBe('success')
    })

    it('properly encodes case ID with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Archived' }),
      })

      await justiceApi.archiveCase('case/with/slashes')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/cases/archive/case%2Fwith%2Fslashes',
        expect.anything()
      )
    })

    it('handles 404 Not Found (case does not exist)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Case not found',
      })

      await expect(justiceApi.archiveCase('nonexistent-case')).rejects.toThrow(
        'Archive case failed: 404 Case not found'
      )
    })

    it('handles 409 Conflict (case already archived)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => 'Case is already archived',
      })

      await expect(justiceApi.archiveCase('case-001')).rejects.toThrow(
        'Archive case failed: 409 Case is already archived'
      )
    })

    it('handles 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Database update failed',
      })

      await expect(justiceApi.archiveCase('case-001')).rejects.toThrow(
        'Archive case failed: 500 Database update failed'
      )
    })

    it('handles network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(justiceApi.archiveCase('case-001')).rejects.toThrow(
        'Request timeout'
      )
    })
  })

  describe('restoreCase', () => {
    it('successfully restores an archived case', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Case restored successfully',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await justiceApi.restoreCase('case-003')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/cases/restore/case-003',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      expect(result).toEqual(mockResponse)
      expect(result.status).toBe('success')
    })

    it('properly encodes case ID with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', message: 'Restored' }),
      })

      await justiceApi.restoreCase('case#123')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/cases/restore/case%23123',
        expect.anything()
      )
    })

    it('handles 404 Not Found (case does not exist)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Case not found',
      })

      await expect(justiceApi.restoreCase('nonexistent')).rejects.toThrow(
        'Restore case failed: 404 Case not found'
      )
    })

    it('handles 400 Bad Request (case not archived)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Case is not archived',
      })

      await expect(justiceApi.restoreCase('active-case')).rejects.toThrow(
        'Restore case failed: 400 Case is not archived'
      )
    })

    it('handles 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Database update failed',
      })

      await expect(justiceApi.restoreCase('case-003')).rejects.toThrow(
        'Restore case failed: 500 Database update failed'
      )
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(justiceApi.restoreCase('case-001')).rejects.toThrow(
        'Failed to fetch'
      )
    })
  })

  describe('Error Handling Edge Cases', () => {
    it('handles malformed JSON responses for chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token') }
      })

      await expect(justiceApi.sendChat('test')).rejects.toThrow()
    })

    it('handles connection refused errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const mockFile = new File(['content'], 'test.pdf')
      await expect(justiceApi.uploadEvidence(mockFile, 'case-123')).rejects.toThrow()
    })

    it('handles response.text() throwing error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => {
          throw new Error('Failed to read response body')
        },
      })

      await expect(justiceApi.sendChat('test')).rejects.toThrow(
        'Failed to read response body'
      )
    })

    it('handles response.json() returning null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })

      const result = await justiceApi.listCases()
      expect(result).toBeNull()
    })
  })
})
