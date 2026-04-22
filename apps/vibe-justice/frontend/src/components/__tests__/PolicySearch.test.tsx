import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { PolicySearch } from '../PolicySearch'

// Wave 1C: PolicySearch posts via the centralized axios `httpClient` and
// still uses `axios.isAxiosError` to classify errors. Mock the httpClient and
// leave axios's real `isAxiosError` in place (it's a pure helper).
vi.mock('../../services/httpClient', () => ({
  httpClient: {
    post: vi.fn(),
  },
}))

// Keep axios available for `isAxiosError`; override it per-test when needed.
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: vi.fn((err) => err?.isAxiosError === true),
    },
    isAxiosError: vi.fn((err) => err?.isAxiosError === true),
  }
})

import axios from 'axios'
import { httpClient } from '../../services/httpClient'

const mockAxiosInstance = httpClient as unknown as {
  post: ReturnType<typeof vi.fn>
}

describe('PolicySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== Rendering Tests ====================

  describe('Initial Rendering', () => {
    it('renders the search component with header', () => {
      render(<PolicySearch />)

      expect(screen.getByText('Policy Search')).toBeInTheDocument()
    })

    it('renders company selector with all options', () => {
      render(<PolicySearch />)

      // Find select by role since label isn't properly associated
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'All Companies' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Walmart' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Sedgwick' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Lincoln Financial' })).toBeInTheDocument()
    })

    it('renders search input with placeholder', () => {
      render(<PolicySearch />)

      expect(screen.getByPlaceholderText(/search for company policies/i)).toBeInTheDocument()
    })

    it('renders search button', () => {
      render(<PolicySearch />)

      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('shows empty state when no search has been performed', () => {
      render(<PolicySearch />)

      expect(screen.getByText('Search Company Policies')).toBeInTheDocument()
      expect(
        screen.getByText(/search for walmart, sedgwick, or lincoln financial policies/i)
      ).toBeInTheDocument()
    })

    it('search button is disabled when query is empty', () => {
      render(<PolicySearch />)

      const searchButton = screen.getByRole('button', { name: /search/i })
      expect(searchButton).toBeDisabled()
    })
  })

  // ==================== User Input Tests ====================

  describe('User Input', () => {
    it('updates query state when typing in search input', async () => {
      const user = userEvent.setup()
      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'disability policy')

      expect(input).toHaveValue('disability policy')
    })

    it('enables search button when query is not empty', async () => {
      const user = userEvent.setup()
      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      const searchButton = screen.getByRole('button', { name: /search/i })

      expect(searchButton).toBeDisabled()

      await user.type(input, 'test query')

      expect(searchButton).not.toBeDisabled()
    })

    it('changes company filter when selecting from dropdown', async () => {
      const user = userEvent.setup()
      render(<PolicySearch />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'walmart')

      expect(select).toHaveValue('walmart')
    })
  })

  // ==================== Search Functionality Tests ====================

  describe('Search Functionality', () => {
    it('triggers search on button click', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: [] },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'test policy')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/policy/search', {
        query: 'test policy',
        company: undefined,
        limit: 20,
      })
    })

    it('triggers search on Enter key press', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: [] },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'test policy{Enter}')

      expect(mockAxiosInstance.post).toHaveBeenCalled()
    })

    it('includes company filter in search request', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: [] },
      })

      render(<PolicySearch />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'walmart')

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'test policy{Enter}')

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/policy/search', {
        query: 'test policy',
        company: 'walmart',
        limit: 20,
      })
    })

    it('does not search when query is empty or whitespace', async () => {
      const user = userEvent.setup()
      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, '   ')

      const searchButton = screen.getByRole('button', { name: /search/i })
      // Button should be disabled for whitespace-only
      expect(searchButton).toBeDisabled()
    })

    it('shows loading state during search', async () => {
      const user = userEvent.setup()
      // Create a promise that won't resolve immediately
      let resolveSearch: (value: unknown) => void
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve
      })
      mockAxiosInstance.post.mockReturnValueOnce(searchPromise)

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'test policy')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      expect(screen.getByText('Searching policies...')).toBeInTheDocument()

      // Resolve to clean up
      resolveSearch!({ data: { results: [] } })
    })
  })

  // ==================== Results Display Tests ====================

  describe('Results Display', () => {
    const mockResults = [
      {
        id: '1',
        title: 'Walmart Employee Handbook',
        snippet: 'This handbook contains company policies...',
        url: 'https://example.com/handbook.pdf',
        source: 'Walmart',
        relevanceScore: 0.95,
      },
      {
        id: '2',
        title: 'Leave of Absence Policy',
        snippet: 'Policy regarding leave requests...',
        url: 'https://example.com/leave.pdf',
        source: 'Sedgwick',
        relevanceScore: 0.72,
      },
    ]

    it('displays search results after successful search', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: mockResults },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Walmart Employee Handbook')).toBeInTheDocument()
      })

      expect(screen.getByText('Leave of Absence Policy')).toBeInTheDocument()
      expect(screen.getByText(/found 2 results/i)).toBeInTheDocument()
    })

    it('displays result count correctly for single result', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: [mockResults[0]] },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Found 1 result')).toBeInTheDocument()
      })
    })

    it('displays source badge for each result', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: mockResults },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        // Source badges are inside spans with specific styling - there may be multiple "Walmart" (option + badge)
        // so we check for at least 2 Walmart texts (option + badge) and 1 Sedgwick badge
        const walmartElements = screen.getAllByText('Walmart')
        expect(walmartElements.length).toBeGreaterThanOrEqual(2) // option + badge
        const sedgwickElements = screen.getAllByText('Sedgwick')
        expect(sedgwickElements.length).toBeGreaterThanOrEqual(2) // option + badge
      })
    })

    it('displays relevance score when available', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: mockResults },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('95% relevant')).toBeInTheDocument()
        expect(screen.getByText('72% relevant')).toBeInTheDocument()
      })
    })

    it('displays View Source link for results with URL', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: mockResults },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        const links = screen.getAllByText('View Source')
        expect(links).toHaveLength(2)
      })
    })

    it('shows no results message when search returns empty', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: [] },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'nonexistent policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/no policies found matching your search/i)).toBeInTheDocument()
      })
    })
  })

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('displays error message on search failure', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'))

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/failed to search policies. please try again/i)).toBeInTheDocument()
      })
    })

    it('displays specific error for 404 (endpoint not available)', async () => {
      const user = userEvent.setup()
      const axiosError = {
        isAxiosError: true,
        response: { status: 404 },
      }
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError)

      // Make sure axios.isAxiosError returns true for our mock error
      ;(axios.isAxiosError as ReturnType<typeof vi.fn>).mockReturnValue(true)

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/policy search endpoint not available/i)).toBeInTheDocument()
      })
    })
  })

  // ==================== Download Functionality Tests ====================

  describe('Download Functionality', () => {
    const mockResult = {
      id: '1',
      title: 'Test Policy',
      snippet: 'Test snippet...',
      url: 'https://example.com/policy.pdf',
      source: 'Walmart',
    }

    it('displays Add to KB button for each result', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { results: [mockResult] },
      })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to kb/i })).toBeInTheDocument()
      })
    })

    it('calls download API when clicking Add to KB', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { results: [mockResult] } }) // search
        .mockResolvedValueOnce({ data: { success: true } }) // download

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Test Policy')).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add to kb/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/policy/download', {
          url: 'https://example.com/policy.pdf',
          domain: 'Walmart',
          title: 'Test Policy',
        })
      })
    })

    it('shows Added state after successful download', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { results: [mockResult] } })
        .mockResolvedValueOnce({ data: { success: true } })

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Test Policy')).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add to kb/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /added/i })).toBeInTheDocument()
      })
    })

    it('calls onDocumentAdded callback after successful download', async () => {
      const user = userEvent.setup()
      const onDocumentAdded = vi.fn()
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { results: [mockResult] } })
        .mockResolvedValueOnce({ data: { success: true } })

      render(<PolicySearch onDocumentAdded={onDocumentAdded} />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Test Policy')).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add to kb/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(onDocumentAdded).toHaveBeenCalledWith({
          title: 'Test Policy',
          url: 'https://example.com/policy.pdf',
        })
      })
    })

    it('shows error message when download fails', async () => {
      const user = userEvent.setup()
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { results: [mockResult] } })
        .mockRejectedValueOnce(new Error('Download failed'))

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Test Policy')).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add to kb/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(
          screen.getByText(/failed to add "test policy" to knowledge base/i)
        ).toBeInTheDocument()
      })
    })

    it('prevents double-clicking on Add button', async () => {
      const user = userEvent.setup()
      let resolveDownload: () => void
      const downloadPromise = new Promise<void>((resolve) => {
        resolveDownload = resolve
      })

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: { results: [mockResult] } })
        .mockReturnValueOnce(downloadPromise)

      render(<PolicySearch />)

      const input = screen.getByPlaceholderText(/search for company policies/i)
      await user.type(input, 'policy{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Test Policy')).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add to kb/i })
      await user.click(addButton)

      // Should show "Adding..." and be disabled
      await waitFor(() => {
        expect(screen.getByText(/adding/i)).toBeInTheDocument()
      })

      // Button should be disabled during download
      const addingButton = screen.getByRole('button', { name: /adding/i })
      expect(addingButton).toBeDisabled()

      // Clean up
      resolveDownload!()
    })
  })
})
