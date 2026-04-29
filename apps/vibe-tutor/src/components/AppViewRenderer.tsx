import { lazy, Suspense, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import FirstRunOnboarding, {
  type OnboardingResult,
} from './core/FirstRunOnboarding';
import FirstWeekChecklist from './dashboard/FirstWeekChecklist';
import HomeworkDashboard from './dashboard/HomeworkDashboard';
import SubjectCards from './dashboard/SubjectCards';
import ChatWindow from './features/ChatWindow';
import FocusTimer from './features/FocusTimer';
import ErrorBoundary from './ui/ErrorBoundary';
import RouteErrorBoundary from './ui/RouteErrorBoundary';
import { sendMessageToBuddy } from '../services/buddyService';
import { sendMessageToTutor } from '../services/tutorService';
import type { GameCompletionDetails } from '../services/gameProgression';
import type { AchievementEvent } from '../services/achievementService';
import type {
  Achievement,
  ClaimedReward,
  DifficultyLevel,
  HomeworkItem,
  MusicPlaylist,
  OnboardingNavigationAction,
  ParsedHomework,
  Reward,
  SubjectProgress,
  SubjectType,
  View,
  WorksheetSession,
} from '../types';

const MusicLibrary = lazy(async () => import('./features/MusicLibrary'));
const VibebuxRewardShop = lazy(async () => import('./features/VibebuxRewardShop'));
const BrainGymHub = lazy(async () => import('./games/BrainGymHub'));
const RealmView = lazy(async () => import('./realms/RealmView'));
const ParentDashboard = lazy(async () => import('./dashboard/ParentDashboard'));
const WorksheetResults = lazy(async () => import('./features/WorksheetResults'));
const WorksheetView = lazy(async () => import('./features/WorksheetView'));
const SensorySettings = lazy(async () => import('./settings/SensorySettings'));
const AchievementCenter = lazy(async () => import('./ui/AchievementCenter'));
const TokenWallet = lazy(async () => import('./features/TokenWallet'));
const ParentRulesPage = lazy(async () => import('./settings/ParentRulesPage'));
const SchedulesHub = lazy(async () => import('./schedules/SchedulesHub'));
const WellnessHub = lazy(async () => import('./features/WellnessHub'));

export interface OnboardingFlags {
  loaded: boolean;
  hasCompletedFirstRun: boolean;
  userAvatar: string;
  hasVisitedShop: boolean;
  checklistDone: boolean;
}

interface AppViewRendererProps {
  achievements: Achievement[];
  claimedRewards: ClaimedReward[];
  dashboardOnboardingAction: OnboardingNavigationAction | null;
  handleAddHomework: (item: ParsedHomework) => void;
  handleAddPlaylist: (playlist: MusicPlaylist) => void;
  handleAchievementEvent: (event: AchievementEvent) => Promise<void>;
  handleChecklistNavigate: (view: View, action?: OnboardingNavigationAction) => void;
  handleClaimReward: (rewardId: string) => boolean;
  handleEarnTokens: (amount: number, reason?: string) => void;
  handleGameCompleted: (
    gameId: string,
    score: number,
    details: GameCompletionDetails,
  ) => void;
  handleOnboardingComplete: (data: OnboardingResult) => void;
  handleRemovePlaylist: (id: string) => void;
  handleSpendTokens: (amount: number, reason?: string) => boolean;
  handleToggleComplete: (id: string) => void;
  handleWorksheetCancel: () => void;
  handleWorksheetComplete: (session: WorksheetSession) => Promise<void>;
  handleWorksheetContinue: () => void;
  handleWorksheetTryAgain: () => void;
  homeworkItems: HomeworkItem[];
  onDashboardOnboardingActionHandled: () => void;
  onboardingFlags: OnboardingFlags;
  playlists: MusicPlaylist[];
  rewards: Reward[];
  selectedRealmSubject: SubjectType | null;
  setSelectedRealmSubject: (subject: SubjectType | null) => void;
  setView: (view: View) => void;
  updateRewards: Dispatch<SetStateAction<Reward[]>>;
  userTokens: number;
  view: View;
  worksheetLeveledUp: boolean;
  worksheetNewDifficulty: DifficultyLevel | undefined;
  worksheetProgress: SubjectProgress | null;
  worksheetSession: WorksheetSession | null;
  worksheetStarsToNextLevel: number;
  worksheetSubject: SubjectType | null;
  handleRewardApprovalWrapper: (claimedRewardId: string, isApproved: boolean) => void;
  handleStartWorksheet: (subject: SubjectType) => void;
}

export const ViewLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="w-8 h-8 border-3 border-violet-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

export function AppViewRenderer({
  achievements,
  claimedRewards,
  dashboardOnboardingAction,
  handleAddHomework,
  handleAddPlaylist,
  handleAchievementEvent,
  handleChecklistNavigate,
  handleClaimReward,
  handleEarnTokens,
  handleGameCompleted,
  handleOnboardingComplete,
  handleRemovePlaylist,
  handleRewardApprovalWrapper,
  handleSpendTokens,
  handleStartWorksheet,
  handleToggleComplete,
  handleWorksheetCancel,
  handleWorksheetComplete,
  handleWorksheetContinue,
  handleWorksheetTryAgain,
  homeworkItems,
  onDashboardOnboardingActionHandled,
  onboardingFlags,
  playlists,
  rewards,
  selectedRealmSubject,
  setSelectedRealmSubject,
  setView,
  updateRewards,
  userTokens,
  view,
  worksheetLeveledUp,
  worksheetNewDifficulty,
  worksheetProgress,
  worksheetSession,
  worksheetStarsToNextLevel,
  worksheetSubject,
}: AppViewRendererProps) {
  const hasHomework = homeworkItems.length > 0;
  const hasCompletedTask = homeworkItems.some((item) => item.completed);
  const onboardingBanner: ReactNode =
    onboardingFlags.loaded && !onboardingFlags.checklistDone ? (
      <FirstWeekChecklist
        hasAvatar={onboardingFlags.userAvatar !== ''}
        welcomeTokensEarned={onboardingFlags.hasCompletedFirstRun}
        hasHomework={hasHomework}
        hasCompletedTask={hasCompletedTask}
        hasVisitedShop={onboardingFlags.hasVisitedShop}
        onNavigate={handleChecklistNavigate}
      />
    ) : null;

  const viewContent = (() => {
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
              onOnboardingActionHandled={onDashboardOnboardingActionHandled}
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
        return (
          <RouteErrorBoundary routeName="Realm Quests">
            {worksheetSession ? (
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
              <WorksheetView
                subject={worksheetSubject}
                difficulty={worksheetProgress.currentDifficulty}
                onComplete={(session) => {
                  void handleWorksheetComplete(session);
                }}
                onCancel={handleWorksheetCancel}
              />
            ) : !selectedRealmSubject ? (
              <SubjectCards
                onStartWorksheet={(subject) => setSelectedRealmSubject(subject)}
                userTokens={userTokens}
              />
            ) : (
              <RealmView
                subject={selectedRealmSubject}
                onStartWorksheet={(subject) => handleStartWorksheet(subject)}
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
              onOnboardingActionHandled={onDashboardOnboardingActionHandled}
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
}
