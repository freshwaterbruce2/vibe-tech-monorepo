import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Terminal } from './Terminal';
import { TerminalErrorBoundary } from './TerminalErrorBoundary';

const mocks = vi.hoisted(() => {
  const invokeMock = vi.fn();
  const listenMock = vi.fn();
  const unlistenMock = vi.fn();
  const fitAddonFitMock = vi.fn();
  const termWriteMock = vi.fn();
  const termOpenMock = vi.fn();
  const termDisposeMock = vi.fn();
  const termClearMock = vi.fn();
  const termFocusMock = vi.fn();
  const termHasSelectionMock = vi.fn();
  const termGetSelectionMock = vi.fn();
  const termClearSelectionMock = vi.fn();
  const termAttachKeyHandlerMock = vi.fn();
  const loadAddonMock = vi.fn();
  const onDataRef: { current: ((data: string) => void) | undefined } = { current: undefined };
  const eventHandlersRef: {
    current: Record<string, (event: { payload: unknown }) => void>;
  } = { current: {} };

  const xtermConstructorMock = vi.fn(function MockXTerm() {
    return {
      attachCustomKeyEventHandler: termAttachKeyHandlerMock,
      clear: termClearMock,
      clearSelection: termClearSelectionMock,
      cols: 80,
      dispose: termDisposeMock,
      focus: termFocusMock,
      getSelection: termGetSelectionMock,
      hasSelection: termHasSelectionMock,
      loadAddon: loadAddonMock,
      onData: vi.fn((callback: (data: string) => void) => {
        onDataRef.current = callback;
        return { dispose: vi.fn() };
      }),
      open: termOpenMock,
      rows: 24,
      write: termWriteMock,
    };
  });

  const fitAddonConstructorMock = vi.fn(function MockFitAddon() {
    return {
      fit: fitAddonFitMock,
    };
  });

  return {
    eventHandlersRef,
    fitAddonConstructorMock,
    fitAddonFitMock,
    invokeMock,
    listenMock,
    loadAddonMock,
    onDataRef,
    termAttachKeyHandlerMock,
    termClearMock,
    termClearSelectionMock,
    termDisposeMock,
    termFocusMock,
    termGetSelectionMock,
    termHasSelectionMock,
    termOpenMock,
    termWriteMock,
    unlistenMock,
    xtermConstructorMock,
  };
});

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mocks.invokeMock(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mocks.listenMock(...args),
}));

vi.mock('@xterm/xterm', () => ({
  Terminal: mocks.xtermConstructorMock,
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: mocks.fitAddonConstructorMock,
}));

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

describe('Terminal widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventHandlersRef.current = {};
    mocks.onDataRef.current = undefined;
    mocks.termHasSelectionMock.mockReturnValue(true);
    mocks.termGetSelectionMock.mockReturnValue('selected text');
    mocks.invokeMock.mockImplementation(async (command: string) => {
      if (command === 'spawn_pty') {
        return 1;
      }

      return undefined;
    });
    mocks.listenMock.mockImplementation(async (event: string, handler: (event: { payload: unknown }) => void) => {
      mocks.eventHandlersRef.current[event] = handler;
      return mocks.unlistenMock;
    });

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    Object.assign(navigator, {
      clipboard: {
        readText: vi.fn().mockResolvedValue('clipboard text'),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('spawns a PTY on mount and closes it on unmount', async () => {
    const { unmount } = render(<Terminal onClose={() => undefined} />);

    await waitFor(() => {
      expect(mocks.invokeMock).toHaveBeenCalledWith('spawn_pty');
      expect(mocks.termOpenMock).toHaveBeenCalled();
      expect(mocks.fitAddonFitMock).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mocks.invokeMock).toHaveBeenCalledWith('close_pty', { pty_id: 1 });
      expect(mocks.termDisposeMock).toHaveBeenCalled();
      expect(mocks.unlistenMock).toHaveBeenCalledTimes(2);
    });
  });

  it('forwards typed input to the active PTY', async () => {
    render(<Terminal onClose={() => undefined} />);

    await waitFor(() => {
      expect(mocks.onDataRef.current).toBeDefined();
    });

    mocks.onDataRef.current?.('echo hello\r');

    await waitFor(() => {
      expect(mocks.invokeMock).toHaveBeenCalledWith('write_pty', {
        data: 'echo hello\r',
        pty_id: 1,
      });
    });
  });

  it('writes matching PTY output to xterm and ignores other PTYs', async () => {
    render(<Terminal onClose={() => undefined} />);

    await waitFor(() => {
      expect(mocks.listenMock).toHaveBeenCalledWith('pty-output', expect.any(Function));
      expect(mocks.listenMock).toHaveBeenCalledWith('pty-exit', expect.any(Function));
    });

    mocks.eventHandlersRef.current['pty-output']?.({ payload: { data: 'ignore me', pty_id: 2 } });
    expect(mocks.termWriteMock).not.toHaveBeenCalled();

    mocks.eventHandlersRef.current['pty-output']?.({ payload: { data: 'hello from pty', pty_id: 1 } });

    expect(mocks.termWriteMock).toHaveBeenCalledWith('hello from pty');
  });

  it('creates a new tab and persists the updated layout', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    mocks.invokeMock.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    render(<Terminal onClose={() => undefined} />);

    fireEvent.click(await screen.findByTitle(/new tab/i));

    await waitFor(() => {
      expect(screen.getByText('Tab 2')).toBeTruthy();
      expect(mocks.invokeMock).toHaveBeenCalledWith('spawn_pty');
      expect(setItemSpy).toHaveBeenCalledWith(
        'vtde:terminal:v2',
        expect.stringContaining('"title":"Tab 2"'),
      );
    });
  });

  it('opens the terminal menu and clears the active pane', async () => {
    render(<Terminal onClose={() => undefined} />);

    fireEvent.click(await screen.findByTitle(/terminal menu/i));
    fireEvent.click(await screen.findByText('Clear Pane'));

    expect(mocks.termClearMock).toHaveBeenCalled();
    expect(screen.getByText('Terminal cleared.')).toBeTruthy();
  });

  it('reports shell exit guidance in the surface state', async () => {
    render(<Terminal onClose={() => undefined} />);

    await waitFor(() => {
      expect(mocks.listenMock).toHaveBeenCalledWith('pty-exit', expect.any(Function));
    });

    mocks.eventHandlersRef.current['pty-exit']?.({
      payload: { pty_id: 1, reason: 'Process terminated' },
    });

    expect(await screen.findByText(/shell exited: process terminated/i)).toBeTruthy();
    expect(screen.getByText('Closed')).toBeTruthy();
  });
});

describe('TerminalErrorBoundary', () => {
  it('renders a recovery surface and can retry after the child stops throwing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) {
        throw new Error('Boundary failure');
      }

      return <div>Recovered terminal</div>;
    }

    render(
      <TerminalErrorBoundary>
        <MaybeThrow />
      </TerminalErrorBoundary>,
    );

    expect(screen.getByText('Terminal Error')).toBeTruthy();
    expect(screen.getByText('Boundary failure')).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Recover Terminal' }));

    await waitFor(() => {
      expect(screen.getByText('Recovered terminal')).toBeTruthy();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
