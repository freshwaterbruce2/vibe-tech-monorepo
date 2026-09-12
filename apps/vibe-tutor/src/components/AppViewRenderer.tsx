import { lazy, Suspense, type ReactNode, type SetStateAction } from 'react';
import FirstRunOnboarding, { type OnboardingResult } from './core/FirstRunOnboarding';
import FirstWeekChecklist from './dashboard/FirstWeekChecklist';
import HomeworkDashboard from './dashboard/HomeworkDashboard';
import SubjectCards from './dashboard/SubjectCards';
import ChatWindow from './features/ChatWindow';
import FocusTimer from './features/FocusTimer';
import ErrorBoundary from './ui/ErrorBoundary';
import RouteErrorBoundary from './ui/RouteErrorBoundary';
import { sendMessageToBuddy } from '../services/buddyService';
import { sendMessageToTutor } from '../services/tutorService';
import { logger } from '../utils/logger';
import type { GameCompletionDetails } from '../services/gameProgression';
import type { AchievementEvent } from '../services/achievementService';
import type { AvatarPurchaseOperationId } from './avatar/useAvatarShop';
import type {
  Achievement,
  RewardRequest,
  DifficultyLevel,
  HomeworkItem,
  OnboardingNavigationAction,
  ParsedHomework,
  Reward,
  SubjectProgress,
  SubjectType,
  View,
  WorksheetSession,
} from '../types';

const MusicLibrary = lazy(async () => import('./features/MusicLibrary'));
const AvatarShopUnified = lazy(async () => ({
  default: (await import('./avatar/AvatarShopUnified')).AvatarShopUnified,
}));
const BrainGymHub = lazy(async () => import('./games/BrainGymHub'));
const RealmView = lazy(async () => import('./realms/RealmView'));
const ParentDashboard = lazy(async () => import('./dashboard/ParentDashboard'));
const WorksheetResults = lazy(async () => import('./features/WorksheetResults'));
const WorksheetView = lazy(async () => import('./features/WorksheetView'));
const SensorySettings = lazy(async () => import('./settings/SensorySettings'));
const AchievementCenter = lazy(async () => import('./ui/AchievementCenter'));
const TokenWallet = lazy(async () => import('./features/TokenWallet'));
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
  claimedRewards: RewardRequest[];
  dashboardOnboardingAction: OnboardingNavigationAction | null;
  handleAddHomework: (item: ParsedHomework) => void;
  handleAchievementEvent: (event: AchievementEvent) => Promise<boolean>;
  handleChecklistNavigate: (view: View, action?: OnboardingNavigationAction) => void;
  handleClaimReward: (rewardId: string) => Promise<boolean>;
  handleEarnTokens: (amount: number, reason: string, operationId: string) => Promise<boolean>;
  handleGameCompleted: (gameId: string, score: number, details: GameCompletionDetails) => void;
  handleOnboardingComplete: (data: OnboardingResult) => void;
  handleSpendTokens: (amount: number, reason: string, operationId: string) => Promise<boolean>;
  handleToggleComplete: (id: string) => void;
  requestCompletionSync: () => Promise<void>;
  handleWorksheetCancel: () => void;
  handleWorksheetComplete: (session: WorksheetSession) => Promise<boolean>;
  handleWorksheetContinue: () => void;
  handleWorksheetTryAgain: () => void;
  homeworkItems: HomeworkItem[];
  onDashboardOnboardingActionHandled: () => void;
  onboardingFlags: OnboardingFlags;
  onUserNameSaved: (name: string) => void;
  rewards: Reward[];
  rewardError: string | null;
  rewardBlocked: boolean;
  selectedRealmSubject: SubjectType | null;
  setSelectedRealmSubject: (subject: SubjectType | null) => void;
  setView: (view: View) => void;
  updateRewards: (action: SetStateAction<Reward[]>) => Promise<boolean>;
  userName: string;
  userTokens: number;
  view: View;
  worksheetLeveledUp: boolean;
  worksheetNewDifficulty: DifficultyLevel | undefined;
  worksheetProgress: SubjectProgress | null;
  worksheetSession: WorksheetSession | null;
  worksheetStarsToNextLevel: number;
  worksheetSubject: SubjectType | null;
  handleRewardApprovalWrapper: (
    requestId: string,
    action: 'approve' | 'deny' | 'fulfill' | 'retry_debit' | 'retry_refund',
  ) => Promise<boolean>;
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
  handleAchievementEvent,
  handleChecklistNavigate,
  handleClaimReward,
  handleEarnTokens,
  handleGameCompleted,
  handleOnboardingComplete,
  handleRewardApprovalWrapper,
  handleSpendTokens,
  handleStartWorksheet,
  handleToggleComplete,
  requestCompletionSync,
  handleWorksheetCancel,
  handleWorksheetComplete,
  handleWorksheetContinue,
  handleWorksheetTryAgain,
  homeworkItems,
  onDashboardOnboardingActionHandled,
  onboardingFlags,
  onUserNameSaved,
  rewards,
  rewardError,
  rewardBlocked,
  selectedRealmSubject,
  setSelectedRealmSubject,
  setView,
  updateRewards,
  userName,
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
              rewardError={rewardError}
              rewardBlocked={rewardBlocked}
              userTokens={userTokens}
            />
          </RouteErrorBoundary>
        );
      case 'schedules':
        return (
          <RouteErrorBoundary routeName="Schedules Hub">
            <SchedulesHub onEarnTokens={handleEarnTokens} onClose={() => setView('dashboard')} />
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
              rewardError={rewardError}
              rewardBlocked={rewardBlocked}
              onNavigate={setView}
            />
          </RouteErrorBoundary>
        );
      case 'music':
        return (
          <RouteErrorBoundary routeName="Music Library">
            <MusicLibrary />
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
              onDurableFocusCompletion={() => {
                void requestCompletionSync();
              }}
            />
          </RouteErrorBoundary>
        );
      case 'cards':
        return (
          <RouteErrorBoundary routeName="Realm Quests">
            <>
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
                  onComplete={handleWorksheetComplete}
                  onCancel={handleWorksheetCancel}
                />
              ) : !selectedRealmSubject ? (
                <SubjectCards
                  onStartWorksheet={(subject) => setSelectedRealmSubject(subject)}
                  onEarnTokens={handleEarnTokens}
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
            </>
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
              userName={userName}
              onUserNameSaved={onUserNameSaved}
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
          <RouteErrorBoundary routeName="Avatar Shop">
            <AvatarShopUnified
              userTokens={userTokens}
              onSpendTokens={handleSpendTokens}
              onPurchaseComplete={async (operationId: AvatarPurchaseOperationId) => {
                try {
                  const eventId: `shop-purchase:avatar-purchase:${string}` = `shop-purchase:${operationId}`;
                  await handleAchievementEvent({ type: 'SHOP_PURCHASE', eventId });
                } catch (error) {
                  logger.error('[avatar-shop] Confirmed purchase achievement event failed', error);
                }
              }}
              onClose={() => setView('dashboard')}
            />
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
