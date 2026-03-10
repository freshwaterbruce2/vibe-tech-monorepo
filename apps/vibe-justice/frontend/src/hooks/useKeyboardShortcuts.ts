import { useEffect } from 'react';

type ShortcutHandler = () => void;

interface ShortcutConfig {
  onNewInvestigation?: ShortcutHandler;
  onExport?: ShortcutHandler;
  onSettings?: ShortcutHandler;
}

export function useKeyboardShortcuts({
  onNewInvestigation,
  onExport,
  onSettings,
}: ShortcutConfig = {}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Disable if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping) return;

      // 2. Ctrl + N (New Investigation)
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        onNewInvestigation?.();
      }

      // 3. Ctrl + E (Export)
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        onExport?.();
      }

      // 4. Ctrl + / (Settings)
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        onSettings?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewInvestigation, onExport, onSettings]);
}
