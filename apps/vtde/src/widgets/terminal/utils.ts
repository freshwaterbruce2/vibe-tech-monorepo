import { invoke } from '@tauri-apps/api/core';
import type {
  PaneLayout,
  PersistedTerminalLayout,
  SessionStatus,
  TerminalLayoutState,
  TerminalPane,
  TerminalTab,
  TerminalTabMeta,
} from './types';

export const TERMINAL_THEME = {
  background: '#080c14',
  cursor: '#38bdf8',
  foreground: '#e2e8f0',
  selectionBackground: 'rgba(56, 189, 248, 0.3)',
};

export const INITIAL_MESSAGE = 'Spawning shell...';
export const STORAGE_KEY = 'vtde:terminal:v2';

export function createPane(paneId: number): TerminalPane {
  return {
    id: paneId,
    title: `Pane ${paneId}`,
    version: 0,
  };
}

export function createTerminalTab(tabId: number, paneId: number): TerminalTab {
  return {
    activePaneId: paneId,
    id: tabId,
    layout: 'single',
    panes: [createPane(paneId)],
    title: `Tab ${tabId}`,
  };
}

export function createStartingMeta(message = INITIAL_MESSAGE): TerminalTabMeta {
  return {
    message,
    ptyId: null,
    status: 'starting',
  };
}

export function buildPaneMetaState(layoutState: TerminalLayoutState): Record<number, TerminalTabMeta> {
  const meta: Record<number, TerminalTabMeta> = {};
  layoutState.tabs.forEach((tab) => {
    tab.panes.forEach((pane) => {
      meta[pane.id] = createStartingMeta();
    });
  });
  return meta;
}

export function buildDefaultLayoutState(): TerminalLayoutState {
  return {
    activeTabId: 1,
    nextPaneId: 2,
    nextTabId: 2,
    tabs: [createTerminalTab(1, 1)],
  };
}

export function normalizeLayout(layout: unknown): PaneLayout {
  return layout === 'vertical' || layout === 'horizontal' ? layout : 'single';
}

export function getStatusLabel(status: SessionStatus) {
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

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function loadLayoutState(): TerminalLayoutState {
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

export function toPersistedLayoutState(layoutState: TerminalLayoutState): PersistedTerminalLayout {
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

export async function invokeWithTimeout<T>(
  cmd: string,
  args?: Record<string, unknown>,
  timeoutMs = 5000,
): Promise<T> {
  return Promise.race([
    args !== undefined ? invoke<T>(cmd, args) : invoke<T>(cmd),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`IPC timeout: ${cmd} did not respond within ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}
