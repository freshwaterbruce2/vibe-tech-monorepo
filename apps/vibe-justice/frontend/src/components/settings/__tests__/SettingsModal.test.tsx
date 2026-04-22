import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from '../SettingsModal'

// Mock localStorage.
//
// Wave 1C: `SettingsModal`'s Clear Cache handler iterates
// `Object.keys(localStorage)` and only removes keys prefixed with
// `vibe-justice.` or `vibe_`. For that iteration to yield the stored keys
// (rather than the mock's method names), we expose the store via a Proxy so
// `Object.keys` returns the real entries while still supporting the
// Storage-like method API.
const localStorageMock = (() => {
  const store: Record<string, string> = {}

  const api = {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k]
    }),
  }

  return new Proxy(api, {
    ownKeys: () => Object.keys(store),
    getOwnPropertyDescriptor: (_target, prop) =>
      typeof prop === 'string' && prop in store
        ? { value: store[prop], enumerable: true, configurable: true, writable: true }
        : undefined,
    get: (target, prop: string) => {
      if (prop in target) return (target as Record<string, unknown>)[prop]
      if (prop in store) return store[prop]
      return undefined
    },
  }) as typeof api
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn(),
  },
  writable: true,
})

describe('SettingsModal', () => {
  const mockOnClose = vi.fn()
  const mockOnToggleArchived = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== Rendering Tests ====================

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <SettingsModal
          isOpen={false}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders modal when isOpen is true', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.getByText('System Configuration')).toBeInTheDocument()
    })

    it('renders all main sections', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      // Wave 1C removed the DeepSeek API Key input from SettingsModal for
      // security reasons (keys live in backend .env only). Assert its absence
      // alongside the sections that ARE still present.
      expect(screen.queryByText('DeepSeek API Key')).not.toBeInTheDocument()
      expect(screen.getByText('Backend Connection')).toBeInTheDocument()
      expect(screen.getByText('Local Inference URL (Ollama)')).toBeInTheDocument()
      expect(screen.getByText('Interface Mode')).toBeInTheDocument()
      expect(screen.getByText('Data Management')).toBeInTheDocument()
    })

    it('renders close button', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const closeButton = screen.getAllByRole('button').find((btn) => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-x')
      })

      expect(closeButton).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save Configuration')).toBeInTheDocument()
    })
  })

  // ==================== API Key Input Tests ====================

  describe('API Key Input', () => {
    // Wave 1C removed the API key input from SettingsModal for security reasons
    // (API keys are no longer persisted to localStorage). The tests below
    // assert that the input and its associated copy are NOT rendered.

    it('does not render an API key input field', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.queryByPlaceholderText('sk-...')).not.toBeInTheDocument()
    })

    it('does not display API key help text (removed in Wave 1C)', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.queryByText(/Required for Cloud inference/)).not.toBeInTheDocument()
    })
  })

  // ==================== Ollama URL Input Tests ====================

  describe('Ollama URL Input', () => {
    it('renders Ollama URL input with default value', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const input = screen.getByDisplayValue('http://localhost:11434')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('updates Ollama URL input value', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const input = screen.getByDisplayValue('http://localhost:11434')
      await user.clear(input)
      await user.type(input, 'http://custom-ollama:8080')

      expect(input).toHaveValue('http://custom-ollama:8080')
    })

    it('displays Ollama URL help text', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.getByText('Default: http://localhost:11434')).toBeInTheDocument()
    })
  })

  // ==================== Interface Mode Tests ====================

  describe('Interface Mode', () => {
    it('renders interface mode buttons', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.getByText('Cyberpunk Pro')).toBeInTheDocument()
      expect(screen.getByText('Light (Locked)')).toBeInTheDocument()
    })

    it('light mode button is disabled', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const lightButton = screen.getByText('Light (Locked)').closest('button')
      expect(lightButton).toBeDisabled()
    })
  })

  // ==================== Show Archived Toggle Tests ====================

  describe('Show Archived Toggle', () => {
    it('renders show archived toggle section', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.getByText('Show Archived Cases')).toBeInTheDocument()
      expect(screen.getByText('Include soft-deleted items in lists')).toBeInTheDocument()
    })

    it('displays toggle in off state when showArchived is false', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveClass('bg-white/10')
    })

    it('displays toggle in on state when showArchived is true', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={true}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveClass('bg-neon-mint')
    })

    it('calls onToggleArchived when toggle is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      if (toggleButton) {
        await user.click(toggleButton)
        expect(mockOnToggleArchived).toHaveBeenCalledWith(true)
      }
    })

    it('toggles to false when currently true', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={true}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      if (toggleButton) {
        await user.click(toggleButton)
        expect(mockOnToggleArchived).toHaveBeenCalledWith(false)
      }
    })
  })

  // ==================== Clear Cache Tests ====================

  describe('Clear Cache', () => {
    it('renders clear cache section', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.getByText('Local Cache')).toBeInTheDocument()
      expect(screen.getByText('Clear temporary data and tokens')).toBeInTheDocument()
      expect(screen.getByText('Clear Cache')).toBeInTheDocument()
    })

    it('clears localStorage and reloads when clear cache is clicked', async () => {
      const user = userEvent.setup()
      const removeItemSpy = vi.spyOn(localStorageMock, 'removeItem')

      // Seed the store with app-namespaced keys AND a 3rd-party key so we
      // can verify scoped removal (Wave 1C: Clear Cache now only removes
      // keys prefixed with `vibe-justice.` or `vibe_`, preserving others).
      localStorageMock.setItem('vibe_ollama_url', 'http://localhost:11434')
      localStorageMock.setItem('vibe-justice.session', 'abc')
      localStorageMock.setItem('unrelated_key', 'keep-me')

      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const clearButton = screen.getByText('Clear Cache')
      await user.click(clearButton)

      // Both app-namespaced keys should have been removed.
      expect(removeItemSpy).toHaveBeenCalledWith('vibe_ollama_url')
      expect(removeItemSpy).toHaveBeenCalledWith('vibe-justice.session')
      // Unrelated keys must NOT be touched.
      expect(removeItemSpy).not.toHaveBeenCalledWith('unrelated_key')
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  // ==================== Action Buttons Tests ====================

  describe('Action Buttons', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose when X button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const closeButtons = screen.getAllByRole('button')
      const xButton = closeButtons.find((btn) => {
        const svg = btn.querySelector('svg')
        return svg?.classList.contains('lucide-x')
      })

      if (xButton) {
        await user.click(xButton)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })

    it('saves configuration to localStorage and closes modal on save', async () => {
      const user = userEvent.setup()
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem')

      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      // Note: Wave 1C removed API key storage — API key is now held in-memory
      // only; security tests cover that it is NOT persisted to localStorage.

      // Modify Ollama URL
      const ollamaInput = screen.getByDisplayValue('http://localhost:11434')
      await user.clear(ollamaInput)
      await user.type(ollamaInput, 'http://custom:8080')

      // Click save
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      expect(setItemSpy).toHaveBeenCalledWith('vibe_ollama_url', 'http://custom:8080')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does NOT save an empty Ollama URL (fails Zod validation)', async () => {
      const user = userEvent.setup()
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem')

      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      // Clear Ollama URL
      const ollamaInput = screen.getByDisplayValue('http://localhost:11434')
      await user.clear(ollamaInput)

      // Click save
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      // Wave 1C: Ollama URL is now schema-validated (must be a valid http(s)
      // URL). An empty string fails validation, so nothing is persisted and
      // the modal is NOT closed. This test documents that invariant.
      expect(setItemSpy).not.toHaveBeenCalledWith('vibe_ollama_url', '')
      expect(mockOnClose).not.toHaveBeenCalled()
      // A validation error should surface for the user.
      expect(ollamaInput).toHaveAttribute('aria-invalid', 'true')
    })
  })

  // ==================== Integration Tests ====================

  describe('Integration', () => {
    it('handles complete user workflow: open, configure, save, close', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <SettingsModal
          isOpen={false}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      // Modal not visible
      expect(screen.queryByText('System Configuration')).not.toBeInTheDocument()

      // Open modal
      rerender(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      // Now visible
      expect(screen.getByText('System Configuration')).toBeInTheDocument()

      // Note: Wave 1C removed the API key input from SettingsModal — API keys
      // are no longer persisted to localStorage. Security tests cover that
      // `vibe_api_key` is absent.

      // Toggle archived
      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      if (toggleButton) {
        await user.click(toggleButton)
      }

      // Save
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      expect(mockOnToggleArchived).toHaveBeenCalledWith(true)
      expect(localStorageMock.getItem('vibe_api_key')).toBeNull()
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('preserves Ollama URL input value while modal remains open', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      // Wave 1C removed the API key input; exercise the Ollama URL input
      // instead to cover the "preserves typed value" behavior.
      const ollamaInput = screen.getByDisplayValue('http://localhost:11434')
      await user.clear(ollamaInput)
      await user.type(ollamaInput, 'http://custom-host:11434')

      expect(ollamaInput).toHaveValue('http://custom-host:11434')
    })
  })
})
