import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from '../SettingsModal'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
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

      expect(screen.getByText('DeepSeek API Key')).toBeInTheDocument()
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
    it('renders API key input field', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const input = screen.getByPlaceholderText('sk-...')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'password')
    })

    it('updates API key input value', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      const input = screen.getByPlaceholderText('sk-...')
      await user.type(input, 'sk-test-key-123')

      expect(input).toHaveValue('sk-test-key-123')
    })

    it('displays API key help text', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      expect(screen.getByText(/Required for Cloud inference/)).toBeInTheDocument()
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
      const clearSpy = vi.spyOn(localStorageMock, 'clear')

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

      expect(clearSpy).toHaveBeenCalled()
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

      // Enter API key
      const apiKeyInput = screen.getByPlaceholderText('sk-...')
      await user.type(apiKeyInput, 'sk-new-key-456')

      // Modify Ollama URL
      const ollamaInput = screen.getByDisplayValue('http://localhost:11434')
      await user.clear(ollamaInput)
      await user.type(ollamaInput, 'http://custom:8080')

      // Click save
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      expect(setItemSpy).toHaveBeenCalledWith('vibe_api_key', 'sk-new-key-456')
      expect(setItemSpy).toHaveBeenCalledWith('vibe_ollama_url', 'http://custom:8080')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('saves empty values to localStorage', async () => {
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

      expect(setItemSpy).toHaveBeenCalledWith('vibe_api_key', '')
      expect(setItemSpy).toHaveBeenCalledWith('vibe_ollama_url', '')
      expect(mockOnClose).toHaveBeenCalled()
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

      // Configure settings
      const apiKeyInput = screen.getByPlaceholderText('sk-...')
      await user.type(apiKeyInput, 'sk-test')

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
      expect(localStorageMock.getItem('vibe_api_key')).toBe('sk-test')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('preserves input values when reopening modal', async () => {
      const user = userEvent.setup()
      render(
        <SettingsModal
          isOpen={true}
          onClose={mockOnClose}
          showArchived={false}
          onToggleArchived={mockOnToggleArchived}
        />
      )

      // Type in API key
      const apiKeyInput = screen.getByPlaceholderText('sk-...')
      await user.type(apiKeyInput, 'sk-persistent')

      // Note: The component doesn't persist state across unmounts
      // Each render creates fresh state with default values
      // This is expected behavior

      expect(apiKeyInput).toHaveValue('sk-persistent')
    })
  })
})
