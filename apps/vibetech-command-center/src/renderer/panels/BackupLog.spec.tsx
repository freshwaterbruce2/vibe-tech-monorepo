import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BackupLog } from './BackupLog';

function setupBridge(listData: unknown[], createImpl?: ReturnType<typeof vi.fn>): ReturnType<typeof vi.fn> {
  const create = createImpl ?? vi.fn().mockResolvedValue({
    ok: true,
    data: { success: true, zipPath: 'C:\\dev\\_backups\\x.zip', sizeBytes: 2048, sourcePath: '.', label: 'all-apps', startedAt: 1, completedAt: 2, durationMs: 1 },
    timestamp: Date.now()
  });
  Object.defineProperty(window, 'commandCenter', {
    value: {
      backup: {
        list: vi.fn().mockResolvedValue({ ok: true, data: listData, timestamp: Date.now() }),
        create
      }
    },
    writable: true, configurable: true
  });
  return create;
}

function renderWithQuery(ui: React.ReactElement): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('BackupLog', () => {
  beforeEach(() => {});

  it('renders backup rows', async () => {
    setupBridge([
      { zipPath: 'C:\\dev\\_backups\\alpha.zip', sizeBytes: 1024 * 1024, createdAt: Date.now() - 60_000, label: 'alpha' },
      { zipPath: 'C:\\dev\\_backups\\beta.zip',  sizeBytes: 2 * 1024 * 1024, createdAt: Date.now() - 120_000, label: 'beta' }
    ]);
    renderWithQuery(<BackupLog />);
    await waitFor(() => expect(screen.getByText('alpha.zip')).toBeTruthy());
    expect(screen.getByText('beta.zip')).toBeTruthy();
  });

  it('quick-backup button triggers backup.create', async () => {
    const create = setupBridge([]);
    const user = userEvent.setup();
    renderWithQuery(<BackupLog />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Backup apps\// })).toBeTruthy());
    await user.click(screen.getByRole('button', { name: /Backup apps\// }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      sourcePath: 'C:\\dev\\apps',
      label: 'all-apps'
    }));
  });

  it('empty state when no backups', async () => {
    setupBridge([]);
    renderWithQuery(<BackupLog />);
    await waitFor(() => expect(screen.getByText(/no backups yet/i)).toBeTruthy());
  });
});
