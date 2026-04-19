import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DbHealth } from './DbHealth';

function mockDbMetrics(dbs: Array<Partial<import('@shared/types').DbMetric>>): void {
  Object.defineProperty(window, 'commandCenter', {
    value: {
      db: {
        collectAll: vi.fn().mockResolvedValue({
          ok: true,
          data: dbs.map((d) => ({
            name: 'default', path: 'x.db', sizeBytes: 0, walSizeBytes: 0,
            pageCount: 0, pageSize: 4096, tables: [], journalMode: 'WAL',
            lastCheckedAt: Date.now(), ...d
          })),
          timestamp: Date.now()
        })
      }
    },
    writable: true, configurable: true
  });
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('DbHealth', () => {
  beforeEach(() => {});

  it('renders normal DB row', async () => {
    mockDbMetrics([{ name: 'trading', sizeBytes: 10 * 1024 * 1024, tables: [{ name: 't', rowCount: 42 }] }]);
    renderWithQuery(<DbHealth />);
    await waitFor(() => expect(screen.getByText('trading')).toBeTruthy());
    expect(screen.getByText(/10.0 MB/)).toBeTruthy();
  });

  it('shows WAL alert when wal > 100 MB', async () => {
    mockDbMetrics([{ name: 'bloated', walSizeBytes: 150 * 1024 * 1024 }]);
    renderWithQuery(<DbHealth />);
    await waitFor(() => expect(screen.getByText(/WAL > 100 MB/)).toBeTruthy());
  });

  it('shows error state when DB file missing', async () => {
    mockDbMetrics([{ name: 'ghost', error: 'file not found' }]);
    renderWithQuery(<DbHealth />);
    await waitFor(() => expect(screen.getByText('file not found')).toBeTruthy());
  });
});
