import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils'
import App from '../App'
import axios from 'axios'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
    })),
  },
}))

describe('App', () => {
  let mockPost: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockPost = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(axios.create).mockReturnValue({ post: mockPost } as any)

    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default investigation tab active', () => {
    render(<App />)

    // The Legal Assistant view should be rendered by default (header inside LegalAssistantView)
    expect(screen.getByRole('heading', { name: /legal assistant/i })).toBeInTheDocument()
    // Legal Assistant tab button should have active styling
    const legalAssistantButtons = screen.getAllByRole('button', { name: /legal assistant/i })
    // The tab button in the quick access bar should have active styling
    expect(legalAssistantButtons[0]).toHaveClass('bg-neon-mint/20')
  })

  it('displays header with Legal Assistant title and Scale icon', () => {
    render(<App />)

    // New UI has "Legal Assistant" header in LegalAssistantView
    expect(screen.getByRole('heading', { name: /legal assistant/i })).toBeInTheDocument()
    // Scale icon is rendered (can't easily assert icon but we can check the header exists)
  })

  it('allows domain selection', () => {
    render(<App />)

    // There are multiple comboboxes - domain selector is the first one
    const comboboxes = screen.getAllByRole('combobox')
    const domainSelect = comboboxes[0]
    expect(domainSelect).toHaveValue('general')

    fireEvent.change(domainSelect, { target: { value: 'sc_unemployment' } })
    expect(domainSelect).toHaveValue('sc_unemployment')

    // New UI uses 'sedgwick' instead of 'walmart_sedgwick'
    fireEvent.change(domainSelect, { target: { value: 'sedgwick' } })
    expect(domainSelect).toHaveValue('sedgwick')
  })

  it('switches between tabs correctly', () => {
    render(<App />)

    // Initially on chat tab - shows empty state message
    expect(screen.getByText(/Ask me anything about your legal situation/i)).toBeInTheDocument()

    // Switch to analyze tab
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.getByText('Document Analysis')).toBeInTheDocument()

    // Switch to draft tab
    fireEvent.click(screen.getByRole('button', { name: /draft/i }))
    expect(screen.getByText('Document Drafting')).toBeInTheDocument()

    // Switch back to chat
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    expect(screen.getByText(/Ask me anything about your legal situation/i)).toBeInTheDocument()
  })

  it('shows empty state message when no chat messages', () => {
    render(<App />)

    expect(screen.getByText(/Ask me anything about your legal situation/i)).toBeInTheDocument()
    expect(screen.getByText(/SC unemployment claims, Walmart\/Sedgwick/i)).toBeInTheDocument()
  })

  it('sends message and displays response on successful chat', async () => {
    mockPost.mockResolvedValue({
      data: {
        content: 'This is the AI response about your legal question.',
        reasoning: 'The reasoning behind this response...',
      },
    })

    render(<App />)

    const input = screen.getByPlaceholderText(/Type your legal question/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'What are my rights?' } })
    fireEvent.click(sendButton)

    // User message should appear
    await waitFor(() => {
      expect(screen.getByText('What are my rights?')).toBeInTheDocument()
    })

    // AI response should appear
    await waitFor(() => {
      expect(screen.getByText(/This is the AI response/i)).toBeInTheDocument()
    })

    // Input should be cleared
    expect(input).toHaveValue('')
  })

  it('shows error message when chat API fails', async () => {
    mockPost.mockRejectedValue(new Error('Network error'))

    render(<App />)

    const input = screen.getByPlaceholderText(/Type your legal question/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Error: Unable to process your request/i)).toBeInTheDocument()
    })
  })

  it('does not send empty messages', async () => {
    render(<App />)

    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)

    // API should not be called
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('analyzes document and displays results', async () => {
    mockPost.mockResolvedValue({
      data: {
        analysis: 'Key legal issues identified: breach of contract, failure to pay.',
      },
    })

    render(<App />)

    // Switch to analyze tab
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))

    const textarea = screen.getByPlaceholderText(/Paste your legal document/i)
    const analyzeButton = screen.getByRole('button', { name: /analyze document/i })

    fireEvent.change(textarea, { target: { value: 'This is my legal document content.' } })
    fireEvent.click(analyzeButton)

    await waitFor(() => {
      expect(screen.getByText(/Key legal issues identified/i)).toBeInTheDocument()
    })
  })

  it('shows draft path after successful document generation', async () => {
    mockPost.mockResolvedValue({
      data: {
        file_path: 'D:\\drafts\\appeal_letter_001.docx',
      },
    })

    render(<App />)

    // Switch to draft tab
    fireEvent.click(screen.getByRole('button', { name: /draft/i }))

    // Select template - get all comboboxes (domain selector is first, template is second)
    const comboboxes = screen.getAllByRole('combobox')
    const templateSelect = comboboxes[1] // Second combobox is template type
    fireEvent.change(templateSelect, { target: { value: 'complaint' } })

    const textarea = screen.getByPlaceholderText(/Describe your case details/i)
    const generateButton = screen.getByRole('button', { name: /generate draft/i })

    fireEvent.change(textarea, { target: { value: 'My employer violated my rights...' } })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText(/D:\\drafts\\appeal_letter_001.docx/i)).toBeInTheDocument()
    })
  })

  it('disables inputs and buttons during loading', async () => {
    // Use a promise that never resolves to keep loading state
    mockPost.mockImplementation(() => new Promise(() => {}))

    render(<App />)

    const input = screen.getByPlaceholderText(/Type your legal question/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(sendButton)

    // Input and button should be disabled during loading
    await waitFor(() => {
      expect(input).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })
  })

  it('sends message on Enter key press', async () => {
    mockPost.mockResolvedValue({
      data: {
        content: 'Response to enter key message',
      },
    })

    render(<App />)

    const input = screen.getByPlaceholderText(/Type your legal question/i)

    fireEvent.change(input, { target: { value: 'Enter key test' } })
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

    await waitFor(() => {
      expect(screen.getByText('Enter key test')).toBeInTheDocument()
    })

    expect(mockPost).toHaveBeenCalledWith('/api/chat/simple', {
      message: 'Enter key test',
      domain: 'general',
    })
  })
})
