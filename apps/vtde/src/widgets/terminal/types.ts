export type SessionStatus = 'starting' | 'ready' | 'error' | 'closed';
export type SessionAction = 'copy' | 'paste' | 'clear';
export type PaneLayout = 'single' | 'vertical' | 'horizontal';

export interface PtyOutputEvent {
  pty_id: number;
  data: string;
}

export interface PtyExitEvent {
  pty_id: number;
  reason: string;
}

export interface TerminalPane {
  id: number;
  title: string;
  version: number;
}

export interface TerminalTab {
  activePaneId: number;
  id: number;
  layout: PaneLayout;
  panes: TerminalPane[];
  title: string;
}

export interface TerminalTabMeta {
  message: string;
  ptyId: number | null;
  status: SessionStatus;
}

export interface TerminalLayoutState {
  activeTabId: number;
  nextPaneId: number;
  nextTabId: number;
  tabs: TerminalTab[];
}

export interface PersistedPane {
  id: number;
  title: string;
}

export interface PersistedTab {
  activePaneId: number;
  id: number;
  layout: PaneLayout;
  panes: PersistedPane[];
  title: string;
}

export interface PersistedTerminalLayout {
  activeTabId: number;
  nextPaneId: number;
  nextTabId: number;
  tabs: PersistedTab[];
}

export interface ContextMenuState {
  paneId: number | null;
  tabId: number;
  x: number;
  y: number;
}

export interface SessionCommand {
  action: SessionAction;
  nonce: number;
  paneId: number;
}

export interface TerminalSessionPaneProps {
  active: boolean;
  command: SessionCommand | null;
  label: string;
  meta?: TerminalTabMeta;
  onActivate: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onMetaChange: (paneId: number, meta: TerminalTabMeta) => void;
  paneId: number;
}
