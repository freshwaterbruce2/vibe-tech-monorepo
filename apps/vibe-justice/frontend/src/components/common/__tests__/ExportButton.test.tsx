import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ExportButton } from '../ExportButton'
import { httpClient } from '../../../services/httpClient'

// Wave 1C: ExportButton no longer uses global fetch — it posts via httpClient
// (axios). Mock the centralized client so tests exercise the real code path.
vi.mock('../../../services/httpClient', () => ({
  httpClient: {
    post: vi.fn(),
  },
}))

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock window.alert
global.alert = vi.fn()

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== Rendering Tests ====================

  describe('Rendering', () => {
    it('renders markdown export button', () => {
      render(<ExportButton title="Test Report" data={{}} />)

      expect(screen.getByTitle('Export as Markdown')).toBeInTheDocument()
      expect(screen.getByText('Report (MD)')).toBeInTheDocument()
    })

    it('renders only markdown button when no caseId provided', () => {
      render(<ExportButton title="Test Report" data={{}} />)

      expect(screen.getByTitle('Export as Markdown')).toBeInTheDocument()
      expect(screen.queryByTitle('Generate Full Report (DOCX)')).not.toBeInTheDocument()
    })

    it('renders both markdown and docx buttons when caseId provided', () => {
      render(<ExportButton title="Test Report" data={{}} caseId="case-123" />)

      expect(screen.getByTitle('Export as Markdown')).toBeInTheDocument()
      expect(screen.getByTitle('Generate Full Report (DOCX)')).toBeInTheDocument()
      expect(screen.getByText('Report (DOCX)')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <ExportButton title="Test Report" data={{}} className="custom-class" />
      )

      const wrapper = container.querySelector('.custom-class')
      expect(wrapper).toBeInTheDocument()
    })
  })

  // ==================== Markdown Export Tests ====================

  describe('Markdown Export', () => {
    it('exports simple object data as markdown', async () => {
      const user = userEvent.setup()
      const data = { key1: 'value1', key2: 'value2' }

      render(<ExportButton title="Test Report" data={data} filename="test-file" />)

      const mdButton = screen.getByTitle('Export as Markdown')

      // Mock after render to avoid interfering with React
      const mockClick = vi.fn()
      const anchorElement = document.createElement('a')
      anchorElement.click = mockClick
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValueOnce(anchorElement)

      await user.click(mdButton)

      // Verify blob was created
      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url')

      // Check download filename
      expect(anchorElement.download).toBe('test-file.md')

      createElementSpy.mockRestore()
    })

    it('exports array data as markdown with titles and content', async () => {
      const user = userEvent.setup()
      const data = [
        {
          title: 'Item 1',
          source: 'Source A',
          timestamp: '2024-01-01',
          content: 'Content for item 1',
        },
        {
          title: 'Item 2',
          source: 'Source B',
          timestamp: '2024-01-02',
          description: 'Description for item 2',
        },
      ]

      render(<ExportButton title="Investigation Report" data={data} />)

      const mdButton = screen.getByTitle('Export as Markdown')

      const mockClick = vi.fn()
      const anchorElement = document.createElement('a')
      anchorElement.click = mockClick
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValueOnce(anchorElement)

      await user.click(mdButton)

      expect(mockClick).toHaveBeenCalled()
      expect(anchorElement.download).toBe('export.md')

      createElementSpy.mockRestore()
    })

    it('exports primitive data types as markdown', async () => {
      const user = userEvent.setup()
      const data = 'Simple text content'

      render(<ExportButton title="Simple Report" data={data} />)

      const mdButton = screen.getByTitle('Export as Markdown')

      const mockClick = vi.fn()
      const anchorElement = document.createElement('a')
      anchorElement.click = mockClick
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValueOnce(anchorElement)

      await user.click(mdButton)

      expect(mockClick).toHaveBeenCalled()

      createElementSpy.mockRestore()
    })

    it('uses default filename when not provided', async () => {
      const user = userEvent.setup()

      render(<ExportButton title="Report" data={{}} />)

      const mdButton = screen.getByTitle('Export as Markdown')

      const mockClick = vi.fn()
      const anchorElement = document.createElement('a')
      anchorElement.click = mockClick
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValueOnce(anchorElement)

      await user.click(mdButton)

      expect(anchorElement.download).toBe('export.md')

      createElementSpy.mockRestore()
    })
  })

  // ==================== JSON Export Tests ====================

  describe('JSON Export', () => {
    it('shows markdown export button (JSON not exposed in UI)', async () => {
      const data = { key1: 'value1', nested: { key2: 'value2' } }

      // Note: The component currently only exposes MD button in the UI
      // JSON format is in code but not exposed

      render(<ExportButton title="Data Export" data={data} filename="data" />)

      // The component only shows MD button, JSON format is in code but not exposed
      const mdButton = screen.getByTitle('Export as Markdown')
      expect(mdButton).toBeInTheDocument()
    })
  })

  // ==================== Backend Export Tests ====================

  describe('Backend Export (DOCX)', () => {
    it('calls backend export API with caseId', async () => {
      const user = userEvent.setup()
      const mockPost = vi.mocked(httpClient.post)
      mockPost.mockResolvedValueOnce({
        data: { path: '/exports/case-123.docx' },
      } as Awaited<ReturnType<typeof httpClient.post>>)

      render(<ExportButton title="Report" data={{}} caseId="case-123" />)

      const docxButton = screen.getByTitle('Generate Full Report (DOCX)')
      await user.click(docxButton)

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/cases/export/case-123')
      })

      expect(global.alert).toHaveBeenCalledWith(
        'Export Successful!\n\nSaved to: /exports/case-123.docx'
      )
    })

    it('shows alert when no caseId provided for backend export', async () => {
      // Render without caseId - DOCX button should not appear
      render(<ExportButton title="Report" data={{}} />)

      expect(screen.queryByTitle('Generate Full Report (DOCX)')).not.toBeInTheDocument()
    })

    it('handles network error during backend export', async () => {
      const user = userEvent.setup()
      const mockPost = vi.mocked(httpClient.post)
      mockPost.mockRejectedValueOnce(new Error('Network error'))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<ExportButton title="Report" data={{}} caseId="case-123" />)

      const docxButton = screen.getByTitle('Generate Full Report (DOCX)')
      await user.click(docxButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Export error:', expect.any(Error))
        expect(global.alert).toHaveBeenCalledWith('Export Failed: Network error')
      })

      consoleErrorSpy.mockRestore()
    })

    it('handles unknown error type during backend export', async () => {
      const user = userEvent.setup()
      const mockPost = vi.mocked(httpClient.post)
      mockPost.mockRejectedValueOnce('Unknown error')

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<ExportButton title="Report" data={{}} caseId="case-123" />)

      const docxButton = screen.getByTitle('Generate Full Report (DOCX)')
      await user.click(docxButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Export Failed: Unknown error')
      })

      consoleErrorSpy.mockRestore()
    })
  })

  // ==================== Integration Tests ====================

  describe('Integration', () => {
    it('handles multiple exports in succession', async () => {
      const user = userEvent.setup()
      const mockPost = vi.mocked(httpClient.post)
      mockPost.mockResolvedValue({
        data: { path: '/exports/test.docx' },
      } as Awaited<ReturnType<typeof httpClient.post>>)

      render(<ExportButton title="Report" data={{ test: 'data' }} caseId="case-123" />)

      // Export as MD
      const mdButton = screen.getByTitle('Export as Markdown')

      const mockClick = vi.fn()
      const anchorElement = document.createElement('a')
      anchorElement.click = mockClick
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValueOnce(anchorElement)

      await user.click(mdButton)
      expect(mockClick).toHaveBeenCalled()

      createElementSpy.mockRestore()

      // Export as DOCX
      const docxButton = screen.getByTitle('Generate Full Report (DOCX)')
      await user.click(docxButton)

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalled()
      })
    })
  })
})
