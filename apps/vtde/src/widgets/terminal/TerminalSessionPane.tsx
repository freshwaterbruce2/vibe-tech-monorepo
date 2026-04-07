import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef } from 'react';
import type { PtyExitEvent, PtyOutputEvent, SessionStatus, TerminalSessionPaneProps } from './types';
import { getErrorMessage, getStatusLabel, INITIAL_MESSAGE, TERMINAL_THEME } from './utils';

export function TerminalSessionPane({
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
            if (!mounted) return;
            void resizeTerminal().catch((error) => {
              if (!mounted) return;
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
          term.write(`\r\n\x1b[36mRight-click → "Restart Pane" to relaunch the shell.\x1b[0m\r\n`);
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
