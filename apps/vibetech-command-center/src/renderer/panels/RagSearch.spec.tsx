import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RagSearch } from './RagSearch';

function setupBridge(searchImpl?: ReturnType<typeof vi.fn>): ReturnType<typeof vi.fn> {
  const search = searchImpl ?? vi.fn().mockResolvedValue({
    ok: true,
    data: {
      query: 'claude bridge',
      latencyMs: 42,
      source: 'mcp-rag-server',
      hits: [
        {
          score: 0.91,
          path: 'C:\\dev\\apps\\vibetech-command-center\\src\\main\\services\\claude-bridge.ts',
          language: 'typescript',
          snippet: 'export class ClaudeBridge',
          startLine: 12,
          endLine: 20
        }
      ]
    },
    timestamp: Date.now()
  });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      rag: { search },
      process: { spawn: vi.fn().mockResolvedValue({ ok: true, data: {}, timestamp: Date.now() }) }
    },
    writable: true, configurable: true
  });
  return search;
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('RagSearch', () => {
  beforeEach(() => {});

  it('submits query and renders hit', async () => {
    const search = setupBridge();
    const user = userEvent.setup();
    renderWithQuery(<RagSearch />);
    await user.type(screen.getByPlaceholderText(/semantic search/i), 'claude bridge');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText(/claude-bridge\.ts/)).toBeTruthy());
    expect(search).toHaveBeenCalledWith({ query: 'claude bridge', topK: 12 });
    expect(screen.getByText('typescript')).toBeTruthy();
    expect(screen.getByText('0.910')).toBeTruthy();
  });

  it('shows empty state when no hits', async () => {
    setupBridge(vi.fn().mockResolvedValue({
      ok: true,
      data: { query: 'xyz', hits: [], latencyMs: 10, source: 'mcp-rag-server' },
      timestamp: Date.now()
    }));
    const user = userEvent.setup();
    renderWithQuery(<RagSearch />);
    await user.type(screen.getByPlaceholderText(/semantic search/i), 'xyz');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText(/no hits for "xyz"/)).toBeTruthy());
  });

  it('surfaces rag unavailable state', async () => {
    setupBridge(vi.fn().mockResolvedValue({
      ok: true,
      data: { query: 'q', hits: [], latencyMs: 5, source: 'unavailable', error: 'rag server not reachable' },
      timestamp: Date.now()
    }));
    const user = userEvent.setup();
    renderWithQuery(<RagSearch />);
    await user.type(screen.getByPlaceholderText(/semantic search/i), 'q');
    await user.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(screen.getByText(/unavailable/)).toBeTruthy());
    expect(screen.getByText(/rag server not reachable/)).toBeTruthy();
  });
});
