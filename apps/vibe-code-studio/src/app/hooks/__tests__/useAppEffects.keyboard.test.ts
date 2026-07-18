import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcuts } from '../useAppEffects';

/**
 * Reachability regression guards: the command palette had no key binding (dead
 * UI), and the Git panel could only be reached programmatically. These tests
 * lock the global keydown map — Ctrl+Shift+G opens Source Control, and both
 * Ctrl+Shift+P and Ctrl+P toggle the command palette — alongside the existing
 * combos so none regress.
 */
vi.mock('@vibetech/core', () => ({
  SecureApiKeyManager: { getInstance: () => ({ getApiKey: vi.fn() }) },
}));
vi.mock('../../../services/ai/AIProviderFactory', () => ({
  AIProviderFactory: {
    getInstance: () => ({
      initializeAllProviders: vi.fn(),
      initializeProvider: vi.fn(),
    }),
  },
}));
vi.mock('../../../modules/core/services/DatabaseManager', () => ({
  getDatabase: vi.fn(),
  getDbInitError: vi.fn(() => null),
}));

function makeHandlers() {
  return {
    setGlobalSearchOpen: vi.fn(),
    setAiChatOpen: vi.fn(),
    setChatMode: vi.fn(),
    setKeyboardShortcutsOpen: vi.fn(),
    setTerminalOpen: vi.fn(),
    terminalOpen: false,
    setGitPanelOpen: vi.fn(),
    toggleCommandPalette: vi.fn(),
  };
}

function press(init: KeyboardEventInit) {
  globalThis.dispatchEvent(new KeyboardEvent('keydown', init));
}

describe('useKeyboardShortcuts — reachability bindings', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it('opens the Git panel on Ctrl+Shift+G', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    press({ ctrlKey: true, shiftKey: true, key: 'G' });

    expect(handlers.setGitPanelOpen).toHaveBeenCalledWith(true);
  });

  it('toggles the command palette on Ctrl+Shift+P', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    press({ ctrlKey: true, shiftKey: true, key: 'P' });

    expect(handlers.toggleCommandPalette).toHaveBeenCalledTimes(1);
  });

  it('toggles the command palette on Ctrl+P', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    press({ ctrlKey: true, key: 'p' });

    expect(handlers.toggleCommandPalette).toHaveBeenCalledTimes(1);
  });

  it('still opens global search on Ctrl+Shift+F and agent mode on Ctrl+Shift+A', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    press({ ctrlKey: true, shiftKey: true, key: 'F' });
    press({ ctrlKey: true, shiftKey: true, key: 'A' });

    expect(handlers.setGlobalSearchOpen).toHaveBeenCalledWith(true);
    expect(handlers.setAiChatOpen).toHaveBeenCalledWith(true);
    expect(handlers.setChatMode).toHaveBeenCalledWith('agent');
    // Git / palette must not fire for unrelated combos
    expect(handlers.setGitPanelOpen).not.toHaveBeenCalled();
    expect(handlers.toggleCommandPalette).not.toHaveBeenCalled();
  });

  it('toggles the terminal on Ctrl+` without touching new bindings', () => {
    const handlers = makeHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    press({ ctrlKey: true, key: '`' });

    expect(handlers.setTerminalOpen).toHaveBeenCalledWith(true);
    expect(handlers.toggleCommandPalette).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount', () => {
    const handlers = makeHandlers();
    const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));

    unmount();
    press({ ctrlKey: true, shiftKey: true, key: 'G' });

    expect(handlers.setGitPanelOpen).not.toHaveBeenCalled();
  });
});
