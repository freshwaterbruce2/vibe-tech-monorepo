import { useCallback, useEffect, useState } from 'react';

export interface Position {
  x: number;
  y: number;
}
export interface Size {
  w: number;
  h: number;
}

export interface OpenWindow {
  id: string;
  type:
    | 'terminal'
    | 'memory'
    | 'app'
    | 'explorer'
    | 'orchestrator'
    | 'database'
    | 'memory-viz'
    | 'affected';
  title: string;
  url?: string;
  pid?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  maximized?: boolean;
  minimized?: boolean;
  preMax?: { pos: Position; size: Size };
}

interface PersistedLayout {
  version: number;
  windows: OpenWindow[];
  activeWindowId: string | null;
  timestamp: number;
}

export function useDesktopWindowManager(stopApp: (pid: number) => Promise<unknown>) {
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>(() => {
    try {
      // eslint-disable-next-line electron-security/no-localstorage-electron
      const saved = localStorage.getItem('vtde:layout:v2');
      if (saved) {
        const layout: PersistedLayout = JSON.parse(saved);
        if (layout.version === 2) {
          return layout.windows
            .filter((w) => !w.pid)
            .map((w) => ({ ...w, minimized: w.minimized ?? false }));
        }
      }
    } catch (e) {
      console.error('Failed to restore VTDE layout:', e);
    }
    return [];
  });

  const [activeWindowId, setActiveWindowId] = useState<string | null>(() => {
    try {
      // eslint-disable-next-line electron-security/no-localstorage-electron
      const saved = localStorage.getItem('vtde:layout:v2');
      if (saved) {
        const layout: PersistedLayout = JSON.parse(saved);
        if (layout.version === 2) {
          return layout.activeWindowId;
        }
      }
    } catch {
      // Ignored
    }
    return null;
  });

  useEffect(() => {
    const saveLayout = () => {
      try {
        const layout: PersistedLayout = {
          version: 2,
          windows: openWindows,
          activeWindowId,
          timestamp: Date.now(),
        };
        // eslint-disable-next-line electron-security/no-localstorage-electron
        localStorage.setItem('vtde:layout:v2', JSON.stringify(layout));
      } catch (e) {
        console.error('Failed to save VTDE layout:', e);
      }
    };

    const timeoutId = setTimeout(saveLayout, 500);
    return () => clearTimeout(timeoutId);
  }, [openWindows, activeWindowId]);

  const toggleWindow = useCallback((type: OpenWindow['type']) => {
    setOpenWindows((prev) => {
      const id = `vtde-${type}`;
      const exists = prev.find((w) => w.id === id);
      if (exists) {
        const updates: Partial<OpenWindow> = { minimized: false };

        const minWindowWidth = 360;
        const minWindowHeight = 240;
        const viewportWidth = window.innerWidth;
        const viewportHeight = Math.max(320, window.innerHeight - 48);

        if (typeof exists.w !== 'number' || exists.w < minWindowWidth) {
          updates.w = ['memory', 'orchestrator'].includes(type)
            ? 500
            : type === 'terminal'
              ? 720
              : 900;
        }
        if (typeof exists.h !== 'number' || exists.h < minWindowHeight) {
          updates.h = type === 'memory' ? 520 : type === 'terminal' ? 420 : 600;
        }

        const width = updates.w ?? exists.w ?? 640;
        const height = updates.h ?? exists.h ?? 480;

        if (
          typeof exists.x !== 'number' ||
          typeof exists.y !== 'number' ||
          exists.x > viewportWidth - 48 ||
          exists.y > viewportHeight - 48 ||
          exists.x < -width + 48 ||
          exists.y < -height + 48
        ) {
          updates.x = Math.max(24, Math.round((viewportWidth - width) / 2));
          updates.y = Math.max(24, Math.round((viewportHeight - height) / 2));
        }

        setActiveWindowId(id);
        return prev.map((w) => (w.id === id ? { ...w, ...updates } : w));
      }

      const titles: Record<string, string> = {
        terminal: 'VTDE Terminal',
        memory: 'Neural Memory',
        explorer: 'Vibe Explorer',
        orchestrator: 'Agent Orchestrator',
        database: 'Database Explorer',
        'memory-viz': 'Memory Visualizer',
        affected: 'Affected Intelligence',
      };

      const newWin: OpenWindow = {
        id,
        type,
        title: titles[type] ?? type,
      };
      setActiveWindowId(id);
      return [...prev, newWin];
    });
  }, []);

  const handleCloseWindow = useCallback((id: string) => {
    setOpenWindows((prev) => {
      const win = prev.find((w) => w.id === id);
      if (win?.type === 'app' && win.pid) {
        void stopApp(win.pid);
      }
      return prev.filter((w) => w.id !== id);
    });
  }, [stopApp]);

  const updateWindow = useCallback((id: string, updates: Partial<OpenWindow>) => {
    setOpenWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  }, []);

  const handleWindowClick = useCallback(
    (windowId: string) => {
      const window = openWindows.find((w) => w.id === windowId);
      if (!window) return;

      if (window.minimized) {
        updateWindow(windowId, { minimized: false });
        setActiveWindowId(windowId);
      } else if (windowId === activeWindowId) {
        updateWindow(windowId, { minimized: true });
      } else {
        setActiveWindowId(windowId);
      }
    },
    [openWindows, activeWindowId, updateWindow],
  );

  return {
    openWindows,
    setOpenWindows,
    activeWindowId,
    setActiveWindowId,
    toggleWindow,
    handleCloseWindow,
    updateWindow,
    handleWindowClick
  };
}
