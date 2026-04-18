import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClaudeLauncher } from './ClaudeLauncher';

function setupBridge(invokeImpl?: ReturnType<typeof vi.fn>): ReturnType<typeof vi.fn> {
  const invoke = invokeImpl ?? vi.fn().mockResolvedValue({
    ok: true,
    data: {
      invocationId: 'inv-1',
      sessionId: 'sess-abc',
      success: true,
      exitCode: 0,
      resultText: 'Done.',
      durationMs: 1234,
      totalCostUsd: 0.01,
      numTurns: 3
    },
    timestamp: Date.now()
  });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      nx: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            projects: {
              'nova-agent': {
                name: 'nova-agent', type: 'app', root: 'apps/nova-agent',
                tags: [], implicitDependencies: []
              }
            },
            dependencies: {},
            generatedAt: Date.now()
          },
          timestamp: Date.now()
        }),
        refresh: vi.fn()
      },
      claude: { invoke },
      stream: { subscribe: vi.fn(() => () => {}) }
    },
    writable: true, configurable: true
  });
  return invoke;
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('ClaudeLauncher', () => {
  beforeEach(() => {});

  it('enables Launch only when app is selected and prompt non-empty', async () => {
    setupBridge();
    renderWithQuery(<ClaudeLauncher />);
    await waitFor(() => expect(screen.getByText('— choose —')).toBeTruthy());
    const launch = screen.getByRole('button', { name: /launch/i });
    expect((launch as HTMLButtonElement).disabled).toBe(true);
  });

  it('auto-fills prompt from template when app is chosen', async () => {
    setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<ClaudeLauncher />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'nova-agent' })).toBeTruthy());
    await user.selectOptions(screen.getByRole('combobox'), 'nova-agent');
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/auto-fill/i) as HTMLTextAreaElement;
      expect(textarea.value).toContain('nova-agent');
    });
  });

  it('invokes claude bridge on Launch with correct cwd and tools', async () => {
    const invoke = setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<ClaudeLauncher />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'nova-agent' })).toBeTruthy());
    await user.selectOptions(screen.getByRole('combobox'), 'nova-agent');
    const launch = await screen.findByRole('button', { name: /launch/i });
    await waitFor(() => expect((launch as HTMLButtonElement).disabled).toBe(false));
    await user.click(launch);
    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      cwd: 'C:\\dev\\apps\\nova-agent',
      allowedTools: expect.arrayContaining(['Read']),
      permissionMode: 'plan'
    }));
  });

  it('passes a client-generated invocationId before mutate so streaming starts immediately', async () => {
    const invoke = setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<ClaudeLauncher />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'nova-agent' })).toBeTruthy());
    await user.selectOptions(screen.getByRole('combobox'), 'nova-agent');
    const launch = await screen.findByRole('button', { name: /launch/i });
    await waitFor(() => expect((launch as HTMLButtonElement).disabled).toBe(false));
    await user.click(launch);
    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      invocationId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    }));
  });
});
