import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppsGrid } from './AppsGrid';
import type { CommandCenterAPI } from '@shared/types';

function mockBridge(overrides: Partial<CommandCenterAPI> = {}): void {
  const base: CommandCenterAPI = {
    version: '0.1.0',
    nx: {
      get: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          projects: {
            'nova-agent':       { name: 'nova-agent',       type: 'app', root: 'apps/nova-agent',       tags: ['scope:ai'],     implicitDependencies: [] },
            'vibe-code-studio': { name: 'vibe-code-studio', type: 'app', root: 'apps/vibe-code-studio', tags: ['scope:ide'],    implicitDependencies: [] },
            'shared-ui':        { name: 'shared-ui',        type: 'lib', root: 'packages/shared-ui',    tags: ['scope:shared'], implicitDependencies: [] }
          },
          dependencies: {},
          generatedAt: Date.now()
        },
        timestamp: Date.now()
      }),
      refresh: vi.fn()
    },
    health:  { probeAll: vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() }), probeOne: vi.fn() },
    db:      { collectAll: vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() }) },
    backup:  {
      create: vi.fn().mockResolvedValue({ ok: true, data: { success: true, zipPath: 'x.zip', sizeBytes: 1024, sourcePath: 'x', label: null, startedAt: 1, completedAt: 2, durationMs: 1 }, timestamp: Date.now() }),
      list:   vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() })
    },
    process: {
      spawn: vi.fn().mockResolvedValue({ ok: true, data: { id: 'p1', command: 'x', args: [], cwd: '.', pid: 1, status: 'running', startedAt: 1, exitCode: null }, timestamp: Date.now() }),
      kill:  vi.fn(),
      list:  vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() })
    },
    claude:  { invoke: vi.fn() },
    rag:     { search: vi.fn() },
    fs:      { stat: vi.fn().mockResolvedValue({ ok: true, data: { path: '', exists: false, isDirectory: false, isFile: false, sizeBytes: 0, mtimeMs: null }, timestamp: Date.now() }) },
    meta:    { info: vi.fn().mockResolvedValue({ ok: true, data: { version: '0.1.0', monorepoRoot: 'C:\\dev', wsPort: 3210 }, timestamp: Date.now() }) },
    stream:  { subscribe: vi.fn(() => () => {}) },
    ...overrides
  };
  Object.defineProperty(window, 'commandCenter', { value: base, writable: true, configurable: true });
}

function renderWithQuery(ui: React.ReactElement): ReturnType<typeof render> {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AppsGrid', () => {
  beforeEach(() => { mockBridge(); });

  it('renders only apps (filters out libs)', async () => {
    renderWithQuery(<AppsGrid />);
    await waitFor(() => {
      expect(screen.getByText('nova-agent')).toBeTruthy();
      expect(screen.getByText('vibe-code-studio')).toBeTruthy();
    });
    expect(screen.queryByText('shared-ui')).toBeNull();
  });

  it('clicking Backup invokes backup.create with the app path and label', async () => {
    const createMock = vi.fn().mockResolvedValue({ ok: true, data: { success: true, zipPath: 'nova.zip', sizeBytes: 1, sourcePath: '.', label: 'nova-agent', startedAt: 1, completedAt: 2, durationMs: 1 }, timestamp: Date.now() });
    mockBridge({ backup: { create: createMock, list: vi.fn().mockResolvedValue({ ok: true, data: [], timestamp: Date.now() }) } });
    const user = userEvent.setup();
    renderWithQuery(<AppsGrid />);
    await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
    const backupButtons = screen.getAllByRole('button', { name: /backup/i });
    await user.click(backupButtons[0]!);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      sourcePath: expect.stringContaining('nova-agent'),
      label: 'nova-agent'
    }));
  });
});
