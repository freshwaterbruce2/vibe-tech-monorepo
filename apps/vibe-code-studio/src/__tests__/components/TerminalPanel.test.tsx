import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockTerminal {
  options: Record<string, unknown>;
  open: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  loadAddon: ReturnType<typeof vi.fn>;
  onData: ReturnType<typeof vi.fn>;
  dataHandler: ((data: string) => void) | null;
}

const h = vi.hoisted(() => ({
  terminals: [] as unknown[],
  fitAddons: [] as unknown[],
  sessionCounter: 0,
}));

vi.mock('@xterm/xterm', () => {
  class Terminal {
    options: Record<string, unknown>;
    open = vi.fn();
    write = vi.fn();
    dispose = vi.fn();
    loadAddon = vi.fn();
    dataHandler: ((data: string) => void) | null = null;
    onData = vi.fn((cb: (data: string) => void) => {
      this.dataHandler = cb;
      return { dispose: vi.fn() };
    });
    constructor(options: Record<string, unknown>) {
      this.options = options;
      h.terminals.push(this);
    }
  }
  return { Terminal };
});

vi.mock('@xterm/addon-fit', () => {
  class FitAddon {
    fit = vi.fn();
    constructor() {
      h.fitAddons.push(this);
    }
  }
  return { FitAddon };
});

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: class WebLinksAddon {},
}));

vi.mock('@xterm/xterm/css/xterm.css', () => ({}));

vi.mock('../../services/TerminalService', () => ({
  terminalService: {
    createSession: vi.fn(() => {
      h.sessionCounter += 1;
      return `session-${h.sessionCounter}`;
    }),
    startShell: vi.fn(),
    writeInput: vi.fn(),
    closeSession: vi.fn(),
  },
}));

import { TerminalPanel } from '../../components/TerminalPanel';
import { terminalService } from '../../services/TerminalService';

const mockService = vi.mocked(terminalService);
const getTerminal = (index: number): MockTerminal => h.terminals[index] as MockTerminal;
const getFitAddon = (index: number): { fit: ReturnType<typeof vi.fn> } =>
  h.fitAddons[index] as { fit: ReturnType<typeof vi.fn> };

const closeButtonForTab = (title: string): Element => {
  const label = screen.getByText(title);
  const button = label.parentElement!.querySelector('button');
  expect(button).toBeTruthy();
  return button!;
};

describe('TerminalPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.terminals.length = 0;
    h.fitAddons.length = 0;
    h.sessionCounter = 0;
  });

  it('creates an initial tab whose id uses crypto.randomUUID', () => {
    const uuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID');
    render(<TerminalPanel isOpen onClose={vi.fn()} />);

    expect(screen.getByText('Terminal 1')).toBeTruthy();
    expect(mockService.createSession).toHaveBeenCalledTimes(1);
    expect(uuidSpy).toHaveBeenCalled();
    // xterm instance configured and wired to the session.
    const term = getTerminal(0);
    expect(term.options['cursorBlink']).toBe(true);
    expect(term.loadAddon).toHaveBeenCalledTimes(2);
    expect(term.onData).toHaveBeenCalledTimes(1);
    uuidSpy.mockRestore();
  });

  it('opens the terminal into the DOM, fits it, and starts the shell on mount', () => {
    render(<TerminalPanel isOpen onClose={vi.fn()} />);

    const term = getTerminal(0);
    expect(term.open).toHaveBeenCalledTimes(1);
    expect(term.open.mock.calls[0]![0]).toBeInstanceOf(HTMLElement);
    expect(getFitAddon(0).fit).toHaveBeenCalledTimes(1);
    expect(mockService.startShell).toHaveBeenCalledTimes(1);
    expect(mockService.startShell).toHaveBeenCalledWith(
      'session-1',
      expect.any(Function),
      expect.any(Function)
    );

    // Shell output is written to the terminal; exit code is announced.
    const [, onData, onExit] = mockService.startShell.mock.calls[0]! as unknown as [
      string,
      (data: string) => void,
      (code: number) => void,
    ];
    onData('hello from shell');
    expect(term.write).toHaveBeenCalledWith('hello from shell');
    onExit(0);
    expect(term.write).toHaveBeenCalledWith('\r\n\r\nProcess exited with code 0\r\n');
  });

  it('forwards keystrokes from xterm to the terminal service', () => {
    render(<TerminalPanel isOpen onClose={vi.fn()} />);
    const term = getTerminal(0);
    term.dataHandler!('ls -la\r');
    expect(mockService.writeInput).toHaveBeenCalledWith('session-1', 'ls -la\r');
  });

  it('creates additional tabs, switches active tab, and toggles maximize', () => {
    render(<TerminalPanel isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByTitle('New Terminal'));
    expect(screen.getByText('Terminal 2')).toBeTruthy();
    expect(mockService.createSession).toHaveBeenCalledTimes(2);
    expect(mockService.startShell).toHaveBeenCalledWith(
      'session-2',
      expect.any(Function),
      expect.any(Function)
    );
    // Shell only starts once per tab even though refs re-fire on re-render.
    expect(mockService.startShell).toHaveBeenCalledTimes(2);

    // Switch back to the first tab.
    fireEvent.click(screen.getByText('Terminal 1'));
    expect(mockService.startShell).toHaveBeenCalledTimes(2);

    // Maximize toggles the header action title.
    fireEvent.click(screen.getByTitle('Maximize'));
    expect(screen.getByTitle('Restore')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Restore'));
    expect(screen.getByTitle('Maximize')).toBeTruthy();
  });

  it('closes a tab: disposes xterm, closes the session, and keeps the panel open', () => {
    const onClose = vi.fn();
    render(<TerminalPanel isOpen onClose={onClose} />);
    fireEvent.click(screen.getByTitle('New Terminal'));

    fireEvent.click(closeButtonForTab('Terminal 2'));

    expect(getTerminal(1).dispose).toHaveBeenCalledTimes(1);
    expect(mockService.closeSession).toHaveBeenCalledWith('session-2');
    expect(screen.queryByText('Terminal 2')).toBeNull();
    expect(screen.getByText('Terminal 1')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closing the last tab closes the whole panel', () => {
    const onClose = vi.fn();
    render(<TerminalPanel isOpen onClose={onClose} />);

    fireEvent.click(closeButtonForTab('Terminal 1'));

    expect(getTerminal(0).dispose).toHaveBeenCalledTimes(1);
    expect(mockService.closeSession).toHaveBeenCalledWith('session-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the header close button closes the panel without killing sessions', () => {
    const onClose = vi.fn();
    render(<TerminalPanel isOpen onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close Terminal'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockService.closeSession).not.toHaveBeenCalled();
  });

  it('renders collapsed when isOpen is false but still mounts the tab', () => {
    render(<TerminalPanel isOpen={false} onClose={vi.fn()} />);
    expect(screen.getByText('Terminal 1')).toBeTruthy();
  });
});
