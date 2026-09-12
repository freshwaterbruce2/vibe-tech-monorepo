import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { shopProps, loggerError } = vi.hoisted(() => ({ shopProps: vi.fn(), loggerError: vi.fn() }));
vi.mock('../avatar/AvatarShopUnified', () => ({
  AvatarShopUnified: (props: { userTokens: number; onSpendTokens: (...args: unknown[]) => Promise<boolean>; onPurchaseComplete: (operationId: `avatar-purchase:${string}`) => Promise<void>; onClose: () => void }) => <div data-testid="unified-shop"><span>{props.userTokens}</span><button onClick={props.onClose}>Close shop</button><button onClick={() => void props.onPurchaseComplete('avatar-purchase:123e4567-e89b-42d3-a456-426614174000')}>Complete purchase</button>{shopProps(props)}</div>,
}));
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: loggerError,
  },
}));

const { AppViewRenderer } = await import('../AppViewRenderer');

const props = () => ({
  achievements: [], claimedRewards: [], dashboardOnboardingAction: null, homeworkItems: [], onboardingFlags: { loaded: true, hasCompletedFirstRun: true, userAvatar: '', hasVisitedShop: false, checklistDone: true }, rewards: [], rewardError: null, rewardBlocked: false, selectedRealmSubject: null, userName: '', userTokens: 37, view: 'shop' as const, worksheetLeveledUp: false, worksheetNewDifficulty: undefined, worksheetProgress: null, worksheetSession: null, worksheetStarsToNextLevel: 0, worksheetSubject: null,
  handleAddHomework: vi.fn(), handleChecklistNavigate: vi.fn(), handleClaimReward: vi.fn(), handleEarnTokens: vi.fn(), handleGameCompleted: vi.fn(), handleOnboardingComplete: vi.fn(), handleSpendTokens: vi.fn().mockResolvedValue(true), handleStartWorksheet: vi.fn(), handleToggleComplete: vi.fn(), requestCompletionSync: vi.fn().mockResolvedValue(undefined), handleWorksheetCancel: vi.fn(), handleWorksheetComplete: vi.fn(), handleWorksheetContinue: vi.fn(), handleWorksheetTryAgain: vi.fn(), handleRewardApprovalWrapper: vi.fn(), updateRewards: vi.fn(), onDashboardOnboardingActionHandled: vi.fn(), onUserNameSaved: vi.fn(), setSelectedRealmSubject: vi.fn(), setView: vi.fn(), handleAchievementEvent: vi.fn().mockResolvedValue(true),
});

describe('AppViewRenderer shop route', () => {
  it('uses the unified shop, forwards its token contract, and closes to dashboard', async () => {
    const input = props();
    render(<AppViewRenderer {...input} />);
    await screen.findByTestId('unified-shop');
    expect(shopProps).toHaveBeenCalledWith(expect.objectContaining({ userTokens: 37, onSpendTokens: input.handleSpendTokens }));
    fireEvent.click(screen.getByRole('button', { name: /close shop/i }));
    expect(input.setView).toHaveBeenCalledWith('dashboard');
  });

  it('records SHOP_PURCHASE only after the shop confirms completion and contains achievement rejection', async () => {
    const input = props();
    input.handleAchievementEvent.mockRejectedValue(new Error('achievement unavailable'));
    render(<AppViewRenderer {...input} />);
    await screen.findByTestId('unified-shop');
    expect(input.handleAchievementEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /complete purchase/i }));
    await waitFor(() => expect(input.handleAchievementEvent).toHaveBeenCalledWith({ type: 'SHOP_PURCHASE', eventId: 'shop-purchase:avatar-purchase:123e4567-e89b-42d3-a456-426614174000' }));
    await waitFor(() => expect(loggerError).toHaveBeenCalledWith('[avatar-shop] Confirmed purchase achievement event failed', expect.any(Error)));
  });
});
