import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AchievementCenter from '../AchievementCenter';

describe('AchievementCenter reward safety UI', () => {
  it('labels the request history and disables claims while reward storage is blocked', () => {
    render(<AchievementCenter achievements={[]} rewards={[{ id: 'reward-1', name: 'TV time', cost: 50 }, { id: 'reward-2', name: 'Game time', cost: 25 }]} claimedRewards={[{ schemaVersion: 1, requestId: 'request-1', reward: { id: 'reward-1', name: 'TV time', cost: 50 }, createdAt: 1, updatedAt: 1, status: 'pending_approval', debitOperationId: 'reward-debit:request-1', refundOperationId: 'reward-refund:request-1' }]} userTokens={100} rewardError="Stored records require review." rewardBlocked onClaimReward={vi.fn().mockResolvedValue(false)} />);
    fireEvent.click(screen.getByRole('button', { name: /rewards/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Stored records require review.');
    expect(screen.getByRole('heading', { name: /reward requests/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled();
  });
});
