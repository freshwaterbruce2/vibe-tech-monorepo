// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GatewayState } from './hooks/useGatewayData';

vi.mock('./hooks/useGatewayData', () => ({ useGatewayData: vi.fn() }));
vi.mock('./lib/api', () => ({
  apiBaseUrl: vi.fn(() => 'http://localhost:8675'),
  api: {
    diagnose: vi.fn().mockResolvedValue({ active: false, notice: 'offline' }),
    runMaintenance: vi
      .fn()
      .mockResolvedValue({ success: true, dryRun: true, script: 's', message: 'm' }),
    runCleanup: vi
      .fn()
      .mockResolvedValue({ success: true, dryRun: true, script: 's', message: 'm' }),
  },
}));

import { useGatewayData } from './hooks/useGatewayData';
import { apiBaseUrl } from './lib/api';
import App from './App';

const refetch = vi.fn();
const stateWith = (over: Partial<GatewayState>): GatewayState => ({
  loading: false,
  error: undefined,
  data: {},
  refetch,
  ...over,
});

const fullData: GatewayState['data'] = {
  workspace: { packages: [], drifts: [] },
  databases: { databases: [] },
  dDrive: {
    totalSize: '1 GB',
    freeSpace: '1 GB',
    learningSystem: { status: 'OK', staleFileCount: 0, insightsCount: 5, crashed: false },
  },
  telemetry: { healthScore: 95, mismatchedDeps: 0, activeLockfiles: 0, hasOOM: false },
  git: { branch: 'main', isDirty: false, recentCommits: [] },
};

beforeEach(() => vi.clearAllMocks());

describe('App', () => {
  it('shows the loading state', () => {
    vi.mocked(useGatewayData).mockReturnValue(stateWith({ loading: true }));
    render(<App />);
    expect(screen.getByText('loading…')).toBeInTheDocument();
  });

  it('shows the error/disconnected state with same-origin base', () => {
    vi.mocked(apiBaseUrl).mockReturnValue('');
    vi.mocked(useGatewayData).mockReturnValue(stateWith({ error: 'boom' }));
    render(<App />);
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
    expect(screen.getByText(/same-origin/)).toBeInTheDocument();
  });

  it('renders Overview by default and switches across all five tabs', async () => {
    vi.mocked(useGatewayData).mockReturnValue(stateWith({ data: fullData }));
    render(<App />);
    expect(screen.getByText(/Connected/)).toBeInTheDocument();
    expect(screen.getByText('Health Score')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Monorepo' }));
    expect(screen.getByText(/workspace members/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'D-Drive' }));
    expect(screen.getByText('Databases')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Git' }));
    expect(screen.getByText('main')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AI' }));
    await waitFor(() => expect(screen.getByText('AI Diagnostics')).toBeInTheDocument());
  });

  it('opens the maintenance modal from the footer and closes it', async () => {
    vi.mocked(useGatewayData).mockReturnValue(stateWith({ data: fullData }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Database Maintenance' }));
    await waitFor(() =>
      expect(screen.getByText('Run Database Maintenance', { selector: 'h2' })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens the cleanup modal from the footer and refetches on refresh', async () => {
    vi.mocked(useGatewayData).mockReturnValue(stateWith({ data: fullData }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Clean Stale Artifacts' }));
    await waitFor(() =>
      expect(screen.getByText('Clean Stale Artifacts', { selector: 'h2' })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: '↻ Refresh' }));
    expect(refetch).toHaveBeenCalled();
  });
});
