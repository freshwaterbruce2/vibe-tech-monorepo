import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usageMonitor } = vi.hoisted(() => ({ usageMonitor: {
  getUsageStats: vi.fn(() => ({ dailyRequests: 1, dailyScreenTime: 10, lastReset: 'today' })),
  getLimits: vi.fn(() => ({ maxDailyRequests: 30, maxDailyScreenTime: 120, maxConsecutiveTime: 30, breakDuration: 10, quietHoursStart: 21, quietHoursEnd: 7 })),
  updateLimits: vi.fn().mockResolvedValue(undefined),
  resetToday: vi.fn().mockResolvedValue(undefined),
  generateReport: vi.fn(() => 'AI replies: 1/50'),
  isDevBypassActive: vi.fn(() => false),
  getDevBypassRemainingMinutes: vi.fn(() => 0),
  enableDevBypass: vi.fn(),
  disableDevBypass: vi.fn(),
} }));

vi.mock('../../../services/usageMonitor', () => ({ usageMonitor }));
import ScreenTimeSettings from '../ScreenTimeSettings';

describe('ScreenTimeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usageMonitor.updateLimits.mockResolvedValue(undefined);
    usageMonitor.resetToday.mockResolvedValue(undefined);
  });

  it('states the limited AI-reply scope and contains no Admin/testing controls', () => {
    render(<ScreenTimeSettings />);
    expect(screen.getByText(/pause new AI Tutor\/Buddy replies/i)).toBeInTheDocument();
    expect(screen.getByText(/may pause replies sooner.*30\/UTC-day, 200\/UTC-month allowance/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /daily tutor\/buddy ai replies/i })).toHaveAttribute('max', '30');
    expect(screen.queryByText(/Admin Mode|testing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Focus Sessions|Homework Completed|Violations/i)).not.toBeInTheDocument();
  });

  it('does not announce a save until the strict update resolves and surfaces failure', async () => {
    let resolve!: () => void;
    usageMonitor.updateLimits.mockReturnValueOnce(new Promise<void>((done) => { resolve = done; }));
    render(<ScreenTimeSettings />);
    fireEvent.click(screen.getByRole('button', { name: /save limits/i }));
    expect(screen.getByRole('button', { name: /saving limits/i })).toBeDisabled();
    expect(screen.getByRole('slider', { name: /daily tutor\/buddy ai replies/i })).toBeDisabled();
    expect(screen.queryByText(/limits saved/i)).not.toBeInTheDocument();
    resolve();
    await screen.findByText(/limits saved/i);

    usageMonitor.updateLimits.mockRejectedValueOnce(new Error('storage unavailable'));
    fireEvent.click(screen.getByRole('button', { name: /save limits/i }));
    await screen.findByText(/could not save/i);
  });

  it('awaits reset without reloading and updates the displayed usage after success', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<ScreenTimeSettings />);
    fireEvent.click(screen.getByRole('button', { name: /reset today/i }));
    await waitFor(() => expect(usageMonitor.resetToday).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/today's AI reply and visible app time/i)).toBeInTheDocument();
  });

  it('toggles developer bypass for nocturnal verification', async () => {
    render(<ScreenTimeSettings />);
    const bypassButton = screen.getByRole('button', { name: /enable 1-hour bypass/i });
    expect(bypassButton).toBeInTheDocument();
    fireEvent.click(bypassButton);
    expect(usageMonitor.enableDevBypass).toHaveBeenCalledWith(3600000);
    expect(screen.getByText(/developer bypass active for 1 hour/i)).toBeInTheDocument();
  });
});
