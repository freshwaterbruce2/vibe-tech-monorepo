/**
 * Terminal Widget - Tauri shell-based PTY terminal emulator with multi-tab sessions,
 * split panes, and layout persistence.
 */
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';

type SessionStatus = 'starting' | 'ready' | 'error' | 'closed';
type SessionAction = 'copy' | 'paste' | 'clear';
type PaneLayout = 'single' | 'vertical' | 'horizontal';

interface PtyOutputEvent {
  pty_id: number;
  data: string;
}

interface PtyExitEvent {
  pty_id: number;
  reason: string;
}

interface TerminalPane {
  id: number;
  title: string;
  version: number;
}

interface TerminalTab {
  activePaneId: number;
  id: number;
  layout: PaneLayout;
  panes: TerminalPane[];
  title: string;
}

interface TerminalTabMeta {
  message: string;
  ptyId: number | null;
  status: SessionStatus;
}

interface TerminalLayoutState {
  activeTabId: number;
  nextPaneId: number;
  nextTabId: number;
  tabs: TerminalTab[];
}

interface PersistedPane {
  id: number;
  title: string;
}

interface PersistedTab {
  activePaneId: number;
  id: number;
  layout: PaneLayout;
  panes: PersistedPane[];
  title: string;
}

interface PersistedTerminalLayout {
  activeTabId: number;
  nextPaneId: number;
  nextTabId: number;
  tabs: PersistedTab[];
}

interface ContextMenuState {
  paneId: number | null;
  tabId: number;
  x: number;
  y: number;
}

interface SessionCommand {
  action: SessionAction;
  nonce: number;
  paneId: number;
}

interface TerminalSessionPaneProps {
  active: boolean;
  command: SessionCommand | null;
  label: string;
  meta?: TerminalTabMeta;
  onActivate: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onMetaChange: (paneId: number, meta: TerminalTabMeta) => void;
  paneId: number;
}

const TERMINAL_THEME = {
  background: '#080c14',
  cursor: '#38bdf8',
  foreground: '#e2e8f0',
  selectionBackground: 'rgba(56, 189, 248, 0.3)',
};

const INITIAL_MESSAGE = 'Spawning shell...';
const STORAGE_KEY = 'vtde:terminal:v2';

function createPane(paneId: number): TerminalPane {
  return {
    id: paneId,
    title: `Pane ${paneId}`,
    version: 0,
  };
}

function createTerminalTab(tabId: number, paneId: number): TerminalTab {
  return {
    activePaneId: paneId,
    id: tabId,
    layout: 'single',
    panes: [createPane(paneId)],
    title: `Tab ${tabId}`,
  };
}

function createStartingMeta(message = INITIAL_MESSAGE): TerminalTabMeta {
  return {
    message,
    ptyId: null,
    status: 'starting',
  };
}

function buildPaneMetaState(layoutState: TerminalLayoutState): Record<number, TerminalTabMeta> {
  const meta: Record<number, TerminalTabMeta> = {};
  layoutState.tabs.forEach((tab) => {
    tab.panes.forEach((pane) => {
      meta[pane.id] = createStartingMeta();
    });
  });
  return meta;
}

function buildDefaultLayoutState(): TerminalLayoutState {
  return {
    activeTabId: 1,
    nextPaneId: 2,
    nextTabId: 2,
    tabs: [createTerminalTab(1, 1)],
  };
}

function normalizeLayout(layout: unknown): PaneLayout {
  return layout === 'vertical' || layout === 'horizontal' ? layout : 'single';
}

function getStatusLabel(status: SessionStatus) {
  switch (status) {
    case 'starting':
      return 'Starting';
    case 'ready':
      return 'Ready';
    case 'error':
      return 'Error';
    case 'closed':
      return 'Closed';
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function loadLayoutState(): TerminalLayoutState {
  const fallback = buildDefaultLayoutState();
  if (typeof window === 'undefined') return fallback;

  try {
    // eslint-disable-next-line electron-security/no-localstorage-electron
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<PersistedTerminalLayout>;
    if (!Array.isArray(parsed.tabs)) return fallback;

    const tabs = parsed.tabs
      .map((tab): TerminalTab | null => {
        if (!tab || typeof tab.id !== 'number' || !Array.isArray(tab.panes)) return null;

        const panes = tab.panes
          .map((pane): TerminalPane | null => {
            if (!pane || typeof pane.id !== 'number') return null;
            return {
              id: pane.id,
              title: typeof pane.title === 'string' && pane.title.trim() ? pane.title : `Pane ${pane.id}`,
              version: 0,
            };
          })
          .filter((pane): pane is TerminalPane => pane !== null);

        if (!panes.length) return null;

        const activePaneId = panes.some((pane) => pane.id === tab.activePaneId)
          ? tab.activePaneId
          : panes[0].id;

        return {
          activePaneId,
          id: tab.id,
          layout: normalizeLayout(tab.layout),
          panes,
          title: typeof tab.title === 'string' && tab.title.trim() ? tab.title : `Tab ${tab.id}`,
        };
      })
      .filter((tab): tab is TerminalTab => tab !== null);

    if (!tabs.length) return fallback;

    const maxPaneId = Math.max(...tabs.flatMap((tab) => tab.panes.map((pane) => pane.id)), 0);
    const maxTabId = Math.max(...tabs.map((tab) => tab.id), 0);
    const activeTabId = tabs.some((tab) => tab.id === parsed.activeTabId)
      ? parsed.activeTabId ?? tabs[0].id
      : tabs[0].id;

    return {
      activeTabId,
      nextPaneId:
        typeof parsed.nextPaneId === 'number' && Number.isFinite(parsed.nextPaneId)
          ? Math.max(parsed.nextPaneId, maxPaneId + 1)
          : maxPaneId + 1,
      nextTabId:
        typeof parsed.nextTabId === 'number' && Number.isFinite(parsed.nextTabId)
          ? Math.max(parsed.nextTabId, maxTabId + 1)
          : maxTabId + 1,
      tabs,
    };
  } catch (error) {
    console.error('Failed to restore VTDE terminal layout:', error);
    return fallback;
  }
}

function toPersistedLayoutState(layoutState: TerminalLayoutState): PersistedTerminalLayout {
  return {
    activeTabId: layoutState.activeTabId,
    nextPaneId: layoutState.nextPaneId,
    nextTabId: layoutState.nextTabId,
    tabs: layoutState.tabs.map((tab) => ({
      activePaneId: tab.activePaneId,
      id: tab.id,
      layout: tab.layout,
      panes: tab.panes.map((pane) => ({
        id: pane.id,
        title: pane.title,
      })),
      title: tab.title,
    })),
  };
}

function TerminalSessionPane({
  active,
  command,
  label,
  meta,
  onActivate,
  onContextMenu,
  onMetaChange,
  paneId,
}: TerminalSessionPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const ptyIdRef = useRef<number | null>(null);
  const handledCommandRef = useRef(0);
  const activeRef = useRef(active);

  const reportMeta = useCallback(
    (status: SessionStatus, message: string, ptyId = ptyIdRef.current) => {
      onMetaChange(paneId, {
        message,
        ptyId,
        status,
      });
    },
    [onMetaChange, paneId],
  );

  const copySelection = useCallback(async () => {
    const term = xtermRef.current;
    if (!term) return;

    if (!term.hasSelection()) {
      reportMeta('ready', 'Nothing selected to copy.');
      return;
    }

    const text = term.getSelection();
    if (!text || !navigator.clipboard?.writeText) {
      reportMeta('error', 'Clipboard copy is unavailable in this environment.');
      return;
    }

    await navigator.clipboard.writeText(text);
    term.clearSelection();
    reportMeta('ready', 'Selection copied.');
  }, [reportMeta]);

  const pasteClipboard = useCallback(async () => {
    const ptyId = ptyIdRef.current;
    if (ptyId === null) {
      reportMeta('error', 'Shell is not ready for paste yet.');
      return;
    }

    if (!navigator.clipboard?.readText) {
      reportMeta('error', 'Clipboard paste is unavailable in this environment.');
      return;
    }

    const text = await navigator.clipboard.readText();
    if (!text) {
      reportMeta('ready', 'Clipboard is empty.');
      return;
    }

    await invoke('write_pty', { data: text, pty_id: ptyId });
    reportMeta('ready', `Pasted ${text.length} character${text.length === 1 ? '' : 's'}.`);
  }, [reportMeta]);

  const clearTerminal = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.clear();
    reportMeta('ready', 'Terminal cleared.');
  }, [reportMeta]);

  const resizeTerminal = useCallback(async (force = false) => {
    const term = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    const ptyId = ptyIdRef.current;
    if (!term || !fitAddon || ptyId === null || !terminalRef.current || (!force && !activeRef.current)) {
      return;
    }

    fitAddon.fit();
    await invoke('resize_pty', {
      cols: term.cols,
      pty_id: ptyId,
      rows: term.rows,
    });
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      allowProposedApi: false,
      cursorBlink: true,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, "Courier New", monospace',
      fontSize: 14,
      scrollback: 10000,
      theme: TERMINAL_THEME,
    });
    const fitAddon = new FitAddon();
    const unlistenFns: UnlistenFn[] = [];
    let mounted = true;

    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    term.focus();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    reportMeta('starting', INITIAL_MESSAGE, null);

    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;

      if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
        void copySelection().catch((error) => {
          reportMeta('error', getErrorMessage(error, 'Copy failed.'));
        });
        return false;
      }

      if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
        void pasteClipboard().catch((error) => {
          reportMeta('error', getErrorMessage(error, 'Paste failed.'));
        });
        return false;
      }

      return true;
    });

    async function startSession() {
      try {
        const id = await invoke<number>('spawn_pty');
        if (!mounted) {
          await invoke('close_pty', { pty_id: id }).catch(() => undefined);
          return;
        }

        ptyIdRef.current = id;
        reportMeta('starting', `Shell allocated. PTY ${id} is handshaking...`, id);

        term.onData((data) => {
          void invoke('write_pty', { data, pty_id: id }).catch((error) => {
            reportMeta('error', getErrorMessage(error, 'Failed to write to PTY.'), id);
          });
        });

        if (terminalRef.current) {
          const observer = new ResizeObserver(() => {
            void resizeTerminal().catch((error) => {
              reportMeta('error', getErrorMessage(error, 'Failed to resize PTY.'), id);
            });
          });
          observer.observe(terminalRef.current);
          resizeObserverRef.current = observer;
        }

        const unlistenOutput = await listen<PtyOutputEvent>('pty-output', (event) => {
          if (event.payload.pty_id !== id) return;
          term.write(event.payload.data);
        });
        const unlistenExit = await listen<PtyExitEvent>('pty-exit', (event) => {
          if (event.payload.pty_id !== id) return;
          reportMeta('closed', `Shell exited: ${event.payload.reason}`, id);
          term.write(`\r\n\x1b[33mShell exited: ${event.payload.reason}\x1b[0m\r\n`);
        });

        unlistenFns.push(unlistenOutput, unlistenExit);
        await resizeTerminal(true);
        reportMeta('ready', `Shell ready on PTY ${id}.`, id);
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to start PTY.');
        reportMeta('error', message);
        term.write(`\r\n\x1b[31m${message}\x1b[0m\r\n`);
      }
    }

    void startSession();

    return () => {
      mounted = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      unlistenFns.forEach((fn) => fn());
      const ptyId = ptyIdRef.current;
      ptyIdRef.current = null;
      if (ptyId !== null) {
        void invoke('close_pty', { pty_id: ptyId }).catch(() => undefined);
      }
      fitAddonRef.current = null;
      xtermRef.current = null;
      term.dispose();
    };
  }, [copySelection, pasteClipboard, reportMeta, resizeTerminal]);

  useEffect(() => {
    if (!active) return;

    const raf = window.requestAnimationFrame(() => {
      xtermRef.current?.focus();
      void resizeTerminal().catch((error) => {
        reportMeta('error', getErrorMessage(error, 'Failed to resize PTY.'));
      });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [active, reportMeta, resizeTerminal]);

  useEffect(() => {
    const nextCommand = command;
    if (!nextCommand) return;
    const { action, nonce, paneId: targetPaneId } = nextCommand;
    if (targetPaneId !== paneId || nonce === handledCommandRef.current) return;
    handledCommandRef.current = nonce;

    async function runCommand() {
      switch (action) {
        case 'copy':
          await copySelection();
          break;
        case 'paste':
          await pasteClipboard();
          break;
        case 'clear':
          clearTerminal();
          break;
      }
    }

    void runCommand().catch((error) => {
      reportMeta('error', getErrorMessage(error, `Failed to ${action}.`));
    });
  }, [clearTerminal, command, copySelection, paneId, pasteClipboard, reportMeta]);

  return (
    <div
      className={`vtde-terminal__pane${active ? ' vtde-terminal__pane--active' : ''}`}
      onContextMenu={onContextMenu}
      onMouseDownCapture={onActivate}
    >
      <div className="vtde-terminal__pane-bar">
        <span className={`vtde-terminal__tab-dot vtde-terminal__tab-dot--${meta?.status ?? 'starting'}`} />
        <span className="vtde-terminal__pane-label">{label}</span>
        <span className="vtde-terminal__pane-meta">
          {meta?.ptyId != null ? `PTY ${meta.ptyId}` : getStatusLabel(meta?.status ?? 'starting')}
        </span>
      </div>
      <div ref={terminalRef} className="vtde-terminal__canvas" />
    </div>
  );
}

export function Terminal({ onClose }: { onClose: () => void }) {
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [layoutState, setLayoutState] = useState<TerminalLayoutState>(loadLayoutState);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [paneMeta, setPaneMeta] = useState<Record<number, TerminalTabMeta>>(() =>
    buildPaneMetaState(loadLayoutState()),
  );
  const [sessionCommand, setSessionCommand] = useState<SessionCommand | null>(null);

  const activeTab =
    layoutState.tabs.find((tab) => tab.id === layoutState.activeTabId) ?? layoutState.tabs[0] ?? null;
  const activePane =
    activeTab?.panes.find((pane) => pane.id === activeTab.activePaneId) ?? activeTab?.panes[0] ?? null;
  const activeMeta = activePane ? paneMeta[activePane.id] ?? createStartingMeta() : createStartingMeta();

  useEffect(() => {
    // eslint-disable-next-line electron-security/no-localstorage-electron
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedLayoutState(layoutState)));
  }, [layoutState]);

  const activatePane = useCallback((tabId: number, paneId: number) => {
    setLayoutState((current) => ({
      ...current,
      activeTabId: tabId,
      tabs: current.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              activePaneId: paneId,
            }
          : tab,
      ),
    }));
  }, []);

  const cycleTabs = useCallback((direction: 1 | -1) => {
    setLayoutState((current) => {
      const index = current.tabs.findIndex((tab) => tab.id === current.activeTabId);
      if (index === -1 || current.tabs.length <= 1) return current;
      const nextIndex = (index + direction + current.tabs.length) % current.tabs.length;
      return {
        ...current,
        activeTabId: current.tabs[nextIndex]?.id ?? current.activeTabId,
      };
    });
  }, []);

  const createTab = useCallback(() => {
    let paneId = 0;
    setLayoutState((current) => {
      const tabId = current.nextTabId;
      paneId = current.nextPaneId;
      return {
        activeTabId: tabId,
        nextPaneId: paneId + 1,
        nextTabId: tabId + 1,
        tabs: [...current.tabs, createTerminalTab(tabId, paneId)],
      };
    });
    if (paneId !== 0) {
      setPaneMeta((current) => ({
        ...current,
        [paneId]: createStartingMeta('Restored layout slot. Spawning shell...'),
      }));
    }
    setContextMenu(null);
  }, []);

  const closeTab = useCallback(
    (tabId: number) => {
      if (layoutState.tabs.length === 1) {
        onClose();
        return;
      }

      const paneIds = layoutState.tabs.find((tab) => tab.id === tabId)?.panes.map((pane) => pane.id) ?? [];

      setLayoutState((current) => {
        const index = current.tabs.findIndex((tab) => tab.id === tabId);
        if (index === -1) return current;
        const remainingTabs = current.tabs.filter((tab) => tab.id !== tabId);
        const nextActiveTabId =
          current.activeTabId === tabId
            ? remainingTabs[index]?.id ?? remainingTabs[index - 1]?.id ?? remainingTabs[0]?.id ?? current.activeTabId
            : current.activeTabId;

        return {
          ...current,
          activeTabId: nextActiveTabId,
          tabs: remainingTabs,
        };
      });
      if (paneIds.length) {
        setPaneMeta((current) =>
          Object.fromEntries(Object.entries(current).filter(([key]) => !paneIds.includes(Number(key)))),
        );
      }
      setContextMenu((current) => (current?.tabId === tabId ? null : current));
    },
    [layoutState.tabs, onClose],
  );

  const splitPane = useCallback((tabId: number, paneId: number, layout: Exclude<PaneLayout, 'single'>) => {
    let paneIdNew = 0;
    setLayoutState((current) => {
      paneIdNew = current.nextPaneId;
      return {
        ...current,
        nextPaneId: paneIdNew + 1,
        tabs: current.tabs.map((tab) => {
          if (tab.id !== tabId) return tab;
          const insertIndex = Math.max(tab.panes.findIndex((pane) => pane.id === paneId), 0);
          const panes = [...tab.panes];
          panes.splice(insertIndex + 1, 0, createPane(paneIdNew));
          return {
            ...tab,
            activePaneId: paneIdNew,
            layout,
            panes,
          };
        }),
      };
    });
    if (paneIdNew !== 0) {
      setPaneMeta((current) => ({
        ...current,
        [paneIdNew]: createStartingMeta('Spawning split pane shell...'),
      }));
    }
    setContextMenu(null);
  }, []);

  const closePane = useCallback(
    (tabId: number, paneId: number) => {
      const tab = layoutState.tabs.find((item) => item.id === tabId);
      if (!tab) return;
      if (tab.panes.length === 1) {
        closeTab(tabId);
        return;
      }

      setLayoutState((current) => ({
        ...current,
        tabs: current.tabs.map((item) => {
          if (item.id !== tabId) return item;
          const paneIndex = item.panes.findIndex((pane) => pane.id === paneId);
          const panes = item.panes.filter((pane) => pane.id !== paneId);
          const fallbackPane = panes[paneIndex] ?? panes[paneIndex - 1] ?? panes[0];
          return {
            ...item,
            activePaneId:
              item.activePaneId === paneId ? (fallbackPane?.id ?? item.activePaneId) : item.activePaneId,
            layout: panes.length <= 1 ? 'single' : item.layout,
            panes,
          };
        }),
      }));
      setPaneMeta((current) =>
        Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== paneId)),
      );
      setContextMenu((current) => (current?.paneId === paneId ? null : current));
    },
    [closeTab, layoutState.tabs],
  );

  const restartPane = useCallback((tabId: number, paneId: number) => {
    setLayoutState((current) => ({
      ...current,
      activeTabId: tabId,
      tabs: current.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              activePaneId: paneId,
              panes: tab.panes.map((pane) =>
                pane.id === paneId
                  ? {
                      ...pane,
                      version: pane.version + 1,
                    }
                  : pane,
              ),
            }
          : tab,
      ),
    }));
    setPaneMeta((current) => ({
      ...current,
      [paneId]: createStartingMeta('Restarting shell...'),
    }));
    setContextMenu(null);
  }, []);

  const updateMeta = useCallback((paneId: number, meta: TerminalTabMeta) => {
    setPaneMeta((current) => ({
      ...current,
      [paneId]: meta,
    }));
  }, []);

  const openContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, tabId: number, paneId: number | null) => {
      event.preventDefault();
      const targetPaneId = paneId ?? layoutState.tabs.find((tab) => tab.id === tabId)?.activePaneId ?? null;
      if (targetPaneId !== null) {
        activatePane(tabId, targetPaneId);
      }
      setContextMenu({
        paneId: targetPaneId,
        tabId,
        x: Math.min(event.clientX, window.innerWidth - 220),
        y: Math.min(event.clientY, window.innerHeight - 280),
      });
    },
    [activatePane, layoutState.tabs],
  );

  const dispatchSessionAction = useCallback((action: SessionAction, paneId: number) => {
    setSessionCommand({
      action,
      nonce: Date.now(),
      paneId,
    });
  }, []);

  useEffect(() => {
    function handlePointer(event: PointerEvent) {
      if (contextMenuRef.current?.contains(event.target as Node)) return;
      setContextMenu(null);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setContextMenu(null);
        return;
      }

      if (!(event.ctrlKey && event.shiftKey)) return;

      if (event.code === 'KeyT') {
        event.preventDefault();
        createTab();
        return;
      }

      if (event.code === 'KeyW' && activeTab) {
        event.preventDefault();
        if (activePane) {
          closePane(activeTab.id, activePane.id);
        }
        return;
      }

      if (event.code === 'PageUp') {
        event.preventDefault();
        cycleTabs(-1);
        return;
      }

      if (event.code === 'PageDown') {
        event.preventDefault();
        cycleTabs(1);
      }
    }

    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [activePane, activeTab, closePane, createTab, cycleTabs]);

  const contextPaneId = contextMenu?.paneId ?? activePane?.id ?? null;
  const paneCount = activeTab?.panes.length ?? 0;
  const menuItems =
    contextMenu && contextPaneId !== null
      ? [
          { label: 'New Tab', onSelect: createTab },
          { label: 'Split Right', onSelect: () => splitPane(contextMenu.tabId, contextPaneId, 'vertical') },
          { label: 'Split Down', onSelect: () => splitPane(contextMenu.tabId, contextPaneId, 'horizontal') },
          { label: 'Restart Pane', onSelect: () => restartPane(contextMenu.tabId, contextPaneId) },
          { label: 'Copy Selection', onSelect: () => dispatchSessionAction('copy', contextPaneId) },
          { label: 'Paste Clipboard', onSelect: () => dispatchSessionAction('paste', contextPaneId) },
          { label: 'Clear Pane', onSelect: () => dispatchSessionAction('clear', contextPaneId) },
          { label: 'Close Pane', onSelect: () => closePane(contextMenu.tabId, contextPaneId) },
          { label: 'Close Tab', onSelect: () => closeTab(contextMenu.tabId) },
        ]
      : [];

  return (
    <div className="vtde-terminal">
      <div className="vtde-terminal__header">
        <div className="vtde-terminal__toolbar">
          <span className="vtde-terminal__title">{'>_ Native Terminal'}</span>
          <span className={`vtde-terminal__status vtde-terminal__status--${activeMeta.status}`}>
            {getStatusLabel(activeMeta.status)}
          </span>
          <span className="vtde-terminal__meta">
            {activePane ? `${activePane.title} · ${paneCount} pane${paneCount === 1 ? '' : 's'}` : 'No pane selected'}
          </span>
          <span className="vtde-terminal__meta">
            {activeMeta.ptyId !== null ? `PTY ${activeMeta.ptyId}` : 'Allocating shell'}
          </span>
        </div>

        <div className="vtde-terminal__right">
          <span className="vtde-terminal__hint">Ctrl+Shift+T/W, PgUp/PgDn</span>
          <button
            onClick={createTab}
            className="vtde-terminal__action vtde-terminal__action--primary"
            title="New tab (Ctrl+Shift+T)"
          >
            +
          </button>
          <button
            disabled={!activeTab || !activePane}
            onClick={() => activeTab && activePane && splitPane(activeTab.id, activePane.id, 'vertical')}
            className="vtde-terminal__action"
            title="Split right"
          >
            V
          </button>
          <button
            disabled={!activeTab || !activePane}
            onClick={() => activeTab && activePane && splitPane(activeTab.id, activePane.id, 'horizontal')}
            className="vtde-terminal__action"
            title="Split down"
          >
            H
          </button>
          <button
            disabled={!activeTab}
            onClick={(event) => activeTab && openContextMenu(event, activeTab.id, activePane?.id ?? null)}
            className="vtde-terminal__action"
            title="Terminal menu"
          >
            ...
          </button>
          <button onClick={onClose} className="vtde-terminal__action" title="Close window">
            x
          </button>
        </div>
      </div>

      <div className="vtde-terminal__tabs">
        {layoutState.tabs.map((tab) => {
          const currentPane = tab.panes.find((pane) => pane.id === tab.activePaneId) ?? tab.panes[0];
          const meta = currentPane ? paneMeta[currentPane.id] : undefined;
          return (
            <div
              key={tab.id}
              className={`vtde-terminal__tab${tab.id === layoutState.activeTabId ? ' vtde-terminal__tab--active' : ''}`}
            >
              <button
                className="vtde-terminal__tab-main"
                onClick={() => activatePane(tab.id, currentPane?.id ?? tab.activePaneId)}
                onContextMenu={(event) => openContextMenu(event, tab.id, currentPane?.id ?? tab.activePaneId)}
                title={meta?.message ?? tab.title}
              >
                <span className={`vtde-terminal__tab-dot vtde-terminal__tab-dot--${meta?.status ?? 'starting'}`} />
                <span className="vtde-terminal__tab-label">{tab.title}</span>
                {tab.panes.length > 1 && <span className="vtde-terminal__tab-count">{tab.panes.length}</span>}
              </button>
              <button
                className="vtde-terminal__tab-close"
                onClick={() => closeTab(tab.id)}
                title={`Close ${tab.title}`}
              >
                x
              </button>
            </div>
          );
        })}
      </div>

      <div className="vtde-terminal__body" onContextMenu={(event) => activeTab && openContextMenu(event, activeTab.id, activePane?.id ?? null)}>
        <div className={`vtde-terminal__surface vtde-terminal__surface--${activeMeta.status}`}>
          <span className="vtde-terminal__surface-label">{getStatusLabel(activeMeta.status)}:</span>
          <span>{activeMeta.message}</span>
          {activeTab && (
            <span className="vtde-terminal__surface-layout">
              Layout {activeTab.layout === 'single' ? 'single' : activeTab.layout === 'vertical' ? 'split-right' : 'split-down'}
            </span>
          )}
        </div>

        <div className="vtde-terminal__sessions">
          {layoutState.tabs.map((tab) => (
            <div
              key={tab.id}
              className={`vtde-terminal__workspace${tab.id === layoutState.activeTabId ? ' vtde-terminal__workspace--active' : ''} vtde-terminal__workspace--${tab.layout}`}
            >
              {tab.panes.map((pane) => (
                <TerminalSessionPane
                  key={`${pane.id}:${pane.version}`}
                  active={tab.id === layoutState.activeTabId && pane.id === tab.activePaneId}
                  command={sessionCommand}
                  label={pane.title}
                  meta={paneMeta[pane.id]}
                  onActivate={() => activatePane(tab.id, pane.id)}
                  onContextMenu={(event) => openContextMenu(event, tab.id, pane.id)}
                  onMetaChange={updateMeta}
                  paneId={pane.id}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {contextMenu && menuItems.length > 0 && (
        <div
          ref={contextMenuRef}
          className="vtde-terminal__menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {menuItems.map((action) => (
            <button
              key={action.label}
              className="vtde-terminal__menu-item"
              onClick={(event) => {
                event.stopPropagation();
                action.onSelect();
                setContextMenu(null);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
