import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import { DiagnosticsPanel } from '../DiagnosticsPanel'

describe('DiagnosticsPanel', () => {
  const mockPing = vi.fn()
  const mockSetSetting = vi.fn()
  const mockGetSetting = vi.fn()
  const mockSearchLogic = vi.fn()

  beforeEach(() => {
    // Setup window.vibeTech mock
    window.vibeTech = {
      ping: mockPing,
      setSetting: mockSetSetting,
      getSetting: mockGetSetting,
      searchLogic: mockSearchLogic,
      onLogicViolation: vi.fn(),
      onSettingsChanged: vi.fn(),
    } as typeof window.vibeTech

    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).vibeTech
  })

  it('renders panel with title and RUN PULSE button', () => {
    render(<DiagnosticsPanel />)

    expect(screen.getByText('SYSTEM DIAGNOSTICS')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /run pulse/i })).toBeInTheDocument()
  })

  it('clears previous logs and starts diagnostics on button click', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockResolvedValue({ patterns: [] })

    render(<DiagnosticsPanel />)

    const button = screen.getByRole('button', { name: /run pulse/i })
    button.click()

    await waitFor(() => {
      expect(screen.getByText(/Starting System Pulse/i)).toBeInTheDocument()
    })

    expect(mockPing).toHaveBeenCalled()
  })

  it('shows success log when IPC Bridge ping returns pong', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockResolvedValue({ patterns: [] })

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      expect(screen.getByText(/IPC Bridge: ONLINE/i)).toBeInTheDocument()
    })
  })

  it('shows failure log when IPC Bridge ping fails', async () => {
    mockPing.mockRejectedValue(new Error('Connection refused'))

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      expect(screen.getByText(/FAILURE:.*Connection refused/i)).toBeInTheDocument()
    })
  })

  it('shows success log when config persistence test passes', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockResolvedValue({ patterns: [] })

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      expect(screen.getByText(/Config Persistence: WRITE VERIFIED/i)).toBeInTheDocument()
    })

    // Verify setSetting was called twice (set to false, then revert to true)
    expect(mockSetSetting).toHaveBeenCalledWith('autoScan', false)
    expect(mockSetSetting).toHaveBeenCalledWith('autoScan', true)
  })

  it('shows failure log when config persistence returns wrong value', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue('unexpected_value') // Wrong value returned

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      expect(screen.getByText(/FAILURE:.*Config write failed/i)).toBeInTheDocument()
    })
  })

  it('shows success log when vector store connects', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockResolvedValue({ patterns: [{ id: '1' }, { id: '2' }] })

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      expect(screen.getByText(/Vector Store: CONNECTED \(2 nodes found\)/i)).toBeInTheDocument()
    })
  })

  it('shows failure log when vector store search fails', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockRejectedValue(new Error('Database connection failed'))

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      expect(screen.getByText(/FAILURE:.*Database connection failed/i)).toBeInTheDocument()
    })
  })

  it('displays log entries with timestamps', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockResolvedValue({ patterns: [] })

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      // Check that logs contain timestamp format [HH:MM:SS]
      const logs = screen.getAllByText(/^\[[\d:]+\s*[AP]?M?\]/i)
      expect(logs.length).toBeGreaterThan(0)
    })
  })

  it('applies correct color classes to log entries', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockResolvedValue({ patterns: [] })

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      // Success logs should have green class
      const successLog = screen.getByText(/IPC Bridge: ONLINE/i)
      expect(successLog).toHaveClass('text-green-400')
    })
  })

  it('handles empty search results correctly', async () => {
    mockPing.mockResolvedValue('pong')
    mockSetSetting.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue(false)
    mockSearchLogic.mockResolvedValue([]) // Empty array format

    render(<DiagnosticsPanel />)

    screen.getByRole('button', { name: /run pulse/i }).click()

    await waitFor(() => {
      expect(screen.getByText(/Vector Store: CONNECTED \(0 nodes found\)/i)).toBeInTheDocument()
    })
  })
})
