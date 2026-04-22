import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// Mock Tauri APIs before importing the service
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import {
  isTauri,
  hasTauriInternals,
  tauriAPI,
  createVibeTechBridge,
  type BackendStatus,
  type BrainScanMatch,
} from '../tauri'

describe('Tauri Service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Clear localStorage
    localStorage.clear()
    // Reset window state - delete Tauri properties if they exist
    if ('__TAURI__' in window) {
      delete (window as Record<string, unknown>).__TAURI__
    }
    if ('__TAURI_INTERNALS__' in window) {
      delete (window as Record<string, unknown>).__TAURI_INTERNALS__
    }
  })

  // Helper to simulate Tauri environment
  function setupTauriEnvironment() {
    Object.defineProperty(window, '__TAURI__', {
      value: {},
      writable: true,
      configurable: true,
    })
  }

  function setupTauriInternals() {
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {},
      writable: true,
      configurable: true,
    })
  }

  // ==================== Environment Detection Tests ====================

  describe('isTauri', () => {
    it('returns false when __TAURI__ is not present', () => {
      expect(isTauri()).toBe(false)
    })

    it('returns true when __TAURI__ is present', () => {
      setupTauriEnvironment()
      expect(isTauri()).toBe(true)
    })
  })

  describe('hasTauriInternals', () => {
    it('returns false when __TAURI_INTERNALS__ is not present', () => {
      expect(hasTauriInternals()).toBe(false)
    })

    it('returns true when __TAURI_INTERNALS__ is present', () => {
      setupTauriInternals()
      expect(hasTauriInternals()).toBe(true)
    })
  })

  // ==================== tauriAPI.ping Tests ====================

  describe('tauriAPI.ping', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.ping()).rejects.toThrow('Tauri is not available')
    })

    it('returns pong when Tauri is available', async () => {
      setupTauriEnvironment()
      ;(invoke as Mock).mockResolvedValueOnce('pong')

      const result = await tauriAPI.ping()

      expect(result).toBe('pong')
      expect(invoke).toHaveBeenCalledWith('ping')
    })

    it('throws error when invoke fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(invoke as Mock).mockRejectedValueOnce(new Error('IPC Error'))

      await expect(tauriAPI.ping()).rejects.toThrow('IPC Error')
      expect(consoleSpy).toHaveBeenCalledWith('Failed to ping Tauri backend:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  // ==================== Backend Management Tests ====================

  describe('tauriAPI.startBackend', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.startBackend()).rejects.toThrow('Tauri is not available')
    })

    it('starts backend successfully', async () => {
      setupTauriEnvironment()
      ;(invoke as Mock).mockResolvedValueOnce('Backend started on port 8000')

      const result = await tauriAPI.startBackend()

      expect(result).toBe('Backend started on port 8000')
      expect(invoke).toHaveBeenCalledWith('start_backend')
    })

    it('throws error when start fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(invoke as Mock).mockRejectedValueOnce(new Error('Port in use'))

      await expect(tauriAPI.startBackend()).rejects.toThrow('Port in use')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('tauriAPI.stopBackend', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.stopBackend()).rejects.toThrow('Tauri is not available')
    })

    it('stops backend successfully', async () => {
      setupTauriEnvironment()
      ;(invoke as Mock).mockResolvedValueOnce(undefined)

      await tauriAPI.stopBackend()

      expect(invoke).toHaveBeenCalledWith('stop_backend')
    })

    it('throws error when stop fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(invoke as Mock).mockRejectedValueOnce(new Error('Process not found'))

      await expect(tauriAPI.stopBackend()).rejects.toThrow('Process not found')

      consoleSpy.mockRestore()
    })
  })

  describe('tauriAPI.getBackendStatus', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.getBackendStatus()).rejects.toThrow('Tauri is not available')
    })

    it('returns backend status', async () => {
      setupTauriEnvironment()
      const status: BackendStatus = {
        running: true,
        port: 8000,
        pid: 12345,
        uptime: 3600,
      }
      ;(invoke as Mock).mockResolvedValueOnce(status)

      const result = await tauriAPI.getBackendStatus()

      expect(result).toEqual(status)
      expect(invoke).toHaveBeenCalledWith('get_backend_status')
    })

    it('throws error when status check fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(invoke as Mock).mockRejectedValueOnce(new Error('Status unavailable'))

      await expect(tauriAPI.getBackendStatus()).rejects.toThrow('Status unavailable')

      consoleSpy.mockRestore()
    })
  })

  // ==================== File Dialog Tests ====================

  describe('tauriAPI.openFileDialog', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.openFileDialog()).rejects.toThrow('Tauri is not available')
    })

    it('returns empty array when dialog is cancelled (null result)', async () => {
      setupTauriEnvironment()
      ;(open as Mock).mockResolvedValueOnce(null)

      const result = await tauriAPI.openFileDialog()

      expect(result).toEqual([])
    })

    it('returns single file as array when string result', async () => {
      setupTauriEnvironment()
      ;(open as Mock).mockResolvedValueOnce('/path/to/file.pdf')

      const result = await tauriAPI.openFileDialog()

      expect(result).toEqual(['/path/to/file.pdf'])
    })

    it('returns array of files when multiple selection', async () => {
      setupTauriEnvironment()
      ;(open as Mock).mockResolvedValueOnce(['/path/to/file1.pdf', '/path/to/file2.pdf'])

      const result = await tauriAPI.openFileDialog({ multiple: true })

      expect(result).toEqual(['/path/to/file1.pdf', '/path/to/file2.pdf'])
    })

    it('passes all options to open dialog', async () => {
      setupTauriEnvironment()
      ;(open as Mock).mockResolvedValueOnce(null)

      await tauriAPI.openFileDialog({
        title: 'Select Evidence',
        defaultPath: '/documents',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        multiple: true,
        directory: true,
      })

      expect(open).toHaveBeenCalledWith({
        title: 'Select Evidence',
        defaultPath: '/documents',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        multiple: true,
        directory: true,
      })
    })

    it('uses default values for multiple and directory options', async () => {
      setupTauriEnvironment()
      ;(open as Mock).mockResolvedValueOnce(null)

      await tauriAPI.openFileDialog({})

      expect(open).toHaveBeenCalledWith({
        title: undefined,
        defaultPath: undefined,
        filters: undefined,
        multiple: false,
        directory: false,
      })
    })

    it('throws error when dialog fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(open as Mock).mockRejectedValueOnce(new Error('Dialog error'))

      await expect(tauriAPI.openFileDialog()).rejects.toThrow('Dialog error')

      consoleSpy.mockRestore()
    })
  })

  describe('tauriAPI.saveFileDialog', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.saveFileDialog()).rejects.toThrow('Tauri is not available')
    })

    it('returns empty string when dialog is cancelled', async () => {
      setupTauriEnvironment()
      ;(save as Mock).mockResolvedValueOnce(null)

      const result = await tauriAPI.saveFileDialog()

      expect(result).toBe('')
    })

    it('returns selected path on success', async () => {
      setupTauriEnvironment()
      ;(save as Mock).mockResolvedValueOnce('/path/to/save/report.pdf')

      const result = await tauriAPI.saveFileDialog()

      expect(result).toBe('/path/to/save/report.pdf')
    })

    it('passes all options to save dialog', async () => {
      setupTauriEnvironment()
      ;(save as Mock).mockResolvedValueOnce('/path/to/file.pdf')

      await tauriAPI.saveFileDialog({
        title: 'Export Report',
        defaultPath: 'analysis-report.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })

      expect(save).toHaveBeenCalledWith({
        title: 'Export Report',
        defaultPath: 'analysis-report.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
    })

    it('throws error when dialog fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(save as Mock).mockRejectedValueOnce(new Error('Save dialog error'))

      await expect(tauriAPI.saveFileDialog()).rejects.toThrow('Save dialog error')

      consoleSpy.mockRestore()
    })
  })

  // ==================== File Operations Tests ====================

  describe('tauriAPI.readFile', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.readFile('/path/to/file.txt')).rejects.toThrow('Tauri is not available')
    })

    it('reads file content successfully', async () => {
      setupTauriEnvironment()
      ;(readTextFile as Mock).mockResolvedValueOnce('File content here')

      const result = await tauriAPI.readFile('/path/to/file.txt')

      expect(result).toBe('File content here')
      expect(readTextFile).toHaveBeenCalledWith('/path/to/file.txt')
    })

    it('throws error when read fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(readTextFile as Mock).mockRejectedValueOnce(new Error('File not found'))

      await expect(tauriAPI.readFile('/nonexistent.txt')).rejects.toThrow('File not found')

      consoleSpy.mockRestore()
    })
  })

  describe('tauriAPI.writeFile', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.writeFile('/path/to/file.txt', 'content')).rejects.toThrow(
        'Tauri is not available'
      )
    })

    it('writes file content successfully', async () => {
      setupTauriEnvironment()
      ;(writeTextFile as Mock).mockResolvedValueOnce(undefined)

      await tauriAPI.writeFile('/path/to/file.txt', 'New content')

      expect(writeTextFile).toHaveBeenCalledWith('/path/to/file.txt', 'New content')
    })

    it('throws error when write fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(writeTextFile as Mock).mockRejectedValueOnce(new Error('Permission denied'))

      await expect(tauriAPI.writeFile('/readonly.txt', 'content')).rejects.toThrow(
        'Permission denied'
      )

      consoleSpy.mockRestore()
    })
  })

  // ==================== Settings Management Tests ====================

  describe('tauriAPI.getSetting', () => {
    it('uses localStorage when Tauri is not available', async () => {
      localStorage.setItem('vibe-justice.theme', JSON.stringify('dark'))

      const result = await tauriAPI.getSetting<string>('theme')

      expect(result).toBe('dark')
    })

    it('returns null when setting not found in localStorage', async () => {
      const result = await tauriAPI.getSetting('nonexistent')

      expect(result).toBeNull()
    })

    it('uses Tauri invoke when available', async () => {
      setupTauriEnvironment()
      ;(invoke as Mock).mockResolvedValueOnce('dark')

      const result = await tauriAPI.getSetting<string>('theme')

      expect(result).toBe('dark')
      expect(invoke).toHaveBeenCalledWith('settings_get', { key: 'theme' })
    })

    it('falls back to localStorage on Tauri error', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorage.setItem('vibe-justice.theme', JSON.stringify('light'))
      ;(invoke as Mock).mockRejectedValueOnce(new Error('Settings error'))

      const result = await tauriAPI.getSetting<string>('theme')

      expect(result).toBe('light')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('handles complex objects in settings', async () => {
      const complexSetting = { enabled: true, options: ['a', 'b'] }
      localStorage.setItem('vibe-justice.config', JSON.stringify(complexSetting))

      const result = await tauriAPI.getSetting<typeof complexSetting>('config')

      expect(result).toEqual(complexSetting)
    })
  })

  describe('tauriAPI.setSetting', () => {
    it('uses localStorage when Tauri is not available', async () => {
      await tauriAPI.setSetting('theme', 'dark')

      expect(localStorage.getItem('vibe-justice.theme')).toBe('"dark"')
    })

    it('uses Tauri invoke when available', async () => {
      setupTauriEnvironment()
      ;(invoke as Mock).mockResolvedValueOnce(undefined)

      await tauriAPI.setSetting('theme', 'dark')

      expect(invoke).toHaveBeenCalledWith('settings_set', { key: 'theme', value: 'dark' })
    })

    it('falls back to localStorage on Tauri error', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(invoke as Mock).mockRejectedValueOnce(new Error('Settings error'))

      await tauriAPI.setSetting('theme', 'dark')

      expect(localStorage.getItem('vibe-justice.theme')).toBe('"dark"')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('handles complex objects in settings', async () => {
      const complexSetting = { enabled: true, options: ['a', 'b'] }

      await tauriAPI.setSetting('config', complexSetting)

      expect(JSON.parse(localStorage.getItem('vibe-justice.config')!)).toEqual(complexSetting)
    })
  })

  // ==================== BrainScan Integration Tests ====================

  describe('tauriAPI.searchLogic', () => {
    it('throws error when Tauri is not available', async () => {
      await expect(tauriAPI.searchLogic('search query')).rejects.toThrow('Tauri is not available')
    })

    it('searches logic successfully', async () => {
      setupTauriEnvironment()
      const searchResult = {
        matches: [{ file: 'test.ts', line: 10, content: 'match', score: 0.9 }],
        total: 1,
      }
      ;(invoke as Mock).mockResolvedValueOnce(searchResult)

      const result = await tauriAPI.searchLogic('search query', { context: 'legal' })

      expect(result).toEqual(searchResult)
      expect(invoke).toHaveBeenCalledWith('brainscan_search', {
        snippet: 'search query',
        metadata: { context: 'legal' },
      })
    })

    it('throws error when search fails', async () => {
      setupTauriEnvironment()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(invoke as Mock).mockRejectedValueOnce(new Error('Search failed'))

      await expect(tauriAPI.searchLogic('query')).rejects.toThrow('Search failed')

      consoleSpy.mockRestore()
    })
  })

  // ==================== Event Listener Tests ====================

  describe('tauriAPI.onSettingsChanged', () => {
    it('returns no-op unsubscribe when Tauri is not available', async () => {
      const callback = vi.fn()
      const unsubscribe = await tauriAPI.onSettingsChanged(callback)

      expect(typeof unsubscribe).toBe('function')
      // Calling unsubscribe should not throw
      unsubscribe()
    })

    it('subscribes to settings-changed event when Tauri is available', async () => {
      setupTauriEnvironment()
      const mockUnlisten = vi.fn()
      ;(listen as Mock).mockResolvedValueOnce(mockUnlisten)
      const callback = vi.fn()

      const unsubscribe = await tauriAPI.onSettingsChanged(callback)

      expect(listen).toHaveBeenCalledWith('settings-changed', expect.any(Function))
      expect(unsubscribe).toBe(mockUnlisten)
    })

    it('calls callback with event payload', async () => {
      setupTauriEnvironment()
      let eventHandler: (event: { payload: unknown }) => void = () => {}
      ;(listen as Mock).mockImplementation((_, handler) => {
        eventHandler = handler
        return vi.fn()
      })
      const callback = vi.fn()

      await tauriAPI.onSettingsChanged(callback)

      // Simulate event
      eventHandler({ payload: { key: 'theme', value: 'dark' } })

      expect(callback).toHaveBeenCalledWith({ key: 'theme', value: 'dark' })
    })
  })

  describe('tauriAPI.onLogicViolation', () => {
    it('returns no-op unsubscribe when Tauri is not available', async () => {
      const callback = vi.fn()
      const unsubscribe = await tauriAPI.onLogicViolation(callback)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('subscribes to brainscan-violation event when Tauri is available', async () => {
      setupTauriEnvironment()
      const mockUnlisten = vi.fn()
      ;(listen as Mock).mockResolvedValueOnce(mockUnlisten)
      const callback = vi.fn()

      await tauriAPI.onLogicViolation(callback)

      expect(listen).toHaveBeenCalledWith('brainscan-violation', expect.any(Function))
    })

    it('calls callback with violation payload', async () => {
      setupTauriEnvironment()
      let eventHandler: (event: { payload: unknown }) => void = () => {}
      ;(listen as Mock).mockImplementation((_, handler) => {
        eventHandler = handler
        return vi.fn()
      })
      const callback = vi.fn()

      await tauriAPI.onLogicViolation(callback)

      const violation: BrainScanMatch = {
        file: 'test.ts',
        line: 42,
        content: 'violation content',
        score: 0.95,
      }
      eventHandler({ payload: violation })

      expect(callback).toHaveBeenCalledWith(violation)
    })
  })

  describe('tauriAPI.onBackendStatusChanged', () => {
    it('returns no-op unsubscribe when Tauri is not available', async () => {
      const callback = vi.fn()
      const unsubscribe = await tauriAPI.onBackendStatusChanged(callback)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('subscribes to backend-status-changed event when Tauri is available', async () => {
      setupTauriEnvironment()
      const mockUnlisten = vi.fn()
      ;(listen as Mock).mockResolvedValueOnce(mockUnlisten)
      const callback = vi.fn()

      await tauriAPI.onBackendStatusChanged(callback)

      expect(listen).toHaveBeenCalledWith('backend-status-changed', expect.any(Function))
    })

    it('calls callback with status payload', async () => {
      setupTauriEnvironment()
      let eventHandler: (event: { payload: unknown }) => void = () => {}
      ;(listen as Mock).mockImplementation((_, handler) => {
        eventHandler = handler
        return vi.fn()
      })
      const callback = vi.fn()

      await tauriAPI.onBackendStatusChanged(callback)

      const status: BackendStatus = { running: true, port: 8000 }
      eventHandler({ payload: status })

      expect(callback).toHaveBeenCalledWith(status)
    })
  })

  // ==================== Compatibility Layer Tests ====================

  describe('createVibeTechBridge', () => {
    it('creates bridge with all required methods', () => {
      const bridge = createVibeTechBridge()

      expect(bridge.searchLogic).toBe(tauriAPI.searchLogic)
      expect(bridge.ping).toBe(tauriAPI.ping)
      expect(bridge.getSetting).toBe(tauriAPI.getSetting)
      expect(bridge.setSetting).toBe(tauriAPI.setSetting)
      expect(typeof bridge.onLogicViolation).toBe('function')
      expect(typeof bridge.onSettingsChanged).toBe('function')
    })

    it('onLogicViolation wraps tauriAPI.onLogicViolation', () => {
      setupTauriEnvironment()
      ;(listen as Mock).mockResolvedValue(vi.fn())

      const bridge = createVibeTechBridge()
      const callback = vi.fn()

      bridge.onLogicViolation(callback)

      // Should call through to tauriAPI
      expect(listen).toHaveBeenCalled()
    })

    it('onSettingsChanged wraps tauriAPI.onSettingsChanged', () => {
      setupTauriEnvironment()
      ;(listen as Mock).mockResolvedValue(vi.fn())

      const bridge = createVibeTechBridge()
      const callback = vi.fn()

      bridge.onSettingsChanged(callback)

      expect(listen).toHaveBeenCalled()
    })
  })
})
