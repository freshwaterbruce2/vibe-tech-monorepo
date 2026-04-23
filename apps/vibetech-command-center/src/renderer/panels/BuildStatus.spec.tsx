import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuildStatus } from './BuildStatus';

function setupBridge(
  statByPath: Record<string, { exists: boolean; mtimeMs: number | null; sizeBytes?: number; isDirectory?: boolean }>
): void {
  Object.defineProperty(window, 'commandCenter', {
    value: {
      nx: {
        get: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            projects: {
              'nova-agent': { name: 'nova-agent', type: 'app', root: 'apps/nova-agent', tags: ['scope:ai'], implicitDependencies: [] },
              'shared-ui':  { name: 'shared-ui',  type: 'lib', root: 'packages/shared-ui', tags: [], implicitDependencies: [] }
            },
            dependencies: {},
            generatedAt: Date.now()
          },
          timestamp: Date.now()
        }),
        refresh: vi.fn()
      },
      fs: {
        stat: vi.fn().mockImplementation(async (p: string) => Promise.resolve({
          ok: true,
          data: {
            path: p,
            exists: statByPath[p]?.exists ?? false,
            isDirectory: statByPath[p]?.isDirectory ?? true,
            isFile: false,
            sizeBytes: statByPath[p]?.sizeBytes ?? 0,
            mtimeMs: statByPath[p]?.mtimeMs ?? null
          },
          timestamp: Date.now()
        }))
      }
    },
    writable: true, configurable: true
  });
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('BuildStatus', () => {
  beforeEach(() => {});

  it('renders only apps', async () => {
    setupBridge({});
    renderWithQuery(<BuildStatus />);
    await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
    expect(screen.queryByText('shared-ui')).toBeNull();
  });

  it('shows "never" for apps without dist/', async () => {
    setupBridge({ 'C:\\dev\\apps\\nova-agent\\dist': { exists: false, mtimeMs: null } });
    renderWithQuery(<BuildStatus />);
    await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
    expect(screen.getByText('never')).toBeTruthy();
  });

  it('shows fresh status for recently-built apps', async () => {
    const recent = Date.now() - 5 * 60 * 1000;
    setupBridge({
      'C:\\dev\\apps\\nova-agent\\dist': { exists: true, mtimeMs: recent, sizeBytes: 1_000_000, isDirectory: true }
    });
    renderWithQuery(<BuildStatus />);
    await waitFor(() => expect(screen.getByText(/MB/)).toBeTruthy());
  });
});
