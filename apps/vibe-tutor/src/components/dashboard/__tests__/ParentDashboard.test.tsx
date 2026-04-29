import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClaimedReward, HomeworkItem, Reward } from '../../../types';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('@/services', () => ({
  syncService: {
    exportForHub: vi.fn().mockResolvedValue({ exportedCount: 3, directory: 'EXTERNAL_STORAGE', relativePath: 'export/2026-04-12.json' }),
  },
}));

vi.mock('../../core/SecurePinLock', () => ({
  default: ({ onUnlock }: { onUnlock: () => void }) => (
    <button data-testid="unlock-btn" onClick={onUnlock}>
      Unlock PIN
    </button>
  ),
}));

vi.mock('../ProgressReports', () => ({ default: () => <div>Progress Reports</div> }));
vi.mock('../ChatAnalytics', () => ({ default: () => <div>Chat Analytics</div> }));
vi.mock('../../settings/ScreenTimeSettings', () => ({
  default: () => <div>Screen Time Settings</div>,
}));
vi.mock('../../settings/RewardSettings', () => ({
  default: ({ onApproval }: { onApproval: (id: string, approved: boolean) => void }) => (
    <div>
      Reward Settings
      <button onClick={() => onApproval('reward-1', true)}>Approve Reward</button>
    </div>
  ),
}));
vi.mock('../../settings/DataManagement', () => ({ default: () => <div>Data Management</div> }));

import ParentDashboard from '../ParentDashboard';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockItems: HomeworkItem[] = [
  { id: '1', subject: 'Math', title: 'Algebra', dueDate: '2026-04-15', completed: true },
  { id: '2', subject: 'Science', title: 'Lab Report', dueDate: '2026-04-16', completed: false },
  { id: '3', subject: 'English', title: 'Essay', dueDate: '2026-04-17', completed: false },
];

const mockRewards: Reward[] = [{ id: 'r1', name: 'Extra screen time', cost: 100 }];
const mockClaimedRewards: ClaimedReward[] = [
  { id: 'cr1', claimedDate: Date.now(), name: 'Extra screen time', cost: 100 },
  { id: 'cr2', claimedDate: Date.now(), name: 'Extra screen time', cost: 100 },
];

const defaultProps = {
  items: mockItems,
  rewards: mockRewards,
  claimedRewards: mockClaimedRewards,
  onUpdateRewards: vi.fn(),
  onApproval: vi.fn(),
};

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Authentication gate ────────────────────────────────────────────────────
  describe('Authentication gate', () => {
    it('shows SecurePinLock when initially rendered', () => {
      render(<ParentDashboard {...defaultProps} />);
      expect(screen.getByTestId('unlock-btn')).toBeInTheDocument();
      expect(screen.queryByText('Parent Dashboard')).not.toBeInTheDocument();
    });

    it('shows the dashboard after PIN unlock', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => expect(screen.getByText('Parent Dashboard')).toBeInTheDocument());
    });

    it('relocks and shows SecurePinLock when Lock button is clicked', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByRole('button', { name: /lock/i }));

      fireEvent.click(screen.getByRole('button', { name: /lock/i }));

      await waitFor(() => expect(screen.getByTestId('unlock-btn')).toBeInTheDocument());
      expect(screen.queryByText('Parent Dashboard')).not.toBeInTheDocument();
    });
  });

  // ── Dashboard stats ────────────────────────────────────────────────────────
  describe('Dashboard stats', () => {
    it('shows the correct completed task count', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Tasks Done'));
      // 1 completed item out of 3
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows the correct pending rewards count', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Pending Rewards'));
      // 2 claimed rewards
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders all dashboard section headings', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Parent Dashboard'));

      // Section headings live in <h2> elements inside DashboardSection
      const heading = (name: string) => screen.getByRole('heading', { level: 2, name });
      expect(heading('Progress Reports')).toBeInTheDocument();
      expect(heading('Chat Analytics')).toBeInTheDocument();
      expect(heading('Screen Time')).toBeInTheDocument();
      expect(heading('Reward Settings')).toBeInTheDocument();
      expect(heading('Wellness Insights')).toBeInTheDocument();
      expect(heading('Data Management')).toBeInTheDocument();
    });
  });

  // ── Sync functionality ─────────────────────────────────────────────────────
  describe('Sync functionality', () => {
    it('calls exportForHub when Sync Hub is clicked', async () => {
      const { syncService } = await import('@/services');
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Sync Hub'));

      fireEvent.click(screen.getByText('Sync Hub'));

      await waitFor(() => expect(syncService.exportForHub).toHaveBeenCalledTimes(1));
    });

    it('shows "Syncing…" label while export is in progress', async () => {
      const { syncService } = await import('@/services');
      vi.mocked(syncService.exportForHub).mockImplementation(
        async () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ exportedCount: 1, directory: 'EXTERNAL_STORAGE' as never, relativePath: 'export/x.json' }), 100),
          ),
      );
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Sync Hub'));

      fireEvent.click(screen.getByText('Sync Hub'));

      await waitFor(() => expect(screen.getByText('Syncing…')).toBeInTheDocument());
    });

    it('alerts with success message on completed sync', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Sync Hub'));

      fireEvent.click(screen.getByText('Sync Hub'));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Export complete')),
      );
    });

    it('alerts with error message on sync failure', async () => {
      const { syncService } = await import('@/services');
      vi.mocked(syncService.exportForHub).mockRejectedValueOnce(new Error('USB not found'));
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Sync Hub'));

      fireEvent.click(screen.getByText('Sync Hub'));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Sync failed')),
      );
    });

    it('prevents double-clicking Sync Hub while syncing', async () => {
      const { syncService } = await import('@/services');
       
      let resolveExport!: (v: any) => void;
      vi.mocked(syncService.exportForHub).mockImplementation(
        async () => new Promise((resolve) => { resolveExport = resolve; }),
      );

      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Sync Hub'));

      fireEvent.click(screen.getByText('Sync Hub'));
      await waitFor(() => screen.getByText('Syncing…'));
      // Click again while syncing
      fireEvent.click(screen.getByText('Syncing…'));

      resolveExport({ exportedCount: 1, directory: 'EXTERNAL_STORAGE', relativePath: 'x.json' });
      await waitFor(() => expect(syncService.exportForHub).toHaveBeenCalledTimes(1));
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  describe('Navigation', () => {
    it('navigates to parent-rules when Rules button is clicked', async () => {
      const onNavigate = vi.fn();
      render(<ParentDashboard {...defaultProps} onNavigate={onNavigate} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByRole('button', { name: /rules/i }));

      fireEvent.click(screen.getByRole('button', { name: /rules/i }));

      expect(onNavigate).toHaveBeenCalledWith('parent-rules');
    });

    it('navigates to wellness when Open Wellness Hub is clicked', async () => {
      const onNavigate = vi.fn();
      render(<ParentDashboard {...defaultProps} onNavigate={onNavigate} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByRole('button', { name: /open wellness hub/i }));

      fireEvent.click(screen.getByRole('button', { name: /open wellness hub/i }));

      expect(onNavigate).toHaveBeenCalledWith('wellness');
    });

    it('does not render Rules button when onNavigate is not provided', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Parent Dashboard'));
      expect(screen.queryByRole('button', { name: /rules/i })).not.toBeInTheDocument();
    });
  });

  // ── Inactivity auto-lock ───────────────────────────────────────────────────
  describe('Inactivity auto-lock', () => {
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

    afterEach(() => vi.useRealTimers());

    it('relocks after 5 minutes of inactivity', async () => {
      vi.useFakeTimers();
      render(<ParentDashboard {...defaultProps} />);

      // fireEvent wraps in act — state update and useEffect both flush synchronously
      fireEvent.click(screen.getByTestId('unlock-btn'));
      expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();

      // Fire the inactivity timeout; await act so React applies the resulting state update
      await act(async () => {
        vi.advanceTimersByTime(INACTIVITY_TIMEOUT + 100);
      });

      expect(screen.getByTestId('unlock-btn')).toBeInTheDocument();
      expect(screen.queryByText('Parent Dashboard')).not.toBeInTheDocument();
    });

    it('resets the inactivity timer on user activity', async () => {
      vi.useFakeTimers();
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();

      // Advance 4 minutes (still within 5-minute timeout)
      await act(async () => { vi.advanceTimersByTime(4 * 60 * 1000); });
      expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();

      // User activity resets the timer (dispatches mousemove directly on window)
      window.dispatchEvent(new MouseEvent('mousemove'));

      // Advance another 4 minutes — only 4 min since reset, under 5-min threshold
      await act(async () => { vi.advanceTimersByTime(4 * 60 * 1000); });

      // Still unlocked because the timer was reset by the mousemove event
      expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();
    });
  });

  // ── Reward approval forwarding ─────────────────────────────────────────────
  describe('Reward approval', () => {
    it('forwards approval calls to the onApproval prop', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Approve Reward'));

      fireEvent.click(screen.getByText('Approve Reward'));

      expect(defaultProps.onApproval).toHaveBeenCalledWith('reward-1', true);
    });
  });
});
