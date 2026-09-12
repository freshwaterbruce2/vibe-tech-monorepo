import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FailureSnapshot {
  id: number;
  store: 'persistent' | 'session';
  operation: 'read' | 'write' | 'delete';
  reason: 'quota' | 'unavailable';
}

const { dataStore, appIntegration, storageSignal, appStore } = vi.hoisted(() => {
  let snapshot: FailureSnapshot | null = null;
  const listeners = new Set<() => void>();
  return {
  dataStore: { initialize: vi.fn(), getUserSettings: vi.fn(), getAvatarState: vi.fn() },
    appIntegration: { initialize: vi.fn() },
    appStore: { getStrict: vi.fn(() => null), setStrict: vi.fn() },
    storageSignal: {
      get: () => snapshot,
      subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
      emit: (next: FailureSnapshot | null) => { snapshot = next; listeners.forEach((listener) => listener()); },
    },
  };
});

vi.mock('./services/dataStore', () => ({ dataStore }));
vi.mock('./services/appIntegration', () => ({ appIntegration }));
vi.mock('./utils/electronStore', () => ({
  appStore,
  getStorageFailureSnapshot: storageSignal.get,
  subscribeToStorageFailures: storageSignal.subscribe,
}));
vi.mock('./services/sensoryPreferences', () => ({ initializeSensoryPreferences: vi.fn(), loadSensoryPreferences: vi.fn().mockResolvedValue({}) }));
vi.mock('./services/soundEffects', () => ({ soundEffects: { applyPreferences: vi.fn() } }));
vi.mock('./services/uiService', () => ({ triggerVibration: vi.fn() }));
vi.mock('./components/ui/AchievementToast', () => ({ default: () => null }));
vi.mock('./components/ui/OfflineIndicator', () => ({ default: () => null }));
vi.mock('./components/ui/Sidebar', () => ({ default: () => <div data-testid="normal-shell" /> }));
vi.mock('./components/AppViewRenderer', () => ({ AppViewRenderer: () => <div>Normal app view</div> }));
vi.mock('./components/features/TokenEarnAnimation', () => ({ TokenEarnAnimation: () => null }));
vi.mock('./components/core/FirstRunOnboarding', () => ({ WELCOME_TOKENS: 25 }));
vi.mock('./services/avatarShopData', () => ({ DEFAULT_UNLOCKED_AVATAR_IDS: [], normalizeAvatarId: (id: string) => id }));
vi.mock('./services/gameProgression', () => ({ createGameCompletionPayload: vi.fn() }));
vi.mock('./services/completionDeliveryService', () => ({
  getRecoverableCompletionDeliveries: vi.fn().mockResolvedValue([]),
  markCompletionDeliveryLegSettled: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./services/progressionService', () => ({
  getRecoverableWorksheetDeliveries: vi.fn().mockResolvedValue([]),
  markWorksheetDeliveryLegSettled: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./hooks/useHomework', () => ({ useHomework: () => ({ homeworkItems: [], addHomework: vi.fn(), toggleComplete: vi.fn() }) }));
vi.mock('./hooks/useTokenEconomy', () => ({ useTokenEconomy: () => ({ userTokens: 0, earnTokens: vi.fn(), spendTokens: vi.fn() }) }));
vi.mock('./hooks/useAchievements', () => ({ useAchievements: () => ({ achievements: [], newlyUnlocked: null, bonusTokens: 0, handleAchievementEvent: vi.fn(), clearNotification: vi.fn() }) }));
vi.mock('./hooks/useRewards', () => ({ useRewards: () => ({ rewards: [], claimedRewards: [], error: null, blocked: false, claimReward: vi.fn().mockResolvedValue(false), approveRequest: vi.fn().mockResolvedValue(false), denyRequest: vi.fn().mockResolvedValue(false), fulfillRequest: vi.fn().mockResolvedValue(false), retryDebit: vi.fn().mockResolvedValue(false), retryRefund: vi.fn().mockResolvedValue(false), updateRewards: vi.fn().mockResolvedValue(false) }) }));
vi.mock('./hooks/useWorksheet', () => ({ useWorksheet: () => ({ worksheetSubject: null, worksheetSession: null, worksheetProgress: 0, worksheetLeveledUp: false, worksheetNewDifficulty: null, worksheetStarsToNextLevel: 0, startWorksheet: vi.fn(), completeWorksheetSession: vi.fn(), cancelWorksheet: vi.fn(), tryAgain: vi.fn(), continueToSubjects: vi.fn() }) }));

const { default: App } = await import('./App');

describe('App storage failure warning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    storageSignal.emit(null);
    dataStore.initialize.mockResolvedValue(undefined);
    appIntegration.initialize.mockResolvedValue(undefined);
    dataStore.getUserSettings.mockResolvedValue('');
    dataStore.getAvatarState.mockResolvedValue(null);
    appStore.getStrict.mockReturnValue(null);
  });

  it('shows a pre-mount failure, allows acknowledgement, and shows a later categorical failure again', async () => {
    storageSignal.emit({ id: 7, store: 'persistent', operation: 'write', reason: 'quota' });
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('saved data change may be incomplete');
    expect(screen.getByTestId('normal-shell')).toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent(/private-key|quota error|secret/i);

    fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    storageSignal.emit({ id: 8, store: 'session', operation: 'delete', reason: 'unavailable' });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('saved data change may be incomplete'));
  });
});
