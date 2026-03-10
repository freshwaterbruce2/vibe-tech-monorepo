import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../Sidebar'
import * as api from '@/services/api'

// Mock the API module
vi.mock('@/services/api', () => ({
  justiceApi: {
    listCases: vi.fn(),
    archiveCase: vi.fn(),
    restoreCase: vi.fn(),
  },
}))

const mockListCases = vi.mocked(api.justiceApi.listCases)
const mockArchiveCase = vi.mocked(api.justiceApi.archiveCase)
const mockRestoreCase = vi.mocked(api.justiceApi.restoreCase)

describe('Sidebar', () => {
  const mockSetActiveTab = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: return empty cases array
    mockListCases.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== Rendering Tests ====================

  describe('Rendering', () => {
    it('renders sidebar in collapsed state by default', () => {
      render(<Sidebar />)

      const sidebar = screen.getByRole('navigation').parentElement
      expect(sidebar).toHaveClass('w-16')
    })

    it('renders all navigation items', async () => {
      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText('New Investigation')).toBeInTheDocument()
      })

      expect(screen.getByText('Cold Case Files')).toBeInTheDocument()
      expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders menu icon', () => {
      const { container } = render(<Sidebar />)

      const menuIcon = container.querySelector('.lucide-menu')
      expect(menuIcon).toBeInTheDocument()
    })

    it('renders security indicator', async () => {
      const user = userEvent.setup()
      const { container } = render(<Sidebar />)

      // Security indicator text is only visible when expanded
      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      // Wait for expansion and text to appear
      await waitFor(() => {
        expect(screen.getByText('SYSTEM: SECURE')).toBeInTheDocument()
      })
    })
  })

  // ==================== Expansion/Collapse Tests ====================

  describe('Expansion and Collapse', () => {
    it('expands sidebar on mouse enter', async () => {
      const user = userEvent.setup()
      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')
      expect(sidebar).toHaveClass('w-16')

      if (sidebar) {
        await user.hover(sidebar)

        await waitFor(() => {
          expect(sidebar).toHaveClass('w-64')
        })
      }
    })

    it('collapses sidebar on mouse leave', async () => {
      const user = userEvent.setup()
      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')

      if (sidebar) {
        // Expand first
        await user.hover(sidebar)
        await waitFor(() => {
          expect(sidebar).toHaveClass('w-64')
        })

        // Then collapse
        await user.unhover(sidebar)
        await waitFor(() => {
          expect(sidebar).toHaveClass('w-16')
        })
      }
    })
  })

  // ==================== Navigation Tests ====================

  describe('Navigation', () => {
    it('highlights active tab', async () => {
      render(<Sidebar activeTab="investigation" setActiveTab={mockSetActiveTab} />)

      await waitFor(() => {
        const button = screen.getByText('New Investigation').closest('button')
        expect(button).toHaveClass('bg-neon-mint/10', 'text-neon-mint')
      })
    })

    it('calls setActiveTab when navigation item is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar activeTab="investigation" setActiveTab={mockSetActiveTab} />)

      const knowledgeBaseButton = screen.getByText('Knowledge Base')
      await user.click(knowledgeBaseButton)

      expect(mockSetActiveTab).toHaveBeenCalledWith('knowledge-base')
    })

    it('does not highlight settings button', async () => {
      render(<Sidebar activeTab="settings" setActiveTab={mockSetActiveTab} />)

      await waitFor(() => {
        const button = screen.getByText('Settings').closest('button')
        expect(button).not.toHaveClass('bg-neon-mint/10')
      })
    })

    it('opens settings modal when settings is clicked', async () => {
      const user = userEvent.setup()
      render(<Sidebar />)

      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)

      // Settings modal should appear
      await waitFor(() => {
        expect(screen.getByText('System Configuration')).toBeInTheDocument()
      })
    })
  })

  // ==================== Cases List Tests ====================

  describe('Cases List', () => {
    it('fetches and displays cases on mount', async () => {
      const mockCases = [
        { case_id: 'case-001', is_archived: false },
        { case_id: 'case-002', is_archived: false },
      ]
      mockListCases.mockResolvedValue(mockCases)

      render(<Sidebar />)

      await waitFor(() => {
        expect(mockListCases).toHaveBeenCalledWith(false)
        expect(screen.getByText('case-001')).toBeInTheDocument()
        expect(screen.getByText('case-002')).toBeInTheDocument()
      })
    })

    it('displays empty state when no cases exist', async () => {
      mockListCases.mockResolvedValue([])

      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument()
      })
    })

    it('displays active cases header when not showing archived', async () => {
      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText('Active Cases')).toBeInTheDocument()
      })
    })

    it('displays all files header when showing archived', async () => {
      const user = userEvent.setup()
      render(<Sidebar />)

      // Open settings and enable archived
      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByText('System Configuration')).toBeInTheDocument()
      })

      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      if (toggleButton) {
        await user.click(toggleButton)
      }

      // Close settings
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('All Files')).toBeInTheDocument()
      })
    })

    it('filters out archived cases when showArchived is false', async () => {
      const mockCases = [
        { case_id: 'active-case', is_archived: false },
        { case_id: 'archived-case', is_archived: true },
      ]
      mockListCases.mockResolvedValue(mockCases)

      render(<Sidebar />)

      await waitFor(() => {
        expect(screen.getByText('active-case')).toBeInTheDocument()
        expect(screen.queryByText('archived-case')).not.toBeInTheDocument()
      })
    })

    it('shows archived cases when showArchived is true', async () => {
      const user = userEvent.setup()
      const mockCases = [
        { case_id: 'active-case', is_archived: false },
        { case_id: 'archived-case', is_archived: true },
      ]
      mockListCases.mockResolvedValue(mockCases)

      render(<Sidebar />)

      // Enable show archived via settings
      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)

      await waitFor(() => {
        const toggleButton = screen
          .getByText('Show Archived Cases')
          .closest('div')
          ?.parentElement?.querySelector('button')

        if (toggleButton) {
          user.click(toggleButton)
        }
      })

      // Close modal
      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      // Both cases should be visible
      await waitFor(() => {
        expect(screen.getByText('active-case')).toBeInTheDocument()
        expect(screen.getByText('archived-case')).toBeInTheDocument()
      })
    })

    it('refetches cases when showArchived changes', async () => {
      const user = userEvent.setup()
      mockListCases.mockResolvedValue([])

      render(<Sidebar />)

      await waitFor(() => {
        expect(mockListCases).toHaveBeenCalledWith(false)
      })

      // Toggle archived
      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)

      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      if (toggleButton) {
        await user.click(toggleButton)
      }

      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockListCases).toHaveBeenCalledWith(true)
      })
    })

    it('handles API error when fetching cases', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockListCases.mockRejectedValue(new Error('API Error'))

      render(<Sidebar />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch cases', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })
  })

  // ==================== Case Actions Tests ====================

  describe('Case Actions', () => {
    it('archives a case when archive button is clicked', async () => {
      const user = userEvent.setup()
      const mockCases = [{ case_id: 'case-123', is_archived: false }]
      mockListCases.mockResolvedValue(mockCases)
      mockArchiveCase.mockResolvedValue(undefined)

      const { container } = render(<Sidebar />)

      // Expand sidebar to see cases
      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('case-123')).toBeInTheDocument()
      })

      // Find and click archive button (appears on hover)
      const caseRow = screen.getByText('case-123').closest('.group')
      expect(caseRow).toBeInTheDocument()

      // Archive button has title "Archive Case"
      const archiveButton = caseRow?.querySelector('button[title="Archive Case"]')
      expect(archiveButton).toBeInTheDocument()

      if (archiveButton) {
        await user.click(archiveButton)

        await waitFor(() => {
          expect(mockArchiveCase).toHaveBeenCalledWith('case-123')
        })
      }
    })

    it('restores a case when restore button is clicked', async () => {
      const user = userEvent.setup()
      const mockCases = [{ case_id: 'case-456', is_archived: true }]
      mockListCases.mockResolvedValue(mockCases)
      mockRestoreCase.mockResolvedValue(undefined)

      const { container } = render(<Sidebar />)

      // Enable show archived first
      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)

      const toggleButton = screen
        .getByText('Show Archived Cases')
        .closest('div')
        ?.parentElement?.querySelector('button')

      if (toggleButton) {
        await user.click(toggleButton)
      }

      const saveButton = screen.getByText('Save Configuration')
      await user.click(saveButton)

      // Expand sidebar
      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('case-456')).toBeInTheDocument()
      })

      // Find and click restore button
      const caseRow = screen.getByText('case-456').closest('.group')
      const restoreButton = caseRow?.querySelector('button[title="Restore Case"]')

      if (restoreButton) {
        await user.click(restoreButton)

        await waitFor(() => {
          expect(mockRestoreCase).toHaveBeenCalledWith('case-456')
        })
      }
    })

    it('optimistically updates UI when archiving case', async () => {
      const user = userEvent.setup()
      const mockCases = [{ case_id: 'case-789', is_archived: false }]
      mockListCases.mockResolvedValue(mockCases)

      // Make archive take some time
      mockArchiveCase.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))

      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('case-789')).toBeInTheDocument()
      })

      const caseRow = screen.getByText('case-789').closest('.group')
      const archiveButton = caseRow?.querySelector('button[title="Archive Case"]')

      if (archiveButton) {
        await user.click(archiveButton)

        // UI should update immediately (optimistic)
        // Case becomes visually archived before API responds
      }
    })

    it('reverts optimistic update on error', async () => {
      const user = userEvent.setup()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockCases = [{ case_id: 'case-error', is_archived: false }]
      mockListCases.mockResolvedValue(mockCases)
      mockArchiveCase.mockRejectedValue(new Error('Archive failed'))

      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('case-error')).toBeInTheDocument()
      })

      const caseRow = screen.getByText('case-error').closest('.group')
      const archiveButton = caseRow?.querySelector('button[title="Archive Case"]')

      if (archiveButton) {
        await user.click(archiveButton)

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update status', expect.any(Error))
        })
      }

      consoleErrorSpy.mockRestore()
    })

    it('stops event propagation when case action button is clicked', async () => {
      const user = userEvent.setup()
      const mockCases = [{ case_id: 'case-prop', is_archived: false }]
      mockListCases.mockResolvedValue(mockCases)

      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('case-prop')).toBeInTheDocument()
      })

      const caseRow = screen.getByText('case-prop').closest('.group')
      const archiveButton = caseRow?.querySelector('button[title="Archive Case"]')

      // Click should not trigger parent click handlers
      if (archiveButton) {
        await user.click(archiveButton)
        // If propagation not stopped, parent div click would fire
      }
    })
  })

  // ==================== Refresh Cases Tests ====================

  describe('Refresh Cases', () => {
    it('refetches cases when refresh button is clicked', async () => {
      const user = userEvent.setup()
      mockListCases.mockResolvedValue([])

      const { container } = render(<Sidebar />)

      // Expand sidebar
      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(mockListCases).toHaveBeenCalledTimes(1)
      })

      // Find and click refresh button
      const refreshButton = container.querySelector('.lucide-refresh-cw')?.closest('button')
      expect(refreshButton).toBeInTheDocument()

      if (refreshButton) {
        await user.click(refreshButton)

        await waitFor(() => {
          expect(mockListCases).toHaveBeenCalledTimes(2)
        })
      }
    })

    it('shows loading spinner while fetching cases', async () => {
      const user = userEvent.setup()
      mockListCases.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 500))
      )

      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      const refreshButton = container.querySelector('.lucide-refresh-cw')?.closest('button')

      if (refreshButton) {
        await user.click(refreshButton)

        // Spinner should appear
        await waitFor(() => {
          const spinner = container.querySelector('.animate-spin')
          expect(spinner).toBeInTheDocument()
        })
      }
    })
  })

  // ==================== Security Indicator Tests ====================

  describe('Security Indicator', () => {
    it('toggles security state when clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<Sidebar />)

      // Expand to see full text
      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('SYSTEM: SECURE')).toBeInTheDocument()
      })

      const securityButton = screen.getByText('SYSTEM: SECURE').closest('button')

      if (securityButton) {
        await user.click(securityButton)

        await waitFor(() => {
          expect(screen.getByText('SYSTEM: ONLINE')).toBeInTheDocument()
        })
      }
    })

    it('displays secure state by default', async () => {
      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await userEvent.setup().hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('Local // Air-Gapped')).toBeInTheDocument()
      })
    })

    it('toggles between secure and online states', async () => {
      const user = userEvent.setup()
      const { container } = render(<Sidebar />)

      const sidebar = container.querySelector('.h-screen')
      if (sidebar) {
        await user.hover(sidebar)
      }

      await waitFor(() => {
        expect(screen.getByText('SYSTEM: SECURE')).toBeInTheDocument()
      })

      const securityButton = screen.getByText('SYSTEM: SECURE').closest('button')

      if (securityButton) {
        // Toggle to online
        await user.click(securityButton)
        await waitFor(() => {
          expect(screen.getByText('Cloud // Connected')).toBeInTheDocument()
        })

        // Toggle back to secure
        await user.click(securityButton)
        await waitFor(() => {
          expect(screen.getByText('Local // Air-Gapped')).toBeInTheDocument()
        })
      }
    })
  })

  // ==================== Settings Modal Integration Tests ====================

  describe('Settings Modal Integration', () => {
    it('listens for global vibe-toggle-settings event', async () => {
      render(<Sidebar />)

      // Dispatch global event
      window.dispatchEvent(new Event('vibe-toggle-settings'))

      await waitFor(() => {
        expect(screen.getByText('System Configuration')).toBeInTheDocument()
      })

      // Toggle again to close
      window.dispatchEvent(new Event('vibe-toggle-settings'))

      await waitFor(() => {
        expect(screen.queryByText('System Configuration')).not.toBeInTheDocument()
      })
    })

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(<Sidebar />)

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'vibe-toggle-settings',
        expect.any(Function)
      )
    })
  })
})
