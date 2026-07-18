/**
 * Global keyboard shortcuts for the main app shell.
 */

import { useEffect } from 'react';

interface KeyboardShortcutHandlers {
  setGlobalSearchOpen: (open: boolean) => void;
  setAiChatOpen: (open: boolean) => void;
  setChatMode: (mode: 'chat' | 'agent') => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  terminalOpen: boolean;
  setGitPanelOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

/** Build the global keydown handler that maps shortcut combos to actions. */
function createKeyDownHandler(handlers: KeyboardShortcutHandlers) {
  const {
    setGlobalSearchOpen,
    setAiChatOpen,
    setChatMode,
    setKeyboardShortcutsOpen,
    setTerminalOpen,
    terminalOpen,
    setGitPanelOpen,
    toggleCommandPalette,
  } = handlers;

  return (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      setGlobalSearchOpen(true);
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setAiChatOpen(true);
      setChatMode('agent');
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      setGitPanelOpen(true);
    }

    if (e.ctrlKey && ((e.shiftKey && e.key === 'P') || (!e.shiftKey && e.key === 'p'))) {
      e.preventDefault();
      toggleCommandPalette();
    }

    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      const handleCtrlS = (nextEvent: KeyboardEvent) => {
        if (nextEvent.ctrlKey && nextEvent.key === 's') {
          nextEvent.preventDefault();
          setKeyboardShortcutsOpen(true);
          globalThis.removeEventListener('keydown', handleCtrlS);
        }
      };
      globalThis.addEventListener('keydown', handleCtrlS);
      setTimeout(() => globalThis.removeEventListener('keydown', handleCtrlS), 2000);
    }

    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      setTerminalOpen(!terminalOpen);
    }
  };
}

/** Hook for keyboard shortcuts */
export function useKeyboardShortcuts(props: {
  setGlobalSearchOpen: (open: boolean) => void;
  setAiChatOpen: (open: boolean) => void;
  setChatMode: (mode: 'chat' | 'agent') => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  terminalOpen?: boolean;
  setGitPanelOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}) {
  const {
    setGlobalSearchOpen,
    setAiChatOpen,
    setChatMode,
    setKeyboardShortcutsOpen,
    setTerminalOpen,
    terminalOpen = false,
    setGitPanelOpen,
    toggleCommandPalette,
  } = props;

  useEffect(() => {
    const handleKeyDown = createKeyDownHandler({
      setGlobalSearchOpen,
      setAiChatOpen,
      setChatMode,
      setKeyboardShortcutsOpen,
      setTerminalOpen,
      terminalOpen,
      setGitPanelOpen,
      toggleCommandPalette,
    });

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [
    setGlobalSearchOpen,
    setAiChatOpen,
    setChatMode,
    setKeyboardShortcutsOpen,
    setTerminalOpen,
    terminalOpen,
    setGitPanelOpen,
    toggleCommandPalette,
  ]);
}
