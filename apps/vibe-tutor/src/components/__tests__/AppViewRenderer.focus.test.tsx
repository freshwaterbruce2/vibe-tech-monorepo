import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { focusProps, focusSession } = vi.hoisted(() => ({
  focusProps: vi.fn(),
  focusSession: {
    id: 'focus:11111111-1111-4111-8111-111111111111',
    startTime: 1_724_998_500_000,
    endTime: 1_725_000_000_000,
    duration: 25,
    completed: true,
  },
}));

vi.mock('../features/FocusTimer', () => ({
  default: (props: { onDurableFocusCompletion: (session: unknown) => void | Promise<void> }) => (
    <button type="button" onClick={() => void props.onDurableFocusCompletion(focusSession)}>
      Complete durable focus
      {focusProps(props)}
    </button>
  ),
}));

const { AppViewRenderer } = await import('../AppViewRenderer');

const props = () => ({
  achievements: [], claimedRewards: [], dashboardOnboardingAction: null, homeworkItems: [], onboardingFlags: { loaded: true, hasCompletedFirstRun: true, userAvatar: '', hasVisitedShop: false, checklistDone: true }, rewards: [], rewardError: null, rewardBlocked: false, selectedRealmSubject: null, userName: '', userTokens: 37, view: 'focus' as const, worksheetLeveledUp: false, worksheetNewDifficulty: undefined, worksheetProgress: null, worksheetSession: null, worksheetStarsToNextLevel: 0, worksheetSubject: null,
  handleAddHomework: vi.fn(), handleChecklistNavigate: vi.fn(), handleClaimReward: vi.fn(), handleEarnTokens: vi.fn(), handleGameCompleted: vi.fn(), handleOnboardingComplete: vi.fn(), handleSpendTokens: vi.fn().mockResolvedValue(true), handleStartWorksheet: vi.fn(), handleToggleComplete: vi.fn(), requestCompletionSync: vi.fn().mockResolvedValue(undefined), handleWorksheetCancel: vi.fn(), handleWorksheetComplete: vi.fn(), handleWorksheetContinue: vi.fn(), handleWorksheetTryAgain: vi.fn(), handleRewardApprovalWrapper: vi.fn(), updateRewards: vi.fn(), onDashboardOnboardingActionHandled: vi.fn(), onUserNameSaved: vi.fn(), setSelectedRealmSubject: vi.fn(), setView: vi.fn(), handleAchievementEvent: vi.fn().mockResolvedValue(true),
});

describe('AppViewRenderer focus route', () => {
  it('delegates a durable FocusTimer completion solely to the journal coordinator', async () => {
    const input = props();
    render(<AppViewRenderer {...input} />);

    await screen.findByRole('button', { name: /complete durable focus/i });
    expect(focusProps).toHaveBeenCalledWith(expect.objectContaining({ onDurableFocusCompletion: expect.any(Function) }));
    fireEvent.click(screen.getByRole('button', { name: /complete durable focus/i }));

    await waitFor(() => expect(input.requestCompletionSync).toHaveBeenCalledTimes(1));
    expect(input.requestCompletionSync).toHaveBeenCalledWith();
    expect(input.handleEarnTokens).not.toHaveBeenCalled();
    expect(input.handleAchievementEvent).not.toHaveBeenCalled();
    expect(focusSession).toEqual({
      id: 'focus:11111111-1111-4111-8111-111111111111',
      startTime: 1_724_998_500_000,
      endTime: 1_725_000_000_000,
      duration: 25,
      completed: true,
    });
  });
});
