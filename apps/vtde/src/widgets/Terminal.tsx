import { useCallback, useEffect, useRef, useState } from 'react';
import { TerminalSessionPane } from './terminal/TerminalSessionPane';
import type { ContextMenuState, PaneLayout, SessionAction, SessionCommand, TerminalLayoutState, TerminalTabMeta } from './terminal/types';
import { buildPaneMetaState, createPane, createStartingMeta, createTerminalTab, getStatusLabel, loadLayoutState, STORAGE_KEY, toPersistedLayoutState } from './terminal/utils';

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
