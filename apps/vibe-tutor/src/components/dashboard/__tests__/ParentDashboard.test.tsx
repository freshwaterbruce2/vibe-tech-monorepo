import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeworkItem, Reward, RewardRequest } from '../../../types';

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
  default: ({ onApproval }: { onApproval: (id: string, action: 'approve') => void }) => (
    <div>
      Reward Settings
      <button onClick={() => onApproval('reward-1', 'approve')}>Approve Reward</button>
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
const mockClaimedRewards: RewardRequest[] = [
  { schemaVersion: 1, requestId: 'cr1', reward: mockRewards[0]!, createdAt: 1, updatedAt: 1, status: 'pending_approval', debitOperationId: 'reward-debit:cr1', refundOperationId: 'reward-refund:cr1' },
  { schemaVersion: 1, requestId: 'cr2', reward: mockRewards[0]!, createdAt: 1, updatedAt: 1, status: 'fulfilled', debitOperationId: 'reward-debit:cr2', refundOperationId: 'reward-refund:cr2' },
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
      expect(within(screen.getByText('Tasks Done').parentElement!).getByText('1')).toBeInTheDocument();
    });

    it('shows the correct pending rewards count', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByText('Open Reward Requests'));
      // Only pending, debit, approved, and refund-in-progress requests are open.
      expect(within(screen.getByText('Open Reward Requests').parentElement!).getByText('1')).toBeInTheDocument();
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

  describe('Android-only privacy boundary', () => {
    it('does not expose a Sync Hub, export, or USB action after unlock', async () => {
      render(<ParentDashboard {...defaultProps} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => expect(screen.getByText('Parent Dashboard')).toBeInTheDocument());

      expect(screen.queryByText(/sync hub|syncing|export|usb/i)).not.toBeInTheDocument();
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  describe('Navigation', () => {
    it('does not expose Parent Rules after unlock while preserving Wellness navigation', async () => {
      const onNavigate = vi.fn();
      render(<ParentDashboard {...defaultProps} onNavigate={onNavigate} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));

      await waitFor(() => screen.getByRole('button', { name: /open wellness hub/i }));
      expect(screen.queryByRole('button', { name: /rules|parent rules/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /open wellness hub/i }));
      expect(onNavigate).toHaveBeenCalledWith('wellness');
    });

    it('navigates to wellness when Open Wellness Hub is clicked', async () => {
      const onNavigate = vi.fn();
      render(<ParentDashboard {...defaultProps} onNavigate={onNavigate} />);
      fireEvent.click(screen.getByTestId('unlock-btn'));
      await waitFor(() => screen.getByRole('button', { name: /open wellness hub/i }));

      fireEvent.click(screen.getByRole('button', { name: /open wellness hub/i }));

      expect(onNavigate).toHaveBeenCalledWith('wellness');
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

      expect(defaultProps.onApproval).toHaveBeenCalledWith('reward-1', 'approve');
    });
  });
});
