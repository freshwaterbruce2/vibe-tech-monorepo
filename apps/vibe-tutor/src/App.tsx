import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import AchievementToast from './components/ui/AchievementToast';
import OfflineIndicator from './components/ui/OfflineIndicator';
import Sidebar from './components/ui/Sidebar';
import { AppViewRenderer, type OnboardingFlags } from './components/AppViewRenderer';
import { getDevBridgeNotice } from './config';
// Note: AchievementEvent type is used via handleAchievementEvent from useAchievements
import { appIntegration } from './services/appIntegration';
import { dataStore } from './services/dataStore';
import {
  initializeSensoryPreferences,
  loadSensoryPreferences,
} from './services/sensoryPreferences';
import { soundEffects } from './services/soundEffects';
import { triggerVibration } from './services/uiService';
import type { OnboardingNavigationAction, ParsedHomework, View, SubjectType } from './types';
// Custom hooks extracted from App.tsx
import { useAchievements } from './hooks/useAchievements';
import { useHomework } from './hooks/useHomework';
import { useRewards } from './hooks/useRewards';
import {
  createGameCompletionPayload,
  type GameCompletionDetails,
} from './services/gameProgression';
import { useTokenEconomy } from './hooks/useTokenEconomy';
import { initializeTokenLedger } from './services/tokenService';
import {
  getRecoverableCompletionDeliveries,
  markCompletionDeliveryLegSettled,
} from './services/completionDeliveryService';
import {
  getRecoverableWorksheetDeliveries,
  markWorksheetDeliveryLegSettled,
} from './services/progressionService';
import { useWorksheet } from './hooks/useWorksheet';
import { logger } from './utils/logger';
import { getStorageFailureSnapshot, subscribeToStorageFailures } from './utils/electronStore';

// Static imports — core views needed at first paint
import { TokenEarnAnimation } from './components/features/TokenEarnAnimation';
import { WELCOME_TOKENS, type OnboardingResult } from './components/core/FirstRunOnboarding';
import { DEFAULT_UNLOCKED_AVATAR_IDS, normalizeAvatarId } from './services/avatarShopData';

const CHECKLIST_BONUS_TOKENS = 50;

interface StartupData {
  onboardingFlags: OnboardingFlags;
  userName: string;
  view: View;
}

const StatefulApp = ({ startup }: { startup: StartupData }) => {
  const [view, setView] = useState<View>(startup.view);
  const mobileContentRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedRealmSubject, setSelectedRealmSubject] = useState<SubjectType | null>(null);
  // Animation triggers
  const [tokenEarnAmount, setTokenEarnAmount] = useState(0);
  const [tokenEarnTrigger, setTokenEarnTrigger] = useState(0);
  const [onboardingFlags, setOnboardingFlags] = useState<OnboardingFlags>(startup.onboardingFlags);
  const [dashboardOnboardingAction, setDashboardOnboardingAction] =
    useState<OnboardingNavigationAction | null>(null);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);
  const [onboardingFailure, setOnboardingFailure] = useState(false);
  const [userName, setUserName] = useState(startup.userName);
  const [devBridgeDismissed, setDevBridgeDismissed] = useState(false);
  const devBridgeNotice = getDevBridgeNotice();
  const storageFailure = useSyncExternalStore(
    subscribeToStorageFailures,
    getStorageFailureSnapshot,
    getStorageFailureSnapshot,
  );
  const [dismissedStorageFailureId, setDismissedStorageFailureId] = useState<number | null>(null);
  const showStorageWarning =
    storageFailure !== null && storageFailure.id !== dismissedStorageFailureId;

  // Custom hooks for state management
  const { homeworkItems, addHomework, toggleComplete } = useHomework();

  const { userTokens, earnTokens, spendTokens } = useTokenEconomy();

  // Token management wrappers (canonical ledger is handled inside useTokenEconomy)
  const handleEarnTokens = useCallback(
    async (amount: number, reason: string, operationId: string) => {
      const result = await earnTokens(amount, reason, operationId);
      if (result.ok && !result.duplicate) {
        setTokenEarnAmount(amount);
        setTokenEarnTrigger((prev) => prev + 1);
      }
      return result.ok;
    },
    [earnTokens],
  );

  const handleSpendTokens = useCallback(
    async (amount: number, reason: string, operationId: string) => {
      const result = await spendTokens(amount, reason, operationId);
      return result.ok;
    },
    [spendTokens],
  );

  const handleOnboardingComplete = useCallback(
    (data: OnboardingResult) => {
      if (isCompletingOnboarding) {
        return;
      }

      setIsCompletingOnboarding(true);

      void (async () => {
        try {
          const selectedAvatarId = normalizeAvatarId(data.avatar);
          const existingAvatarState = await dataStore.getAvatarState();
          const unlockedAvatars = new Set([
            ...DEFAULT_UNLOCKED_AVATAR_IDS,
            ...(existingAvatarState?.unlockedAvatars ?? []),
            selectedAvatarId,
          ]);

          await dataStore.saveUserSettings('user_type', data.userType);
          if (data.name.trim()) {
            const trimmedName = data.name.trim();
            await dataStore.saveUserSettings('user_name', trimmedName);
            setUserName(trimmedName);
          }
          await dataStore.saveAvatarState({
            equippedItems: existingAvatarState?.equippedItems ?? {},
            ownedItems: existingAvatarState?.ownedItems ?? [],
            purchaseHistory: existingAvatarState?.purchaseHistory ?? [],
            ...(existingAvatarState?.pendingPurchase
              ? { pendingPurchase: existingAvatarState.pendingPurchase }
              : {}),
            selectedAvatarId,
            unlockedAvatars: [...unlockedAvatars],
          });
          const awarded = await handleEarnTokens(
            WELCOME_TOKENS,
            'Welcome bonus',
            'onboarding:welcome-award',
          );
          if (!awarded) throw new Error('Welcome award could not be saved');
          await dataStore.saveUserSettings('onboarding_completed', 'true');
          setOnboardingFlags((prev) => ({
            ...prev,
            hasCompletedFirstRun: true,
            userAvatar: selectedAvatarId,
          }));
          setOnboardingFailure(false);
          setView('dashboard');
        } catch (error) {
          logger.error('[onboarding] Failed to complete onboarding:', error);
          setOnboardingFailure(true);
          setIsCompletingOnboarding(false);
        }
      })();
    },
    [handleEarnTokens, isCompletingOnboarding],
  );

  const {
    achievements,
    newlyUnlocked,
    bonusTokens,
    handleAchievementEvent,
    clearNotification,
    achievementError,
    retryAchievements,
    isSettlingAchievements,
  } = useAchievements({
    onAwardTokens: handleEarnTokens,
  });
  const [isCompletionSyncing, setIsCompletionSyncing] = useState(false);
  const [completionSyncError, setCompletionSyncError] = useState(false);
  const completionGenerationRef = useRef(0);
  const completionInFlightRef = useRef<Promise<void> | null>(null);
  const earnTokensRef = useRef(handleEarnTokens);
  const achievementEventRef = useRef(handleAchievementEvent);
  earnTokensRef.current = handleEarnTokens;
  achievementEventRef.current = handleAchievementEvent;

  const requestCompletionSync = useCallback(async (): Promise<void> => {
    completionGenerationRef.current += 1;
    if (completionInFlightRef.current) return completionInFlightRef.current;
    setIsCompletionSyncing(true);
    const worker = async () => {
      let observedGeneration: number;
      let latestPassFailed = false;
      do {
        observedGeneration = completionGenerationRef.current;
        let passFailed = false;
        const [completionResult, worksheetResult] = await Promise.allSettled([
          getRecoverableCompletionDeliveries(),
          getRecoverableWorksheetDeliveries(),
        ]);
        if (completionResult.status === 'rejected') {
          passFailed = true;
        } else {
          const deliveries = completionResult.value;
          for (const delivery of deliveries) {
            if (delivery.token.state === 'pending') {
              try {
                const awarded = await earnTokensRef.current(
                  delivery.token.amount,
                  delivery.token.reason,
                  delivery.token.operationId,
                );
                if (!awarded) passFailed = true;
                else await markCompletionDeliveryLegSettled(delivery.deliveryId, 'token');
              } catch {
                passFailed = true;
              }
            }
            if (delivery.achievement.state === 'pending') {
              try {
                const event =
                  delivery.achievement.eventType === 'TASK_COMPLETED'
                    ? {
                        type: 'TASK_COMPLETED' as const,
                        eventId: delivery.achievement.eventId as `homework-completed:${string}`,
                        payload: { completionDay: delivery.achievement.payload.completionDay },
                      }
                    : {
                        type: 'FOCUS_SESSION_COMPLETED' as const,
                        eventId: delivery.achievement.eventId as `focus-completed:${string}`,
                        payload: {
                          duration: delivery.achievement.payload.duration!,
                          completionDay: delivery.achievement.payload.completionDay,
                        },
                      };
                const accepted = await achievementEventRef.current(event);
                if (!accepted) passFailed = true;
                else await markCompletionDeliveryLegSettled(delivery.deliveryId, 'achievement');
              } catch {
                passFailed = true;
              }
            }
          }
        }
        if (worksheetResult.status === 'rejected') {
          passFailed = true;
        } else {
          for (const delivery of worksheetResult.value) {
            if (delivery.token.state === 'pending') {
              try {
                const awarded = await earnTokensRef.current(
                  delivery.token.amount,
                  delivery.token.reason,
                  delivery.token.operationId,
                );
                if (!awarded) passFailed = true;
                else
                  await markWorksheetDeliveryLegSettled(
                    delivery.source.id,
                    'token',
                    delivery.token.operationId,
                  );
              } catch {
                passFailed = true;
              }
            }
            if (delivery.achievement.state === 'pending') {
              try {
                const accepted = await achievementEventRef.current({
                  type: 'WORKSHEET_COMPLETED',
                  eventId: delivery.achievement.eventId as `worksheet-completed:${string}`,
                });
                if (!accepted) passFailed = true;
                else
                  await markWorksheetDeliveryLegSettled(
                    delivery.source.id,
                    'achievement',
                    delivery.achievement.eventId,
                  );
              } catch {
                passFailed = true;
              }
            }
          }
        }
        latestPassFailed = passFailed;
      } while (observedGeneration !== completionGenerationRef.current);
      setCompletionSyncError(latestPassFailed);
    };
    const promise = worker().finally(() => {
      completionInFlightRef.current = null;
      setIsCompletionSyncing(false);
    });
    completionInFlightRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    void requestCompletionSync();
  }, [requestCompletionSync]);

  const {
    rewards,
    claimedRewards,
    error: rewardError,
    blocked: rewardBlocked,
    claimReward,
    approveRequest,
    denyRequest,
    fulfillRequest,
    retryDebit,
    retryRefund,
    updateRewards,
  } = useRewards({ onSpendTokens: handleSpendTokens, onEarnTokens: handleEarnTokens });

  // Worksheet state using useReducer pattern
  const {
    worksheetSubject,
    worksheetSession,
    worksheetProgress,
    worksheetLeveledUp,
    worksheetNewDifficulty,
    worksheetStarsToNextLevel,
    startWorksheet: handleStartWorksheet,
    completeWorksheetSession: handleWorksheetComplete,
    cancelWorksheet: handleWorksheetCancel,
    tryAgain: handleWorksheetTryAgain,
    continueToSubjects: handleWorksheetContinue,
  } = useWorksheet({ requestCompletionSync });

  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset scroll position when navigating between views
  const [prevView, setPrevView] = useState<View>(view);
  if (view !== prevView) {
    setPrevView(view);
    setSelectedRealmSubject(null);
  }

  useEffect(() => {
    mobileContentRef.current?.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    if (view === 'shop' && onboardingFlags.loaded && !onboardingFlags.hasVisitedShop) {
      void dataStore.saveUserSettings('has_visited_shop', 'true');
      setOnboardingFlags((prev) => ({ ...prev, hasVisitedShop: true }));
    }
  }, [view, onboardingFlags.loaded, onboardingFlags.hasVisitedShop]);

  const hasHomework = homeworkItems.length > 0;
  const hasCompletedTask = homeworkItems.some((item) => item.completed);

  useEffect(() => {
    if (!onboardingFlags.loaded || onboardingFlags.checklistDone) return;
    const allDone =
      onboardingFlags.userAvatar !== '' &&
      onboardingFlags.hasCompletedFirstRun &&
      hasHomework &&
      hasCompletedTask &&
      onboardingFlags.hasVisitedShop;
    if (!allDone) return;
    void (async () => {
      const awarded = await handleEarnTokens(
        CHECKLIST_BONUS_TOKENS,
        'Onboarding complete',
        'onboarding:checklist-complete',
      );
      if (!awarded) return;
      await dataStore.saveUserSettings('onboarding_checklist_done', 'true');
      setOnboardingFlags((prev) => ({ ...prev, checklistDone: true }));
    })();
  }, [
    onboardingFlags.loaded,
    onboardingFlags.checklistDone,
    onboardingFlags.userAvatar,
    onboardingFlags.hasCompletedFirstRun,
    onboardingFlags.hasVisitedShop,
    hasHomework,
    hasCompletedTask,
    handleEarnTokens,
  ]);

  const handleGameCompleted = useCallback(
    (gameId: string, score: number, details: GameCompletionDetails) => {
      const payload = createGameCompletionPayload(gameId, score, details);
      const sessionId = details.sessionId;
      if (!sessionId) return;
      const contribution =
        payload.achievementKey === 'mathAdventure' || payload.achievementKey === 'wordBuilder'
          ? payload.achievementKey
          : payload.achievementKey === 'patternQuest'
            ? 'patternQuest'
            : 'ordinary';
      void handleAchievementEvent({
        type: 'GAME_COMPLETED',
        eventId: `game-completed:${sessionId}` as `game-completed:${string}`,
        payload: {
          achievementKey: contribution,
          score:
            contribution === 'ordinary' ? 0 : contribution === 'patternQuest' ? 1 : payload.score,
        },
      });
    },
    [handleAchievementEvent],
  );

  // Wrap hook handlers with additional logic
  const handleAddHomework = useCallback(
    (item: ParsedHomework) => {
      addHomework(item);
    },
    [addHomework, handleAchievementEvent, homeworkItems],
  );

  const handleToggleComplete = useCallback(
    async (id: string) => {
      triggerVibration(50); // Haptic feedback
      let result;
      try {
        result = await toggleComplete(id);
      } catch (error) {
        logger.error('[homework] Completion was not saved', error);
        return;
      }

      if (result.completed && result.item?.completedDate) void requestCompletionSync();
    },
    [toggleComplete, requestCompletionSync],
  );

  const handleClaimReward = useCallback(
    async (rewardId: string) => {
      const accepted = await claimReward(rewardId);
      return accepted;
    },
    [claimReward],
  );

  const handleRewardApprovalWrapper = useCallback(
    async (
      requestId: string,
      action: 'approve' | 'deny' | 'fulfill' | 'retry_debit' | 'retry_refund',
    ) => {
      if (action === 'approve') return approveRequest(requestId);
      if (action === 'deny') return denyRequest(requestId);
      if (action === 'fulfill') return fulfillRequest(requestId);
      return action === 'retry_debit' ? retryDebit(requestId) : retryRefund(requestId);
    },
    [approveRequest, denyRequest, fulfillRequest, retryDebit, retryRefund],
  );

  const handleChecklistNavigate = useCallback(
    (nextView: View, action?: OnboardingNavigationAction) => {
      setDashboardOnboardingAction(action ?? null);
      setView(nextView);
    },
    [],
  );

  const renderView = () => (
    <AppViewRenderer
      achievements={achievements}
      claimedRewards={claimedRewards}
      dashboardOnboardingAction={dashboardOnboardingAction}
      handleAchievementEvent={handleAchievementEvent}
      handleAddHomework={handleAddHomework}
      handleChecklistNavigate={handleChecklistNavigate}
      handleClaimReward={handleClaimReward}
      handleEarnTokens={handleEarnTokens}
      handleGameCompleted={handleGameCompleted}
      handleOnboardingComplete={handleOnboardingComplete}
      handleRewardApprovalWrapper={handleRewardApprovalWrapper}
      handleSpendTokens={handleSpendTokens}
      handleStartWorksheet={handleStartWorksheet}
      handleToggleComplete={handleToggleComplete}
      requestCompletionSync={requestCompletionSync}
      handleWorksheetCancel={handleWorksheetCancel}
      handleWorksheetComplete={handleWorksheetComplete}
      handleWorksheetContinue={handleWorksheetContinue}
      handleWorksheetTryAgain={handleWorksheetTryAgain}
      homeworkItems={homeworkItems}
      onDashboardOnboardingActionHandled={() => setDashboardOnboardingAction(null)}
      onboardingFlags={onboardingFlags}
      onUserNameSaved={setUserName}
      rewards={rewards}
      rewardError={rewardError}
      rewardBlocked={rewardBlocked}
      selectedRealmSubject={selectedRealmSubject}
      setSelectedRealmSubject={setSelectedRealmSubject}
      setView={setView}
      updateRewards={updateRewards}
      userName={userName}
      userTokens={userTokens}
      view={view}
      worksheetLeveledUp={worksheetLeveledUp}
      worksheetNewDifficulty={worksheetNewDifficulty}
      worksheetProgress={worksheetProgress}
      worksheetSession={worksheetSession}
      worksheetStarsToNextLevel={worksheetStarsToNextLevel}
      worksheetSubject={worksheetSubject}
    />
  );

  const toggleNav = useCallback(() => {
    setIsNavCollapsed((prev) => !prev);
  }, []);
  const isOnboardingView = view === 'onboarding';

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--background-main)] text-[var(--text-primary)]">
      <TokenEarnAnimation amount={tokenEarnAmount} triggerId={tokenEarnTrigger} />
      {onboardingFailure && (
        <div role="alert" className="sr-only">
          Your onboarding could not be saved. Please try again.
        </div>
      )}
      <Sidebar
        currentView={view}
        onNavigate={setView}
        isCollapsed={isNavCollapsed}
        onToggle={toggleNav}
        userName={userName}
      />

      {/* Mobile: Single column layout */}
      <main className="flex-1 overflow-hidden relative">
        <div
          ref={mobileContentRef}
          className={`h-full overflow-y-auto ${isOnboardingView ? 'pb-4' : 'pb-mobile-nav-safe'}`}
        >
          {!devBridgeDismissed && devBridgeNotice && (
            <div
              role="status"
              className="m-4 flex items-center justify-between gap-3 rounded-lg border border-cyan-500/40 bg-cyan-950/40 p-3 text-sm text-cyan-200"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-cyan-400">DEV MODE</span>
                <span>{devBridgeNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setDevBridgeDismissed(true)}
                className="rounded px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-900/50"
              >
                Dismiss
              </button>
            </div>
          )}
          {showStorageWarning && (
            <div
              role="alert"
              className="m-4 rounded-lg border border-[var(--glass-border)] bg-[var(--background-card)] p-4 text-[var(--text-primary)]"
            >
              <p className="font-semibold">A saved data change may be incomplete.</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Check your storage, then retry the action you were taking.
              </p>
              <button
                type="button"
                onClick={() => setDismissedStorageFailureId(storageFailure.id)}
                className="mt-3 rounded-lg bg-[var(--glass-border)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]"
              >
                Acknowledge
              </button>
            </div>
          )}
          {achievementError && (
            <div
              role="alert"
              className="m-4 rounded-lg border border-[var(--glass-border)] bg-[var(--background-card)] p-4 text-[var(--text-primary)]"
            >
              <p className="font-semibold">Achievement sync needs attention.</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Your completed work is saved. Retry achievement sync when storage is available.
              </p>
              <button
                type="button"
                disabled={isSettlingAchievements}
                onClick={() => void retryAchievements()}
                className="mt-3 rounded-lg bg-[var(--primary-accent)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Retry achievement sync
              </button>
            </div>
          )}
          {completionSyncError && (
            <div
              role="alert"
              className="m-4 rounded-lg border border-[var(--glass-border)] bg-[var(--background-card)] p-4 text-[var(--text-primary)]"
            >
              <p className="font-semibold">Completed activity saved. Rewards are syncing.</p>
              <button
                type="button"
                disabled={isCompletionSyncing}
                onClick={() => void requestCompletionSync()}
                className="mt-3 rounded-lg bg-[var(--primary-accent)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Retry completion sync
              </button>
            </div>
          )}
          {renderView()}
          {!isOnline && <OfflineIndicator />}
        </div>
      </main>
      <AchievementToast
        achievement={newlyUnlocked}
        bonusTokens={bonusTokens}
        onClose={clearNotification}
      />
    </div>
  );
};

const App = () => {
  const [persistenceStartup, setPersistenceStartup] = useState<'loading' | 'ready' | 'failed'>(
    'loading',
  );
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [startupData, setStartupData] = useState<StartupData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeData = async () => {
      try {
        setPersistenceStartup('loading');
        logger.debug('[v1.5.0] Initializing app-local persistence...');
        await dataStore.initialize();
        await initializeTokenLedger();
        await appIntegration.initialize();

        const sensoryPreferences = await loadSensoryPreferences();
        initializeSensoryPreferences(sensoryPreferences);
        soundEffects.applyPreferences(sensoryPreferences);

        const [completed, avatarState, visitedShop, checklistDone, name] = await Promise.all([
          dataStore.getUserSettings('onboarding_completed'),
          dataStore.getAvatarState(),
          dataStore.getUserSettings('has_visited_shop'),
          dataStore.getUserSettings('onboarding_checklist_done'),
          dataStore.getUserSettings('user_name'),
        ]);
        if (cancelled) return;

        const hasCompletedFirstRun = completed === 'true';
        setStartupData({
          userName: name ?? '',
          onboardingFlags: {
            loaded: true,
            hasCompletedFirstRun,
            userAvatar: avatarState?.selectedAvatarId ?? '',
            hasVisitedShop: visitedShop === 'true',
            checklistDone: checklistDone === 'true',
          },
          view: hasCompletedFirstRun ? 'dashboard' : 'onboarding',
        });
        logger.debug('[v1.5.0] App-local persistence initialized successfully.');
        setPersistenceStartup('ready');
      } catch (error) {
        if (cancelled) return;
        logger.error('[v1.5.0] App-local persistence startup failed:', error);
        setStartupData(null);
        setPersistenceStartup('failed');
      }
    };

    void initializeData();
    return () => {
      cancelled = true;
    };
  }, [startupAttempt]);

  if (persistenceStartup !== 'ready' || !startupData) {
    const failed = persistenceStartup === 'failed';
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[var(--background-main)] p-6 text-[var(--text-primary)]"
        aria-busy={!failed}
      >
        <section
          className="w-full max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--background-card)] p-6 shadow-lg"
          role={failed ? 'alert' : 'status'}
          aria-live="assertive"
        >
          <h1 className="text-xl font-bold">
            {failed ? 'Storage needs attention' : 'Preparing your tutor'}
          </h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            {failed
              ? 'Your app data could not be opened, so Vibe Tutor has not started. Check storage and retry startup.'
              : 'Opening your app-local data…'}
          </p>
          {failed && (
            <button
              type="button"
              onClick={() => setStartupAttempt((attempt) => attempt + 1)}
              className="mt-5 rounded-lg bg-[var(--primary-accent)] px-4 py-2 font-semibold text-white"
            >
              Retry startup
            </button>
          )}
        </section>
      </main>
    );
  }

  return <StatefulApp startup={startupData} />;
};

export default App;
