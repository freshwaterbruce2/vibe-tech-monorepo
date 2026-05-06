import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AffectedDashboard } from './AffectedDashboard';
import type { AffectedProject, AffectedGraph } from '@shared/types';

const mockGet = vi.fn();
const mockRefresh = vi.fn();
const mockSpawn = vi.fn();

function setupBridge(data: AffectedGraph | null, error = false) {
  mockGet.mockReset();
  mockRefresh.mockReset();
  mockSpawn.mockReset();

  if (error) {
    mockGet.mockRejectedValue(new Error('graph failure'));
  } else if (data) {
    mockGet.mockResolvedValue({ ok: true, data, timestamp: Date.now() });
  } else {
    mockGet.mockReturnValue(new Promise(() => {}));
  }

  mockRefresh.mockResolvedValue({ ok: true, data: data ?? { projects: [], base: 'origin/main', head: 'HEAD', generatedAt: Date.now() }, timestamp: Date.now() });

  Object.defineProperty(window, 'commandCenter', {
    value: {
      affected: { get: mockGet, refresh: mockRefresh },
      process: { spawn: mockSpawn }
    },
    writable: true,
    configurable: true
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  return { qc, invalidateSpy };
}

const mockProjects: AffectedProject[] = [
  {
    name: 'nova-agent',
    type: 'app',
    root: 'apps/nova-agent',
    tags: ['scope:ai'],
    targets: ['build', 'serve'],
    upstream: [],
    downstream: ['shared-core'],
    healthScore: 100,
    riskFlags: []
  },
  {
    name: 'shared-core',
    type: 'lib',
    root: 'packages/shared-core',
    tags: ['scope:shared'],
    targets: ['build', 'test'],
    upstream: ['nova-agent', 'vibe-code-studio'],
    downstream: [],
    healthScore: 80,
    riskFlags: ['CROSS_TIER_1']
  },
  {
    name: 'vibe-code-studio',
    type: 'app',
    root: 'apps/vibe-code-studio',
    tags: ['scope:ide'],
    targets: ['build'],
    upstream: [],
    downstream: ['shared-core'],
    healthScore: 60,
    riskFlags: ['BUILD_STALE', 'NO_TEST_COVERAGE']
  }
];

const baseGraph: AffectedGraph = {
  base: 'origin/main',
  head: 'HEAD',
  projects: mockProjects,
  generatedAt: Date.now()
};

describe('AffectedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while useQuery is loading', () => {
    setupBridge(null);
    renderWithQuery(<AffectedDashboard />);
    expect(screen.getByText(/loading affected projects/i)).toBeTruthy();
  });

  it('shows error message in red when query fails', async () => {
    setupBridge(null, true);
    renderWithQuery(<AffectedDashboard />);
    await waitFor(() => expect(screen.getByText(/graph failure/i)).toBeTruthy());
    expect(screen.getByText(/graph failure/i).className).toContain('text-status-error');
  });

  it('shows empty state when graph has 0 projects', async () => {
    setupBridge({ ...baseGraph, projects: [] });
    renderWithQuery(<AffectedDashboard />);
    await waitFor(() => expect(screen.getByText(/no affected projects found/i)).toBeTruthy());
  });

  describe('project list rendering', () => {
    beforeEach(() => {
      setupBridge(baseGraph);
    });

    it('renders all projects with names', async () => {
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
      expect(screen.getByText('shared-core')).toBeTruthy();
      expect(screen.getByText('vibe-code-studio')).toBeTruthy();
    });

    it('renders type badges', async () => {
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
      const appBadges = screen.getAllByText('app');
      const libBadges = screen.getAllByText('lib');
      expect(appBadges.length).toBe(2);
      expect(libBadges.length).toBe(1);
    });

    it('renders health score badges with correct color classes', async () => {
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
      expect(screen.getByText('100').className).toContain('emerald');
      expect(screen.getByText('80').className).toContain('emerald');
      expect(screen.getByText('60').className).toContain('amber');
    });

    it('renders risk flag pills', async () => {
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('CROSS_TIER_1')).toBeTruthy());
      expect(screen.getByText('BUILD_STALE')).toBeTruthy();
      expect(screen.getByText('NO_TEST_COVERAGE')).toBeTruthy();
    });

    it('renders target chips in detail panel after selection', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
      await user.click(screen.getByText('nova-agent'));
      await waitFor(() => expect(screen.getByText('build')).toBeTruthy());
      expect(screen.getByText('serve')).toBeTruthy();
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      setupBridge(baseGraph);
    });

    it('filters by project name via search box', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      const input = screen.getByPlaceholderText(/search projects/i);
      await user.type(input, 'shared');

      await waitFor(() => {
        expect(screen.queryByText('nova-agent')).toBeNull();
        expect(screen.getByText('shared-core')).toBeTruthy();
        expect(screen.queryByText('vibe-code-studio')).toBeNull();
      });
    });

    it('type filter shows only apps', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /apps/i }));

      await waitFor(() => {
        expect(screen.getByText('nova-agent')).toBeTruthy();
        expect(screen.queryByText('shared-core')).toBeNull();
        expect(screen.getByText('vibe-code-studio')).toBeTruthy();
      });
    });

    it('type filter shows only libs', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /libs/i }));

      await waitFor(() => {
        expect(screen.queryByText('nova-agent')).toBeNull();
        expect(screen.getByText('shared-core')).toBeTruthy();
        expect(screen.queryByText('vibe-code-studio')).toBeNull();
      });
    });

    it('risk filter shows only projects with risks', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /has risks/i }));

      await waitFor(() => {
        expect(screen.queryByText('nova-agent')).toBeNull();
        expect(screen.getByText('shared-core')).toBeTruthy();
        expect(screen.getByText('vibe-code-studio')).toBeTruthy();
      });
    });

    it('risk filter shows only projects without risks', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /no risks/i }));

      await waitFor(() => {
        expect(screen.getByText('nova-agent')).toBeTruthy();
        expect(screen.queryByText('shared-core')).toBeNull();
        expect(screen.queryByText('vibe-code-studio')).toBeNull();
      });
    });
  });

  describe('selection & detail panel', () => {
    beforeEach(() => {
      setupBridge(baseGraph);
    });

    it('selecting a project shows detail panel with metadata', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('shared-core')).toBeTruthy());

      await user.click(screen.getByText('shared-core'));
      await waitFor(() => expect(screen.getByRole('heading', { name: 'shared-core' })).toBeTruthy());
      expect(screen.getByText('packages/shared-core')).toBeTruthy();
    });

    it('shows upstream and downstream lists in detail panel', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('shared-core')).toBeTruthy());

      await user.click(screen.getByText('shared-core'));
      await waitFor(() => expect(screen.getByRole('heading', { name: 'shared-core' })).toBeTruthy());

      // Upstream items are rendered inside <li> elements in the detail panel
      const upstreamSection = screen.getByText(/upstream/i).closest('div')!;
      expect(upstreamSection.textContent).toContain('nova-agent');
      expect(upstreamSection.textContent).toContain('vibe-code-studio');

      const downstreamSection = screen.getByText(/downstream/i).closest('div')!;
      expect(downstreamSection.textContent).toContain('This project has no dependencies');
    });

    it('shows empty upstream/downstream messages when lists are empty', async () => {
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      await user.click(screen.getByText('nova-agent'));
      await waitFor(() => expect(screen.getByText(/no projects depend on this/i)).toBeTruthy());
    });
  });

  describe('actions', () => {
    it('refresh button calls affected.refresh and invalidates query', async () => {
      setupBridge(baseGraph);
      const user = userEvent.setup();
      const { invalidateSpy } = renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      await user.click(screen.getByLabelText(/refresh affected graph/i));
      await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['affected', 'graph'] });
    });

    it('run affected button spawns process with correct command/args/cwd', async () => {
      setupBridge(baseGraph);
      const user = userEvent.setup();
      renderWithQuery(<AffectedDashboard />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());

      await user.click(screen.getByText('nova-agent'));
      await waitFor(() => expect(screen.getByRole('heading', { name: 'nova-agent' })).toBeTruthy());

      await user.click(screen.getByLabelText(/run affected/i));
      await waitFor(() => expect(mockSpawn).toHaveBeenCalled());

      expect(mockSpawn).toHaveBeenCalledWith({
        command: 'pnpm',
        args: ['exec', 'nx', 'affected', '-t', 'lint', 'typecheck', 'test'],
        cwd: 'C:\\dev'
      });
    });
  });
});
