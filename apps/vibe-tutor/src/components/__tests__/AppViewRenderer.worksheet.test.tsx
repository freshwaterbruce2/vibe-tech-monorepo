import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { worksheetProps, worksheetSession } = vi.hoisted(() => ({
  worksheetProps: vi.fn(),
  worksheetSession: {
    id: 'worksheet:11111111-1111-4111-8111-111111111111',
    subject: 'Math',
    difficulty: 'Beginner',
    questions: [],
    answers: [],
    score: 100,
    starsEarned: 5,
    completedAt: 1,
    timeSpent: 1,
  },
}));

vi.mock('../features/WorksheetView', () => ({
  default: (props: { onComplete: (session: typeof worksheetSession) => Promise<boolean> }) => (
    <button type="button" onClick={() => void props.onComplete(worksheetSession)}>
      Complete durable worksheet
      {worksheetProps(props)}
    </button>
  ),
}));

const { AppViewRenderer } = await import('../AppViewRenderer');

const props = () => ({
  achievements: [],
  claimedRewards: [],
  dashboardOnboardingAction: null,
  homeworkItems: [],
  onboardingFlags: {
    loaded: true,
    hasCompletedFirstRun: true,
    userAvatar: '',
    hasVisitedShop: false,
    checklistDone: true,
  },
  rewards: [],
  rewardError: null,
  rewardBlocked: false,
  selectedRealmSubject: 'Math' as const,
  userName: '',
  userTokens: 37,
  view: 'cards' as const,
  worksheetLeveledUp: false,
  worksheetNewDifficulty: undefined,
  worksheetProgress: {
    subject: 'Math' as const,
    currentDifficulty: 'Beginner' as const,
    starsCollected: 0,
    totalWorksheetsCompleted: 0,
    averageScore: 0,
    bestScore: 0,
    currentStreak: 0,
    history: [],
    unlockedAt: 1,
  },
  worksheetSession: null,
  worksheetStarsToNextLevel: 0,
  worksheetSubject: 'Math' as const,
  handleAddHomework: vi.fn(),
  handleChecklistNavigate: vi.fn(),
  handleClaimReward: vi.fn(),
  handleEarnTokens: vi.fn(),
  handleGameCompleted: vi.fn(),
  handleOnboardingComplete: vi.fn(),
  handleSpendTokens: vi.fn().mockResolvedValue(true),
  handleStartWorksheet: vi.fn(),
  handleToggleComplete: vi.fn(),
  requestCompletionSync: vi.fn().mockResolvedValue(undefined),
  handleWorksheetCancel: vi.fn(),
  handleWorksheetComplete: vi.fn().mockResolvedValue(true),
  handleWorksheetContinue: vi.fn(),
  handleWorksheetTryAgain: vi.fn(),
  handleRewardApprovalWrapper: vi.fn(),
  updateRewards: vi.fn(),
  onDashboardOnboardingActionHandled: vi.fn(),
  onUserNameSaved: vi.fn(),
  setSelectedRealmSubject: vi.fn(),
  setView: vi.fn(),
  handleAchievementEvent: vi.fn().mockResolvedValue(true),
});

describe('AppViewRenderer worksheet route', () => {
  it('passes through the primary completion Promise instead of discarding it', async () => {
    const input = props();
    render(<AppViewRenderer {...input} />);

    await screen.findByRole('button', { name: /complete durable worksheet/i });
    const completion = worksheetProps.mock.calls.at(-1)?.[0].onComplete(worksheetSession);
    expect(completion).toBe(input.handleWorksheetComplete.mock.results[0]?.value);
    await expect(completion).resolves.toBe(true);
    expect(input.handleWorksheetComplete).toHaveBeenCalledWith(worksheetSession);
  });
});
