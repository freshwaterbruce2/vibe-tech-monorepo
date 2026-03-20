/**
 * Vibe-Tutor Component Library
 * Central barrel export file for all component groups
 */

// UI components
export * from './ui';

// Dashboard components
export * from './dashboard';

// Feature components
export * from './features';

// Game components
export * from './games';

// Schedule components
export * from './schedule';

// Settings components
export * from './settings';

// UI components (legacy re-exports for backwards compatibility)
export { default as AchievementCenter } from './ui/AchievementCenter';
export { default as AchievementPopup } from './ui/AchievementPopup';
export { default as AchievementToast } from './ui/AchievementToast';
export { default as CelebrationEffect } from './ui/CelebrationEffect';
export { default as Celebrations } from './ui/Celebrations';
export { default as ErrorBoundary } from './ui/ErrorBoundary';
export { default as LoadingSpinner } from './ui/LoadingSpinner';
export { default as OfflineIndicator } from './ui/OfflineIndicator';
export { ResizableSplitPane } from './ui/ResizableSplitPane';
export { default as Sidebar } from './ui/Sidebar';

// Dashboard components
export { default as AddHomeworkModal } from './dashboard/AddHomeworkModal';
export { default as BreakdownModal } from './dashboard/BreakdownModal';
export { default as GoalsPanel } from './dashboard/GoalsPanel';
export { default as HomeworkDashboard } from './dashboard/HomeworkDashboard';
export { default as HomeworkItem } from './dashboard/HomeworkItem';
export { default as HomeworkTaskCards } from './dashboard/HomeworkTaskCards';
export { default as NotificationPanel } from './dashboard/NotificationPanel';
export { default as ParentDashboard } from './dashboard/ParentDashboard';
export { default as ProgressReports } from './dashboard/ProgressReports';
export { default as QuickStats } from './dashboard/QuickStats';
export { default as StreakTracker } from './dashboard/StreakTracker';
export { default as StudyTimeInsight } from './dashboard/StudyTimeInsight';
export { default as SubjectCards } from './dashboard/SubjectCards';
export { default as SubjectChart } from './dashboard/SubjectChart';
export { default as TaskBreakdown } from './dashboard/TaskBreakdown';
export { default as WeekProgress } from './dashboard/WeekProgress';

// Feature components
export { default as BlakeWelcome } from './features/BlakeWelcome';
export { default as ChatWindow } from './features/ChatWindow';
export { default as ConversationBuddy } from './features/ConversationBuddy';
export { default as FirstThenGate } from './features/FirstThenGate';
export { default as FocusTimer } from './features/FocusTimer';
export { default as LifeSkillsChecklist } from './features/LifeSkillsChecklist';
export { MusicLibrary } from './features/MusicLibrary';
export { default as RobuxRewardShop } from './features/RobuxRewardShop';
export { default as SmartSchedule } from './features/SmartSchedule';
export { default as SocialSkillsTips } from './features/SocialSkillsTips';
export { default as TokenWallet } from './features/TokenWallet';
export { default as VisualTimer } from './features/VisualTimer';
export { default as WorksheetPractice } from './features/WorksheetPractice';
export { default as BrainGymHub } from './games/BrainGymHub';

// Settings components
export { default as DataManagement } from './settings/DataManagement';
export { default as GameSettings } from './settings/GameSettings';
export { default as ParentRulesPage } from './settings/ParentRulesPage';
export { default as RewardSettings } from './settings/RewardSettings';
export { default as ScreenTimeSettings } from './settings/ScreenTimeSettings';
export { default as SensorySettings } from './settings/SensorySettings';

// Root-level components (moved to core)
export { default as SecurePinLock } from './core/SecurePinLock';
export { default as TokenSystem } from './core/TokenSystem';
