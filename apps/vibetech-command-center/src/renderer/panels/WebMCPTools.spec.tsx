// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { WebMCPTools } from './WebMCPTools';
import type { WebMCPToolDescriptor, WebMCPGatewayStatus } from '@shared/types';

function renderWithQuery(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const TOOLS: WebMCPToolDescriptor[] = [
  {
    name: 'cc_switch_panel',
    description: 'Switches the dashboard panel.',
    inputSchema: { type: 'object' },
    type: 'imperative'
  },
  {
    name: 'cc_get_dashboard_state',
    description: 'Returns dashboard state.',
    inputSchema: { type: 'object' },
    type: 'imperative'
  }
];

function setupBridge(options?: {
  tools?: WebMCPToolDescriptor[];
  status?: WebMCPGatewayStatus;
  executeResult?: { ok: boolean; data?: unknown; error?: string };
}) {
  const {
    tools = TOOLS,
    status = { connected: true, toolCount: tools.length, lastSyncAt: Date.now(), pendingExecutions: 0 },
    executeResult = { ok: true, data: { success: true, activePanel: 'memory' } }
  } = options ?? {};

  const mocks = {
    webmcp: {
      status: vi.fn().mockResolvedValue({ ok: true, data: status, timestamp: Date.now() }),
      list: vi.fn().mockResolvedValue({ ok: true, data: tools, timestamp: Date.now() }),
      execute: vi.fn().mockResolvedValue({ ...executeResult, timestamp: Date.now() })
    }
  };

  Object.defineProperty(window, 'commandCenter', {
    value: mocks,
    writable: true,
    configurable: true
  });

  return mocks;
}

describe('WebMCPTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists tools bridged through the main process', async () => {
    setupBridge();
    renderWithQuery(<WebMCPTools />);
    await waitFor(() => expect(screen.getByText('cc_switch_panel')).toBeTruthy());
    expect(screen.getByText('cc_get_dashboard_state')).toBeTruthy();
    expect(screen.getByText(/2 bridged via main/i)).toBeTruthy();
  });

  it('shows gateway connection status', async () => {
    setupBridge({ status: { connected: false, toolCount: 0, lastSyncAt: null, pendingExecutions: 0 }, tools: [] });
    renderWithQuery(<WebMCPTools />);
    await waitFor(() => expect(screen.getByText(/gateway disconnected/i)).toBeTruthy());
    expect(screen.getByText(/no WebMCP tools bridged yet/i)).toBeTruthy();
  });

  it('executes a selected tool through the main-process gateway and shows the result', async () => {
    const mocks = setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<WebMCPTools />);

    await waitFor(() => expect(screen.getByText('cc_switch_panel')).toBeTruthy());
    await user.click(screen.getByText('cc_switch_panel'));
    const argsBox = screen.getByLabelText(/args/i);
    await user.clear(argsBox);
    await user.type(argsBox, '{{"panel": "memory"}');
    await user.click(screen.getByText(/execute via gateway/i));

    await waitFor(() => expect(mocks.webmcp.execute).toHaveBeenCalledWith('cc_switch_panel', { panel: 'memory' }));
    await waitFor(() => expect(screen.getByText(/"activePanel": "memory"/)).toBeTruthy());
  });

  it('rejects non-object JSON args without calling the gateway', async () => {
    const mocks = setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<WebMCPTools />);

    await waitFor(() => expect(screen.getByText('cc_switch_panel')).toBeTruthy());
    await user.click(screen.getByText('cc_switch_panel'));
    const argsBox = screen.getByLabelText(/args/i);
    await user.clear(argsBox);
    await user.type(argsBox, '[[]');
    await user.click(screen.getByText(/execute via gateway/i));

    expect(screen.getByText(/args must be a JSON object/i)).toBeTruthy();
    expect(mocks.webmcp.execute).not.toHaveBeenCalled();
  });

  it('surfaces gateway execution errors', async () => {
    setupBridge({ executeResult: { ok: false, error: 'WebMCP renderer not connected' } });
    const user = userEvent.setup();
    renderWithQuery(<WebMCPTools />);

    await waitFor(() => expect(screen.getByText('cc_get_dashboard_state')).toBeTruthy());
    await user.click(screen.getByText('cc_get_dashboard_state'));
    await user.click(screen.getByText(/execute via gateway/i));

    await waitFor(() => expect(screen.getByText(/WebMCP renderer not connected/i)).toBeTruthy());
  });
});
