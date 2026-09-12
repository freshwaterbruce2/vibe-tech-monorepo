import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubjectCards from '../SubjectCards';
import { claimDailyChallenge, confirmDailyChallengeClaim, getDailyChallengeStatus } from '../../../services/progressionService';

vi.mock('../../../services/progressionService', () => ({
  getAllProgress: vi.fn().mockResolvedValue({}),
  getDailyChallengeStatus: vi.fn(),
  claimDailyChallenge: vi.fn(),
  confirmDailyChallengeClaim: vi.fn(),
}));

vi.mock('../../../services/tokenService', () => ({
  getTodayEarnings: vi.fn(() => 0),
}));

describe('SubjectCards daily worksheet challenge', () => {
  const onEarnTokens = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDailyChallengeStatus).mockResolvedValue({
      date: '2026-08-23',
      completedCount: 3,
      target: 3,
      claimed: false,
    });
    vi.mocked(claimDailyChallenge).mockResolvedValue({
      claimed: true,
      status: {
        date: '2026-08-23',
        completedCount: 3,
        target: 3,
        claimed: true,
      },
    });
    vi.mocked(confirmDailyChallengeClaim).mockResolvedValue();
  });

  it('awards the real token callback only after the persisted daily claim succeeds', async () => {
    render(<SubjectCards onStartWorksheet={vi.fn()} onEarnTokens={onEarnTokens} userTokens={10} />);

    const claimButton = await screen.findByRole('button', { name: 'Claim tokens' });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(claimDailyChallenge).toHaveBeenCalledWith(3);
      expect(onEarnTokens).toHaveBeenCalledWith(25, 'Daily worksheet challenge', expect.stringMatching(/^daily-worksheet:/));
      expect(confirmDailyChallengeClaim).toHaveBeenCalledWith('2026-08-23');
      expect(screen.getByText('Claimed today')).toBeInTheDocument();
    });
  });

  it('does not award tokens when the persisted claim rejects a replay', async () => {
    vi.mocked(claimDailyChallenge).mockResolvedValue({
      claimed: false,
      status: {
        date: '2026-08-23',
        completedCount: 3,
        target: 3,
        claimed: true,
      },
    });

    render(<SubjectCards onStartWorksheet={vi.fn()} onEarnTokens={onEarnTokens} userTokens={10} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Claim tokens' }));

    await waitFor(() => expect(screen.getByText('Claimed today')).toBeInTheDocument());
    expect(onEarnTokens).not.toHaveBeenCalled();
  });

  it('shows an honest recovery message when the persisted claim reward cannot be saved', async () => {
    onEarnTokens.mockResolvedValueOnce(false);
    render(<SubjectCards onStartWorksheet={vi.fn()} onEarnTokens={onEarnTokens} userTokens={10} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Claim tokens' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/token reward could not be saved/i);
  });
});
