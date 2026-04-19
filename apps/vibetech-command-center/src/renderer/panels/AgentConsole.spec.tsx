import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentConsole } from './AgentConsole';

function setupBridge(listData: unknown[] = []): { kill: ReturnType<typeof vi.fn> } {
  const kill = vi.fn().mockResolvedValue({ ok: true, data: true, timestamp: Date.now() });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      process: {
        list: vi.fn().mockResolvedValue({ ok: true, data: listData, timestamp: Date.now() }),
        kill
      },
      stream: { subscribe: vi.fn(() => () => {}) }
    },
    writable: true, configurable: true
  });
  return { kill };
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AgentConsole', () => {
  beforeEach(() => {});

  it('renders empty state', async () => {
    setupBridge([]);
    renderWithQuery(<AgentConsole />);
    await waitFor(() => expect(screen.getByText(/no processes/i)).toBeTruthy());
  });

  it('lists processes and sorts by start time', async () => {
    setupBridge([
      {
        id: 'p1', command: 'C:\\Windows\\System32\\pwsh.exe', args: ['-Command', 'Compress-Archive'],
        cwd: '.', pid: 100, status: 'exited', startedAt: 100, exitCode: 0
      },
      {
        id: 'p2', command: 'claude.cmd', args: ['-p', 'review'],
        cwd: '.', pid: 200, status: 'running', startedAt: 200, exitCode: null
      }
    ]);
    renderWithQuery(<AgentConsole />);
    await waitFor(() => expect(screen.getByText('claude.cmd')).toBeTruthy());
    expect(screen.getByText(/pwsh\.exe/)).toBeTruthy();
  });

  it('kill button calls process.kill', async () => {
    const { kill } = setupBridge([
      { id: 'p2', command: 'claude.cmd', args: [], cwd: '.', pid: 200, status: 'running', startedAt: 1, exitCode: null }
    ]);
    const user = userEvent.setup();
    renderWithQuery(<AgentConsole />);
    await waitFor(() => expect(screen.getByText('claude.cmd')).toBeTruthy());
    await user.click(screen.getByTitle('kill'));
    expect(kill).toHaveBeenCalledWith('p2');
  });
});
