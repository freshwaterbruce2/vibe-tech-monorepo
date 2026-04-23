import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import AchievementToast from './components/ui/AchievementToast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import OfflineIndicator from './components/ui/OfflineIndicator';
import { ResizableSplitPane } from './components/ui/ResizableSplitPane';
import RouteErrorBoundary from './components/ui/RouteErrorBoundary';
import Sidebar from './components/ui/Sidebar';
// Note: AchievementEvent type is used via handleAchievementEvent from useAchievements
import { appIntegration } from './services/appIntegration';
import { sendMessageToBuddy } from './services/buddyService';
import { dataStore } from './services/dataStore';
import { sendMessageToTutor } from './services/tutorService';
import { triggerVibration } from './services/uiService';
import type { MusicPlaylist, OnboardingNavigationAction, ParsedHomework, View, SubjectType } from './types';
// Custom hooks extracted from App.tsx
import { useAchievements } from './hooks/useAchievements';
import { useHomework } from './hooks/useHomework';
import { useRewards } from './hooks/useRewards';
import { createGameCompletionPayload, type GameCompletionDetails } from './services/gameProgression';
import { useTokenEconomy } from './hooks/useTokenEconomy';
import { useWorksheet } from './hooks/useWorksheet';
import { logger } from './utils/logger';

// Static imports — core views needed at first paint
import HomeworkDashboard from './components/dashboard/HomeworkDashboard';
import FirstWeekChecklist from './components/dashboard/FirstWeekChecklist';
import SubjectCards from './components/dashboard/SubjectCards';
import { TokenEarnAnimation } from './components/features/TokenEarnAnimation';
import ChatWindow from './components/features/ChatWindow';
import FirstRunOnboarding, {
  WELCOME_TOKENS,
  type OnboardingResult,
} from './components/core/FirstRunOnboarding';
import FocusTimer from './components/features/FocusTimer';

// Lazy load heavy views
const MusicLibrary = lazy(async () => import('./components/features/MusicLibrary'));
const VibebuxRewardShop = lazy(async () => import('./components/features/VibebuxRewardShop'));
const BrainGymHub = lazy(async () => import('./components/games/BrainGymHub'));
const RealmView = lazy(async () => import('./components/realms/RealmView'));
const ParentDashboard = lazy(async () => import('./components/dashboard/ParentDashboard'));
const WorksheetResults = lazy(async () => import('./components/features/WorksheetResults'));
const WorksheetView = lazy(async () => import('./components/features/WorksheetView'));
const SensorySettings = lazy(async () => import('./components/settings/SensorySettings'));
const AchievementCenter = lazy(async () => import('./components/ui/AchievementCenter'));
const TokenWallet = lazy(async () => import('./components/features/TokenWallet'));
const ParentRulesPage = lazy(async () => import('./components/settings/ParentRulesPage'));
const SchedulesHub = lazy(async () => import('./components/schedules/SchedulesHub'));
const WellnessHub = lazy(async () => import('./components/features/WellnessHub'));

// Loading fallback for lazy-loaded views
const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="w-8 h-8 border-3 border-violet-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

interface OnboardingFlags {
  loaded: boolean;
  hasCompletedFirstRun: boolean;
  userAvatar: string;
  hasVisitedShop: boolean;
  checklistDone: boolean;
}

const INITIAL_ONBOARDING_FLAGS: OnboardingFlags = {
  loaded: false,
  hasCompletedFirstRun: false,
  userAvatar: '',
  hasVisitedShop: false,
  checklistDone: false,
};

const CHECKLIST_BONUS_TOKENS = 50;

const App = () => {
  const [view, setView] = useState<View>('dashboard');
  const mobileContentRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [selectedRealmSubject, setSelectedRealmSubject] = useState<SubjectType | null>(null);
  // Animation triggers
  const [tokenEarnAmount, setTokenEarnAmount] = useState(0);
  const [tokenEarnTrigger, setTokenEarnTrigger] = useState(0);
  const [onboardingFlags, setOnboardingFlags] =
    useState<OnboardingFlags>(INITIAL_ONBOARDING_FLAGS);
  const [dashboardOnboardingAction, setDashboardOnboardingAction] =
    useState<OnboardingNavigationAction | null>(null);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  // React 19 concurrent feature for non-blocking state updates
  const [, startTransition] = useTransition();

  // Custom hooks for state management
  const {
    homeworkItems,
    addHomework,
    toggleComplete,
  } = useHomework();

  const {
    userTokens,
    earnTokens,
    spendTokens,
  } = useTokenEconomy();

  // Token management wrappers (canonical ledger is handled inside useTokenEconomy)
  const handleEarnTokens = useCallback((amount: number, reason: string = 'Earned tokens') => {
    earnTokens(amount, reason);
    setTokenEarnAmount(amount);
    setTokenEarnTrigger(prev => prev + 1);
  }, [earnTokens]);

  const handleSpendTokens = useCallback(
    (amount: number, reason: string = 'Spent tokens') => {
      return spendTokens(amount, reason);
    },
    [spendTokens],
  );

  const handleOnboardingComplete = useCallback(
    async (data: OnboardingResult) => {
      if (isCompletingOnboarding) {
        return;
      }

      setIsCompletingOnboarding(true);

      try {
        await dataStore.saveUserSettings('onboarding_completed', 'true');
        await dataStore.saveUserSettings('user_avatar', data.avatar);
        await dataStore.saveUserSettings('user_type', data.userType);
        setOnboardingFlags((prev) => ({
          ...prev,
          hasCompletedFirstRun: true,
          userAvatar: data.avatar,
        }));
        handleEarnTokens(WELCOME_TOKENS, 'Welcome bonus');
        setView('dashboard');
      } catch (error) {
        logger.error('[onboarding] Failed to complete onboarding:', error);
        setIsCompletingOnboarding(false);
        throw error;
      }
    },
    [handleEarnTokens, isCompletingOnboarding],
  );

  const {
    achievements,
    newlyUnlocked,
    bonusTokens,
    handleAchievementEvent,
    clearNotification,
  } = useAchievements({
    onAwardTokens: handleEarnTokens,
  });

  const { rewards, claimedRewards, claimReward, handleRewardApproval, updateRewards } =
    useRewards();

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
  } = useWorksheet({
    onAwardTokens: (amount: number) => handleEarnTokens(amount, 'Worksheet completion'),
    onAchievementEvent: (event) => {
      void handleAchievementEvent(event);
    },
  });

  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Database Migration: Initialize dataStore and app integration
  useEffect(() => {
    const initializeData = async () => {
      try {
        logger.debug('[v1.5.0] Initializing SQLite database...');
        await dataStore.initialize(); // Auto-migrates from localStorage if needed
      } catch (error) {
        logger.error('[v1.5.0] Database initialization failed, using fallback:', error);
      }

      try {
        await appIntegration.initialize();
      } catch (error) {
        logger.warn('[v1.5.0] App integration initialization failed (non-fatal):', error);
      }

      try {
        const plsts = await dataStore.getMusicPlaylists();
        const [completed, avatar, visitedShop, checklistDone] = await Promise.all([
          dataStore.getUserSettings('onboarding_completed'),
          dataStore.getUserSettings('user_avatar'),
          dataStore.getUserSettings('has_visited_shop'),
          dataStore.getUserSettings('onboarding_checklist_done'),
        ]);
        const hasCompletedFirstRun = completed === 'true';

        // React 19: Use startTransition for non-blocking state updates
        startTransition(() => {
          setPlaylists(plsts);
          setOnboardingFlags({
            loaded: true,
            hasCompletedFirstRun,
            userAvatar: avatar ?? '',
            hasVisitedShop: visitedShop === 'true',
            checklistDone: checklistDone === 'true',
          });
          if (!hasCompletedFirstRun) {
            setView('onboarding');
          }
        });

        logger.debug('[v1.5.0] Database initialized successfully. Data loaded from SQLite.');
      } catch (error) {
        logger.error('[v1.5.0] Failed to load startup data, defaulting to onboarding:', error);
        startTransition(() => {
          setPlaylists([]);
          setOnboardingFlags({
            ...INITIAL_ONBOARDING_FLAGS,
            loaded: true,
          });
          setView('onboarding');
        });
      }
    };
    void initializeData();
  }, []);

  // Save playlists to dataStore (other data saved by custom hooks)
  useEffect(() => {
    dataStore.saveMusicPlaylists(playlists).catch((err) => logger.error(err));
  }, [playlists]);

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
    if (
      view === 'shop' &&
      onboardingFlags.loaded &&
      !onboardingFlags.hasVisitedShop
    ) {
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
    if (allDone) {
      void dataStore.saveUserSettings('onboarding_checklist_done', 'true');
      setOnboardingFlags((prev) => ({ ...prev, checklistDone: true }));
      handleEarnTokens(CHECKLIST_BONUS_TOKENS, 'Onboarding complete');
    }
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
      void handleAchievementEvent({
        type: 'GAME_COMPLETED',
        payload: createGameCompletionPayload(gameId, score, details),
      });
    },
    [handleAchievementEvent],
  );

  // Wrap hook handlers with additional logic
  const handleAddHomework = useCallback(
    (item: ParsedHomework) => {
      const newItem = addHomework(item);
      void handleAchievementEvent({
        type: 'HOMEWORK_UPDATE',
        payload: { items: [...homeworkItems, newItem] },
      });
    },
    [addHomework, handleAchievementEvent, homeworkItems],
  );

  const handleToggleComplete = useCallback(
    (id: string) => {
      triggerVibration(50); // Haptic feedback
      const wasCompleted = toggleComplete(id);

      if (wasCompleted) {
        void handleAchievementEvent({ type: 'TASK_COMPLETED' });
        handleEarnTokens(10, 'Homework completed');
      }
      void handleAchievementEvent({
        type: 'HOMEWORK_UPDATE',
        payload: { items: homeworkItems },
      });
    },
    [toggleComplete, handleAchievementEvent, handleEarnTokens, homeworkItems],
  );

  const handleClaimReward = useCallback(
    (rewardId: string) => {
      const tokenBalance = userTokens;
      const cost = claimReward(rewardId, tokenBalance);
      if (cost > 0) {
        handleSpendTokens(cost, 'Reward claimed');
        void handleAchievementEvent({ type: 'SHOP_PURCHASE' });
        return true;
      }
      return false;
    },
    [claimReward, handleAchievementEvent, handleSpendTokens, userTokens],
  );

  const handleRewardApprovalWrapper = useCallback(
    (claimedRewardId: string, isApproved: boolean) => {
      const refundAmount = handleRewardApproval(claimedRewardId, isApproved);
      if (refundAmount > 0) {
        handleEarnTokens(refundAmount, 'Reward refunded');
      }
    },
    [handleRewardApproval, handleEarnTokens],
  );

  const handleAddPlaylist = useCallback((playlist: MusicPlaylist) => {
    setPlaylists((prev) => [...prev, playlist]);
  }, []);

  const handleRemovePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const renderView = () => {
    const viewContent = (() => {
      const showChecklist =
        onboardingFlags.loaded && !onboardingFlags.checklistDone;
      const handleChecklistNavigate = (nextView: View, action?: OnboardingNavigationAction) => {
        setDashboardOnboardingAction(action ?? null);
        setView(nextView);
      };
      const onboardingBanner = showChecklist ? (
        <FirstWeekChecklist
          hasAvatar={onboardingFlags.userAvatar !== ''}
          welcomeTokensEarned={onboardingFlags.hasCompletedFirstRun}
          hasHomework={hasHomework}
          hasCompletedTask={hasCompletedTask}
          hasVisitedShop={onboardingFlags.hasVisitedShop}
          onNavigate={handleChecklistNavigate}
        />
      ) : null;

      switch (view) {
        case 'onboarding':
          return (
            <RouteErrorBoundary routeName="Onboarding">
              <FirstRunOnboarding
                onComplete={(data) => {
                  void handleOnboardingComplete(data);
                }}
              />
            </RouteErrorBoundary>
          );
        case 'dashboard':
          return (
            <RouteErrorBoundary routeName="Dashboard">
              <HomeworkDashboard
                items={homeworkItems}
                onAdd={handleAddHomework}
                onToggleComplete={handleToggleComplete}
                tokens={userTokens}
                onboardingBanner={onboardingBanner}
                onboardingAction={dashboardOnboardingAction}
                onOnboardingActionHandled={() => setDashboardOnboardingAction(null)}
              />
            </RouteErrorBoundary>
          );
        case 'tutor':
          return (
            <RouteErrorBoundary routeName="AI Tutor">
              <ChatWindow
                title="Vibe Tutor"
                description="Get help with your homework and school concepts."
                onSendMessage={sendMessageToTutor}
                type="tutor"
              />
            </RouteErrorBoundary>
          );
        case 'friend':
          return (
            <RouteErrorBoundary routeName="AI Buddy">
              <ChatWindow
                title="Vibe Buddy"
                description="Chat about life, gaming, social skills, and everything else!"
                onSendMessage={sendMessageToBuddy}
                type="friend"
              />
            </RouteErrorBoundary>
          );
        case 'achievements':
          return (
            <RouteErrorBoundary routeName="Achievements">
              <AchievementCenter
                achievements={achievements}
                rewards={rewards}
                onClaimReward={handleClaimReward}
                claimedRewards={claimedRewards}
                userTokens={userTokens}
              />
            </RouteErrorBoundary>
          );
        case 'schedules':
          return (
            <RouteErrorBoundary routeName="Schedules Hub">
              <SchedulesHub
                onEarnTokens={handleEarnTokens}
                onClose={() => setView('dashboard')}
              />
            </RouteErrorBoundary>
          );
        case 'parent':
          return (
            <RouteErrorBoundary routeName="Parent Dashboard">
              <ParentDashboard
                items={homeworkItems}
                rewards={rewards}
                onUpdateRewards={updateRewards}
                claimedRewards={claimedRewards}
                onApproval={handleRewardApprovalWrapper}
                onNavigate={setView}
              />
            </RouteErrorBoundary>
          );
        case 'music':
          return (
            <RouteErrorBoundary routeName="Music Library">
              <MusicLibrary
                playlists={playlists}
                onAddPlaylist={handleAddPlaylist}
                onRemovePlaylist={handleRemovePlaylist}
              />
            </RouteErrorBoundary>
          );
        case 'sensory':
          return (
            <RouteErrorBoundary routeName="Sensory Settings">
              <SensorySettings />
            </RouteErrorBoundary>
          );
        case 'focus':
          return (
            <RouteErrorBoundary routeName="Focus Timer">
              <FocusTimer
                onSessionComplete={(mins) => {
                  handleEarnTokens(mins, 'Focus session');
                  void handleAchievementEvent({
                    type: 'FOCUS_SESSION_COMPLETED',
                    payload: { duration: mins },
                  });
                }}
              />
            </RouteErrorBoundary>
          );
        case 'cards':
          // Worksheet system with three states: card selection, active worksheet, results
          return (
            <RouteErrorBoundary routeName="Realm Quests">
              {worksheetSession ? (
                // Show results after completing worksheet
                <WorksheetResults
                  session={worksheetSession}
                  leveledUp={worksheetLeveledUp}
                  newDifficulty={worksheetNewDifficulty}
                  starsToNextLevel={worksheetStarsToNextLevel}
                  onTryAgain={handleWorksheetTryAgain}
                  onNextWorksheet={handleWorksheetTryAgain}
                  onBackToCards={handleWorksheetContinue}
                />
              ) : worksheetSubject && worksheetProgress ? (
                // Show active worksheet
                <WorksheetView
                  subject={worksheetSubject}
                  difficulty={worksheetProgress.currentDifficulty}
                  onComplete={(session) => {
                    void handleWorksheetComplete(session);
                  }}
                  onCancel={handleWorksheetCancel}
                />
              ) : !selectedRealmSubject ? (
                // Show subject cards (main menu)
                <SubjectCards onStartWorksheet={(subject) => setSelectedRealmSubject(subject)} userTokens={userTokens} />
              ) : (
                <RealmView
                  subject={selectedRealmSubject}
                  onStartWorksheet={(s) => handleStartWorksheet(s)}
                  onBack={() => setSelectedRealmSubject(null)}
                  onEarnTokens={handleEarnTokens}
                  onGameCompleted={handleGameCompleted}
                />
              )}
            </RouteErrorBoundary>
          );
        case 'games':
          return (
            <RouteErrorBoundary routeName="Brain Gym">
              <BrainGymHub
                userTokens={userTokens}
                onEarnTokens={handleEarnTokens}
                onSpendTokens={handleSpendTokens}
                onGameCompleted={handleGameCompleted}
                onClose={() => setView('dashboard')}
              />
            </RouteErrorBoundary>
          );
        case 'tokens':
          return (
            <RouteErrorBoundary routeName="Token Wallet">
              <TokenWallet onClose={() => setView('dashboard')} onNavigate={setView} />
            </RouteErrorBoundary>
          );
        case 'shop':
          return (
            <RouteErrorBoundary routeName="Reward Shop">
              <VibebuxRewardShop
                userTokens={userTokens}
                onSpendTokens={handleSpendTokens}
                onPurchaseComplete={() => {
                  void handleAchievementEvent({ type: 'SHOP_PURCHASE' });
                }}
                onClose={() => setView('dashboard')}
              />
            </RouteErrorBoundary>
          );
        case 'parent-rules':
          return (
            <RouteErrorBoundary routeName="Parent Rules">
              <ParentRulesPage onClose={() => setView('parent')} />
            </RouteErrorBoundary>
          );
        case 'wellness':
          return (
            <RouteErrorBoundary routeName="Wellness Hub">
              <WellnessHub />
            </RouteErrorBoundary>
          );
        default:
          return (
            <RouteErrorBoundary routeName="Dashboard (Default)">
              <HomeworkDashboard
                items={homeworkItems}
                onAdd={handleAddHomework}
                onToggleComplete={handleToggleComplete}
                tokens={userTokens}
                onboardingBanner={onboardingBanner}
                onboardingAction={dashboardOnboardingAction}
                onOnboardingActionHandled={() => setDashboardOnboardingAction(null)}
              />
            </RouteErrorBoundary>
          );
      }
    })();

    return (
      <ErrorBoundary>
        <Suspense fallback={<ViewLoadingFallback />}>{viewContent}</Suspense>
      </ErrorBoundary>
    );
  };

  const toggleNav = useCallback(() => {
    setIsNavCollapsed((prev) => !prev);
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--background-main)] text-[var(--text-primary)]">
      <TokenEarnAnimation amount={tokenEarnAmount} triggerId={tokenEarnTrigger} />
      <Sidebar
        currentView={view}
        onNavigate={setView}
        isCollapsed={isNavCollapsed}
        onToggle={toggleNav}
      />

      {/* Mobile: Single column layout */}
      <main className="flex-1 overflow-hidden relative">
        {/* Desktop: Split pane with AI chat on left, hidden on mobile */}
        <div className="hidden md:block h-full">
          {view === 'onboarding' ? (
            <div className="h-full overflow-y-auto">
              {renderView()}
              {!isOnline && <OfflineIndicator />}
            </div>
          ) : (
            <ResizableSplitPane
              storageKey="vibe-splitpane-left"
              initialLeftPercent={35}
              minLeftPercent={25}
              maxLeftPercent={55}
              leftClassName="h-full overflow-hidden bg-[var(--background-main)]"
              rightClassName="h-full overflow-hidden bg-[var(--background-card)]"
              left={
                <ErrorBoundary>
                  <div className="h-full overflow-hidden">
                    <ChatWindow
                      title="Vibe Tutor"
                      description="Get help with homework, concepts, and study plans."
                      onSendMessage={sendMessageToTutor}
                      type="tutor"
                    />
                  </div>
                </ErrorBoundary>
              }
              right={
                <div className="h-full overflow-y-auto">
                  {renderView()}
                  {!isOnline && <OfflineIndicator />}
                </div>
              }
            />
          )}
        </div>

        {/* Mobile: Full-screen dashboard */}
        <div ref={mobileContentRef} className="md:hidden h-full overflow-y-auto pb-24">
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

export default App;
