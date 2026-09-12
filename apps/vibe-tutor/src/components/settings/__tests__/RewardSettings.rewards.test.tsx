import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RewardSettings from '../RewardSettings';

const request = {
  schemaVersion: 1 as const,
  requestId: 'approved-1',
  reward: { id: 'reward-1', name: 'TV time', cost: 50 },
  createdAt: 1,
  updatedAt: 1,
  status: 'approved' as const,
  debitOperationId: 'reward-debit:approved-1',
  refundOperationId: 'reward-refund:approved-1',
};

describe('RewardSettings reward request controls', () => {
  it('shows both approved request outcomes', () => {
    render(<RewardSettings rewards={[request.reward]} onUpdateRewards={vi.fn().mockResolvedValue(true)} claimedRewards={[request]} onApproval={vi.fn().mockResolvedValue(true)} rewardError={null} />);
    expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mark fulfilled' })).toBeEnabled();
  });

  it('surfaces the explicit block and disables catalog and request controls', () => {
    render(<RewardSettings rewards={[request.reward]} onUpdateRewards={vi.fn().mockResolvedValue(true)} claimedRewards={[request]} onApproval={vi.fn().mockResolvedValue(true)} rewardError="Stored records require review." rewardBlocked />);
    expect(screen.getByRole('alert')).toHaveTextContent('Stored records require review.');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark fulfilled' })).toBeDisabled();
  });
});
