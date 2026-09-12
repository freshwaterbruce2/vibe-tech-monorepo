import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  dataStore,
  appIntegration,
  useHomework,
  useAchievements,
  useRewards,
  useWorksheet,
  earnTokens,
  getRecoverableCompletionDeliveries,
  markCompletionDeliveryLegSettled,
  getRecoverableWorksheetDeliveries,
  markWorksheetDeliveryLegSettled,
} = vi.hoisted(() => ({
  dataStore: {
    initialize: vi.fn(),
    getUserSettings: vi.fn(),
    getAvatarState: vi.fn(),
    saveUserSettings: vi.fn(),
    saveAvatarState: vi.fn(),
  },
  appIntegration: { initialize: vi.fn() },
  useHomework: vi.fn(),
  useAchievements: vi.fn(),
  useRewards: vi.fn(),
  useWorksheet: vi.fn(),
  earnTokens: vi.fn(),
  getRecoverableCompletionDeliveries: vi.fn(),
  markCompletionDeliveryLegSettled: vi.fn(),
  getRecoverableWorksheetDeliveries: vi.fn(),
  markWorksheetDeliveryLegSettled: vi.fn(),
}));

vi.mock('./services/dataStore', () => ({ dataStore }));
vi.mock('./services/appIntegration', () => ({ appIntegration }));
vi.mock('./services/sensoryPreferences', () => ({
  initializeSensoryPreferences: vi.fn(),
  loadSensoryPreferences: vi.fn().mockResolvedValue({}),
}));
vi.mock('./services/soundEffects', () => ({ soundEffects: { applyPreferences: vi.fn() } }));
vi.mock('./services/uiService', () => ({ triggerVibration: vi.fn() }));
vi.mock('./components/ui/AchievementToast', () => ({ default: () => null }));
vi.mock('./components/ui/OfflineIndicator', () => ({ default: () => null }));
vi.mock('./components/ui/Sidebar', () => ({ default: () => <div data-testid="normal-shell" /> }));
vi.mock('./components/AppViewRenderer', () => ({
  AppViewRenderer: ({
    handleOnboardingComplete,
    handleToggleComplete,
  }: {
    handleOnboardingComplete: (data: { name: string; avatar: string; userType: 'student' }) => void;
    handleToggleComplete: (id: string) => Promise<void>;
  }) => (
    <>
      <div>Normal app view</div>
      <button
        onClick={() =>
          handleOnboardingComplete({
            name: 'Ava',
            avatar: 'avatar-boy-headphones',
            userType: 'student',
          })
        }
      >
        Complete onboarding
      </button>
      <button onClick={() => void handleToggleComplete('h1')}>Toggle homework</button>
    </>
  ),
}));
vi.mock('./components/features/TokenEarnAnimation', () => ({ TokenEarnAnimation: () => null }));
vi.mock('./components/core/FirstRunOnboarding', () => ({ WELCOME_TOKENS: 25 }));
vi.mock('./services/avatarShopData', () => ({
  DEFAULT_UNLOCKED_AVATAR_IDS: [],
  normalizeAvatarId: (id: string) => id,
}));
vi.mock('./services/gameProgression', () => ({ createGameCompletionPayload: vi.fn() }));
vi.mock('./services/completionDeliveryService', () => ({
  getRecoverableCompletionDeliveries,
  markCompletionDeliveryLegSettled,
}));
vi.mock('./services/progressionService', () => ({
  getRecoverableWorksheetDeliveries,
  markWorksheetDeliveryLegSettled,
}));
vi.mock('./hooks/useHomework', () => ({ useHomework }));
vi.mock('./hooks/useTokenEconomy', () => ({
  useTokenEconomy: () => ({ userTokens: 0, earnTokens, spendTokens: vi.fn() }),
}));
vi.mock('./hooks/useAchievements', () => ({ useAchievements }));
vi.mock('./hooks/useRewards', () => ({ useRewards }));
vi.mock('./hooks/useWorksheet', () => ({
  useWorksheet: (options: unknown) => useWorksheet(options) as unknown,
}));
const worksheetHookResult = () => ({
  worksheetSubject: null,
  worksheetSession: null,
  worksheetProgress: 0,
  worksheetLeveledUp: false,
  worksheetNewDifficulty: null,
  worksheetStarsToNextLevel: 0,
  startWorksheet: vi.fn(),
  completeWorksheetSession: vi.fn(),
  cancelWorksheet: vi.fn(),
  tryAgain: vi.fn(),
  continueToSubjects: vi.fn(),
});

const { default: App } = await import('./App');

describe('App native persistence startup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    dataStore.initialize.mockRejectedValue(new Error('SQLite unavailable'));
    dataStore.getUserSettings.mockResolvedValue('');
    dataStore.getAvatarState.mockResolvedValue(null);
    dataStore.saveUserSettings.mockResolvedValue(undefined);
    dataStore.saveAvatarState.mockResolvedValue(undefined);
    earnTokens.mockResolvedValue({ ok: true, duplicate: false });
    getRecoverableCompletionDeliveries.mockResolvedValue([]);
    markCompletionDeliveryLegSettled.mockResolvedValue(undefined);
    getRecoverableWorksheetDeliveries.mockResolvedValue([]);
    markWorksheetDeliveryLegSettled.mockResolvedValue(undefined);
    useWorksheet.mockReturnValue(worksheetHookResult());
    useHomework.mockReturnValue({
      homeworkItems: [],
      addHomework: vi.fn(),
      toggleComplete: vi.fn(),
    });
    useAchievements.mockReturnValue({
      achievements: [],
      newlyUnlocked: null,
      bonusTokens: 0,
      handleAchievementEvent: vi.fn(),
      clearNotification: vi.fn(),
      achievementError: false,
      retryAchievements: vi.fn(),
      isSettlingAchievements: false,
    });
    useRewards.mockReturnValue({
      rewards: [],
      claimedRewards: [],
      claimReward: vi.fn(() => 0),
      handleRewardApproval: vi.fn(() => 0),
      updateRewards: vi.fn(),
    });
  });

  it('blocks normal startup after persistence failure and retries locally', async () => {
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be opened');
    expect(screen.queryByTestId('normal-shell')).not.toBeInTheDocument();
    expect(appIntegration.initialize).not.toHaveBeenCalled();
    expect(useHomework).not.toHaveBeenCalled();
    expect(useAchievements).not.toHaveBeenCalled();
    expect(useRewards).not.toHaveBeenCalled();

    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: /retry startup/i }));

    await waitFor(() => expect(screen.getByTestId('normal-shell')).toBeInTheDocument());
    expect(useHomework).toHaveBeenCalledTimes(1);
    expect(useAchievements).toHaveBeenCalledTimes(1);
    expect(useRewards).toHaveBeenCalledTimes(1);
  });

  it('loads the canonical selected avatar without reading legacy user_avatar', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    dataStore.getAvatarState.mockResolvedValue({
      selectedAvatarId: 'avatar-boy-headphones',
      equippedItems: {},
      ownedItems: [],
      unlockedAvatars: ['avatar-boy-headphones'],
    });
    render(<App />);
    await screen.findByTestId('normal-shell');
    expect(dataStore.getAvatarState).toHaveBeenCalledTimes(1);
    expect(dataStore.getUserSettings).not.toHaveBeenCalledWith('user_avatar');
  });

  it('renders the accessible achievement retry banner and disables retry while settling', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    const retryAchievements = vi.fn();
    useAchievements.mockReturnValue({
      achievements: [],
      newlyUnlocked: null,
      bonusTokens: 0,
      handleAchievementEvent: vi.fn(),
      clearNotification: vi.fn(),
      achievementError: true,
      retryAchievements,
      isSettlingAchievements: false,
    });
    const { rerender } = render(<App />);
    await screen.findByTestId('normal-shell');
    const retry = screen.getByRole('button', { name: /retry achievement sync/i });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(retryAchievements).toHaveBeenCalledTimes(1);
    useAchievements.mockReturnValue({
      achievements: [],
      newlyUnlocked: null,
      bonusTokens: 0,
      handleAchievementEvent: vi.fn(),
      clearNotification: vi.fn(),
      achievementError: true,
      retryAchievements,
      isSettlingAchievements: true,
    });
    rerender(<App />);
    expect(screen.getByRole('button', { name: /retry achievement sync/i })).toBeDisabled();
  });

  it('settles journal legs after the startup barrier with exact stable token and achievement payloads', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    const handleAchievementEvent = vi.fn().mockResolvedValue(true);
    useAchievements.mockReturnValue({
      achievements: [],
      newlyUnlocked: null,
      bonusTokens: 0,
      handleAchievementEvent,
      clearNotification: vi.fn(),
      achievementError: false,
      retryAchievements: vi.fn(),
      isSettlingAchievements: false,
    });
    getRecoverableCompletionDeliveries.mockResolvedValueOnce([
      {
        deliveryId: 'completion-delivery:homework:h1',
        sourceState: 'confirmed',
        token: {
          state: 'pending',
          amount: 10,
          reason: 'Homework completed',
          operationId: 'homework-complete:h1',
        },
        achievement: {
          state: 'pending',
          eventType: 'TASK_COMPLETED',
          eventId: 'homework-completed:h1',
          payload: { completionDay: '2026-06-30' },
        },
      },
    ]);
    render(<App />);
    await waitFor(() => expect(markCompletionDeliveryLegSettled).toHaveBeenCalledTimes(2));
    expect(appIntegration.initialize).toHaveBeenCalledBefore(
      getRecoverableCompletionDeliveries as never,
    );
    expect(earnTokens).toHaveBeenCalledWith(10, 'Homework completed', 'homework-complete:h1');
    expect(handleAchievementEvent).toHaveBeenCalledWith({
      type: 'TASK_COMPLETED',
      eventId: 'homework-completed:h1',
      payload: { completionDay: '2026-06-30' },
    });
    expect(markCompletionDeliveryLegSettled).toHaveBeenCalledWith(
      'completion-delivery:homework:h1',
      'token',
    );
    expect(markCompletionDeliveryLegSettled).toHaveBeenCalledWith(
      'completion-delivery:homework:h1',
      'achievement',
    );
  });

  it('settles durable Worksheet token and achievement facts after app integration without a second banner', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    const handleAchievementEvent = vi.fn().mockResolvedValue(true);
    useAchievements.mockReturnValue({
      achievements: [],
      newlyUnlocked: null,
      bonusTokens: 0,
      handleAchievementEvent,
      clearNotification: vi.fn(),
      achievementError: false,
      retryAchievements: vi.fn(),
      isSettlingAchievements: false,
    });
    getRecoverableWorksheetDeliveries.mockResolvedValueOnce([
      {
        source: { id: 'worksheet:11111111-1111-4111-8111-111111111111' },
        token: {
          state: 'pending',
          amount: 5,
          reason: 'Worksheet completion',
          operationId: 'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
        },
        achievement: {
          state: 'pending',
          eventId: 'worksheet-completed:worksheet:11111111-1111-4111-8111-111111111111',
        },
      },
    ]);
    render(<App />);
    await waitFor(() => expect(markWorksheetDeliveryLegSettled).toHaveBeenCalledTimes(2));
    expect(appIntegration.initialize).toHaveBeenCalledBefore(
      getRecoverableWorksheetDeliveries as never,
    );
    expect(earnTokens).toHaveBeenCalledWith(
      5,
      'Worksheet completion',
      'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
    );
    expect(handleAchievementEvent).toHaveBeenCalledWith({
      type: 'WORKSHEET_COMPLETED',
      eventId: 'worksheet-completed:worksheet:11111111-1111-4111-8111-111111111111',
    });
    expect(markWorksheetDeliveryLegSettled).toHaveBeenCalledWith(
      'worksheet:11111111-1111-4111-8111-111111111111',
      'token',
      'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
    );
    expect(markWorksheetDeliveryLegSettled).toHaveBeenCalledWith(
      'worksheet:11111111-1111-4111-8111-111111111111',
      'achievement',
      'worksheet-completed:worksheet:11111111-1111-4111-8111-111111111111',
    );
    expect(screen.queryAllByText(/worksheet points need attention/i)).toHaveLength(0);
  });

  it('does not send a settled zero-token Worksheet leg', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    getRecoverableWorksheetDeliveries.mockResolvedValueOnce([
      {
        source: { id: 'worksheet:11111111-1111-4111-8111-111111111111' },
        token: {
          state: 'settled',
          amount: 0,
          reason: 'Worksheet completion',
          operationId: 'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
        },
        achievement: {
          state: 'settled',
          eventId: 'worksheet-completed:worksheet:11111111-1111-4111-8111-111111111111',
        },
      },
    ]);
    render(<App />);
    await waitFor(() => expect(getRecoverableWorksheetDeliveries).toHaveBeenCalledTimes(1));
    expect(earnTokens).not.toHaveBeenCalled();
    expect(markWorksheetDeliveryLegSettled).not.toHaveBeenCalled();
  });

  it.each([
    ['token false', { earn: false }, 'achievement'],
    ['token throw', { earn: 'throw' }, 'achievement'],
    ['token mark failure', { tokenMark: 'throw' }, 'achievement'],
    ['achievement false', { achievement: false }, 'token'],
    ['achievement throw', { achievement: 'throw' }, 'token'],
    ['achievement mark failure', { achievementMark: 'throw' }, 'token'],
  ])(
    'keeps a visible shared retry while Worksheet %s still settles its independent %s leg',
    async (_name, outcome, expectedLeg) => {
      dataStore.initialize.mockResolvedValue(undefined);
      appIntegration.initialize.mockResolvedValue(undefined);
      const handleAchievementEvent = vi.fn().mockImplementation(async () => {
        if (outcome.achievement === 'throw') throw new Error('achievement failed');
        return outcome.achievement ?? true;
      });
      if (outcome.earn === 'throw') earnTokens.mockRejectedValueOnce(new Error('token failed'));
      else earnTokens.mockResolvedValueOnce({ ok: outcome.earn ?? true, duplicate: false });
      if (outcome.tokenMark === 'throw')
        markWorksheetDeliveryLegSettled.mockRejectedValueOnce(new Error('mark failed'));
      if (outcome.achievementMark === 'throw')
        markWorksheetDeliveryLegSettled
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('mark failed'));
      useAchievements.mockReturnValue({
        achievements: [],
        newlyUnlocked: null,
        bonusTokens: 0,
        handleAchievementEvent,
        clearNotification: vi.fn(),
        achievementError: false,
        retryAchievements: vi.fn(),
        isSettlingAchievements: false,
      });
      getRecoverableWorksheetDeliveries.mockResolvedValueOnce([
        {
          source: { id: 'worksheet:11111111-1111-4111-8111-111111111111' },
          token: {
            state: 'pending',
            amount: 5,
            reason: 'Worksheet completion',
            operationId: 'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
          },
          achievement: {
            state: 'pending',
            eventId: 'worksheet-completed:worksheet:11111111-1111-4111-8111-111111111111',
          },
        },
      ]);
      render(<App />);
      await screen.findByRole('button', { name: /retry completion sync/i });
      expect(handleAchievementEvent).toHaveBeenCalledTimes(1);
      expect(
        markWorksheetDeliveryLegSettled.mock.calls.some(([, leg]) => leg === expectedLeg),
      ).toBe(true);
    },
  );

  it.each([
    [
      'Homework/Focus',
      () =>
        getRecoverableCompletionDeliveries.mockRejectedValueOnce(new Error('journal unavailable')),
      getRecoverableWorksheetDeliveries,
      markWorksheetDeliveryLegSettled,
    ],
    [
      'Worksheet',
      () =>
        getRecoverableWorksheetDeliveries.mockRejectedValueOnce(new Error('worksheet unavailable')),
      getRecoverableCompletionDeliveries,
      markCompletionDeliveryLegSettled,
    ],
  ])(
    'continues the other domain when the %s getter rejects',
    async (_name, rejectDomain, healthyGetter, healthyMark) => {
      dataStore.initialize.mockResolvedValue(undefined);
      appIntegration.initialize.mockResolvedValue(undefined);
      rejectDomain();
      healthyGetter.mockResolvedValueOnce(
        _name === 'Worksheet'
          ? [
              {
                deliveryId: 'completion-delivery:homework:h1',
                sourceState: 'confirmed',
                token: {
                  state: 'pending',
                  amount: 10,
                  reason: 'Homework completed',
                  operationId: 'homework-complete:h1',
                },
                achievement: {
                  state: 'settled',
                  eventType: 'TASK_COMPLETED',
                  eventId: 'homework-completed:h1',
                  payload: { completionDay: '2026-06-30' },
                },
              },
            ]
          : [
              {
                source: { id: 'worksheet:11111111-1111-4111-8111-111111111111' },
                token: {
                  state: 'pending',
                  amount: 5,
                  reason: 'Worksheet completion',
                  operationId: 'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
                },
                achievement: {
                  state: 'settled',
                  eventId: 'worksheet-completed:worksheet:11111111-1111-4111-8111-111111111111',
                },
              },
            ],
      );
      render(<App />);
      await screen.findByRole('button', { name: /retry completion sync/i });
      expect(earnTokens).toHaveBeenCalledTimes(1);
      expect(healthyMark).toHaveBeenCalledTimes(1);
    },
  );

  it('shows completion-sync retry when a journal leg is not accepted', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    earnTokens.mockResolvedValueOnce({ ok: false, duplicate: false });
    getRecoverableCompletionDeliveries.mockResolvedValueOnce([
      {
        deliveryId: 'completion-delivery:homework:h1',
        sourceState: 'confirmed',
        token: {
          state: 'pending',
          amount: 10,
          reason: 'Homework completed',
          operationId: 'homework-complete:h1',
        },
        achievement: {
          state: 'settled',
          eventType: 'TASK_COMPLETED',
          eventId: 'homework-completed:h1',
          payload: { completionDay: '2026-06-30' },
        },
      },
    ]);
    render(<App />);
    expect(await screen.findByRole('button', { name: /retry completion sync/i })).toBeEnabled();
  });

  it('coalesces a Homework completion request during a blocked mount pass and reruns after release', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    let release!: (value: unknown) => void;
    let active = 0;
    let maxActive = 0;
    getRecoverableCompletionDeliveries
      .mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            release = (value) => {
              active -= 1;
              resolve(value);
            };
          }),
      )
      .mockResolvedValueOnce([]);
    useHomework.mockReturnValue({
      homeworkItems: [],
      addHomework: vi.fn(),
      toggleComplete: vi
        .fn()
        .mockResolvedValue({ completed: true, item: { id: 'h1', completedDate: 1 } }),
    });
    render(<App />);
    await waitFor(() => expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /toggle homework/i }));
    expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(1);
    expect(maxActive).toBe(1);
    release([]);
    await waitFor(() => expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(2));
  });

  it('serially reruns once for a Worksheet arriving during a blocked pass without a second worker', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    let release!: (value: unknown) => void;
    let active = 0;
    let maxActive = 0;
    getRecoverableWorksheetDeliveries
      .mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            release = (value) => {
              active -= 1;
              resolve(value);
            };
          }),
      )
      .mockResolvedValueOnce([
        {
          source: { id: 'worksheet:11111111-1111-4111-8111-111111111111' },
          token: {
            state: 'pending',
            amount: 5,
            reason: 'Worksheet completion',
            operationId: 'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
          },
          achievement: {
            state: 'settled',
            eventId: 'worksheet-completed:worksheet:11111111-1111-4111-8111-111111111111',
          },
        },
      ]);
    render(<App />);
    await waitFor(() => expect(getRecoverableWorksheetDeliveries).toHaveBeenCalledTimes(1));
    const requestCompletionSync = useWorksheet.mock.calls.at(-1)?.[0]
      ?.requestCompletionSync as () => Promise<void>;
    void requestCompletionSync();
    void requestCompletionSync();
    expect(maxActive).toBe(1);
    expect(getRecoverableWorksheetDeliveries).toHaveBeenCalledTimes(1);
    release([]);
    await waitFor(() => expect(getRecoverableWorksheetDeliveries).toHaveBeenCalledTimes(2));
    expect(maxActive).toBe(1);
    expect(earnTokens).toHaveBeenCalledWith(
      5,
      'Worksheet completion',
      'worksheet:complete:worksheet:11111111-1111-4111-8111-111111111111',
    );
  });

  it('does not manufacture Homework rewards before a durable completion requests journal sync', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    const toggleComplete = vi
      .fn()
      .mockResolvedValue({ completed: true, item: { id: 'h1', completedDate: 1 } });
    useHomework.mockReturnValue({ homeworkItems: [], addHomework: vi.fn(), toggleComplete });
    getRecoverableCompletionDeliveries.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        deliveryId: 'completion-delivery:homework:h1',
        sourceState: 'confirmed',
        token: {
          state: 'pending',
          amount: 10,
          reason: 'Homework completed',
          operationId: 'homework-complete:h1',
        },
        achievement: {
          state: 'settled',
          eventType: 'TASK_COMPLETED',
          eventId: 'homework-completed:h1',
          payload: { completionDay: '2026-06-30' },
        },
      },
    ]);
    render(<App />);
    await waitFor(() => expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /toggle homework/i }));
    await waitFor(() => expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(2));
    expect(earnTokens).toHaveBeenCalledWith(10, 'Homework completed', 'homework-complete:h1');
    expect(earnTokens).toHaveBeenCalledTimes(1);
    expect(
      useAchievements.mock.results.at(-1)?.value.handleAchievementEvent,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['rejects', vi.fn().mockRejectedValue(new Error('source failed'))],
    ['returns incomplete', vi.fn().mockResolvedValue({ completed: false })],
  ])(
    'does not sync rewards when Homework %s before durable completion',
    async (_name, toggleComplete) => {
      dataStore.initialize.mockResolvedValue(undefined);
      appIntegration.initialize.mockResolvedValue(undefined);
      useHomework.mockReturnValue({ homeworkItems: [], addHomework: vi.fn(), toggleComplete });
      render(<App />);
      await waitFor(() => expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole('button', { name: /toggle homework/i }));
      await Promise.resolve();
      expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(1);
      expect(earnTokens).not.toHaveBeenCalled();
    },
  );

  it('discriminates a Focus journal event with its exact duration and day', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    const handleAchievementEvent = vi.fn().mockResolvedValue(true);
    useAchievements.mockReturnValue({
      achievements: [],
      newlyUnlocked: null,
      bonusTokens: 0,
      handleAchievementEvent,
      clearNotification: vi.fn(),
      achievementError: false,
      retryAchievements: vi.fn(),
      isSettlingAchievements: false,
    });
    getRecoverableCompletionDeliveries.mockResolvedValueOnce([
      {
        deliveryId: 'completion-delivery:focus:f1',
        sourceState: 'confirmed',
        token: {
          state: 'settled',
          amount: 2,
          reason: 'Focus session',
          operationId: 'focus-session:f1',
        },
        achievement: {
          state: 'pending',
          eventType: 'FOCUS_SESSION_COMPLETED',
          eventId: 'focus-completed:f1',
          payload: { duration: 2, completionDay: '2026-06-30' },
        },
      },
    ]);
    render(<App />);
    await waitFor(() =>
      expect(handleAchievementEvent).toHaveBeenCalledWith({
        type: 'FOCUS_SESSION_COMPLETED',
        eventId: 'focus-completed:f1',
        payload: { duration: 2, completionDay: '2026-06-30' },
      }),
    );
  });

  it.each([
    ['token false', { earn: false }, 'achievement'],
    ['token throw', { earn: 'throw' }, 'achievement'],
    ['token mark failure', { tokenMark: 'throw' }, 'achievement'],
    ['achievement false', { achievement: false }, 'token'],
    ['achievement throw', { achievement: 'throw' }, 'token'],
    ['achievement mark failure', { achievementMark: 'throw' }, 'token'],
  ])(
    'keeps a visible retry while %s still settles the independent %s leg',
    async (_name, outcome, expectedLeg) => {
      dataStore.initialize.mockResolvedValue(undefined);
      appIntegration.initialize.mockResolvedValue(undefined);
      const handleAchievementEvent = vi.fn().mockImplementation(async () => {
        if (outcome.achievement === 'throw') throw new Error('achievement failed');
        return outcome.achievement ?? true;
      });
      if (outcome.earn === 'throw') earnTokens.mockRejectedValueOnce(new Error('token failed'));
      else earnTokens.mockResolvedValueOnce({ ok: outcome.earn ?? true, duplicate: false });
      if (outcome.tokenMark === 'throw')
        markCompletionDeliveryLegSettled.mockRejectedValueOnce(new Error('mark failed'));
      if (outcome.achievementMark === 'throw')
        markCompletionDeliveryLegSettled
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('mark failed'));
      useAchievements.mockReturnValue({
        achievements: [],
        newlyUnlocked: null,
        bonusTokens: 0,
        handleAchievementEvent,
        clearNotification: vi.fn(),
        achievementError: false,
        retryAchievements: vi.fn(),
        isSettlingAchievements: false,
      });
      getRecoverableCompletionDeliveries.mockResolvedValueOnce([
        {
          deliveryId: 'completion-delivery:homework:h1',
          sourceState: 'confirmed',
          token: {
            state: 'pending',
            amount: 10,
            reason: 'Homework completed',
            operationId: 'homework-complete:h1',
          },
          achievement: {
            state: 'pending',
            eventType: 'TASK_COMPLETED',
            eventId: 'homework-completed:h1',
            payload: { completionDay: '2026-06-30' },
          },
        },
      ]);
      render(<App />);
      await screen.findByRole('button', { name: /retry completion sync/i });
      expect(handleAchievementEvent).toHaveBeenCalledTimes(1);
      expect(
        markCompletionDeliveryLegSettled.mock.calls.some(([, leg]) => leg === expectedLeg),
      ).toBe(true);
    },
  );

  it('disables the retry button during its coalesced worker and clears it after a successful pass', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    earnTokens.mockResolvedValueOnce({ ok: false, duplicate: false });
    getRecoverableCompletionDeliveries.mockResolvedValueOnce([
      {
        deliveryId: 'completion-delivery:homework:h1',
        sourceState: 'confirmed',
        token: {
          state: 'pending',
          amount: 10,
          reason: 'Homework completed',
          operationId: 'homework-complete:h1',
        },
        achievement: {
          state: 'settled',
          eventType: 'TASK_COMPLETED',
          eventId: 'homework-completed:h1',
          payload: { completionDay: '2026-06-30' },
        },
      },
    ]);
    let release!: (value: unknown) => void;
    getRecoverableCompletionDeliveries.mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    render(<App />);
    const retry = await screen.findByRole('button', { name: /retry completion sync/i });
    fireEvent.click(retry);
    expect(retry).toBeDisabled();
    expect(getRecoverableCompletionDeliveries).toHaveBeenCalledTimes(2);
    release([]);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /retry completion sync/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('persists canonical avatar state before awarding and publishing onboarding completion', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    render(<App />);
    await screen.findByTestId('normal-shell');
    fireEvent.click(screen.getByRole('button', { name: /complete onboarding/i }));
    await waitFor(() =>
      expect(dataStore.saveUserSettings).toHaveBeenCalledWith('onboarding_completed', 'true'),
    );
    expect(dataStore.saveUserSettings).not.toHaveBeenCalledWith('user_avatar', expect.anything());
    expect(dataStore.saveAvatarState.mock.invocationCallOrder[0]).toBeLessThan(
      earnTokens.mock.invocationCallOrder[0],
    );
    expect(earnTokens).toHaveBeenCalledWith(25, 'Welcome bonus', 'onboarding:welcome-award');
  });

  it('does not publish completion when canonical avatar persistence fails, so a retry retains the stable award id', async () => {
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    dataStore.saveAvatarState.mockRejectedValueOnce(new Error('avatar write failed'));
    render(<App />);
    await screen.findByTestId('normal-shell');
    fireEvent.click(screen.getByRole('button', { name: /complete onboarding/i }));
    await waitFor(() => expect(dataStore.saveAvatarState).toHaveBeenCalledTimes(1));
    expect(earnTokens).not.toHaveBeenCalled();
    expect(dataStore.saveUserSettings).not.toHaveBeenCalledWith('onboarding_completed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /complete onboarding/i }));
    await waitFor(() =>
      expect(earnTokens).toHaveBeenCalledWith(25, 'Welcome bonus', 'onboarding:welcome-award'),
    );
  });
});
