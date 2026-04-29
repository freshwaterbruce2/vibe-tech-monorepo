import { syncService } from '@/services';
import {
  ArrowRight,
  Clock,
  Database,
  Gift,
  Heart,
  Lock,
  MessageSquare,
  Shield,
  TrendingUp,
  Upload,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { ClaimedReward, HomeworkItem, Reward, View } from '../../types';
import { getThoughtJournalStats } from '../../services/cbtThoughtReframing';
import { getAffirmationStats } from '../../services/dailyAffirmations';
import SecurePinLock from '../core/SecurePinLock';
import DataManagement from '../settings/DataManagement';
import RewardSettings from '../settings/RewardSettings';
import ScreenTimeSettings from '../settings/ScreenTimeSettings';
import ChatAnalytics from './ChatAnalytics';
import ProgressReports from './ProgressReports';

interface ParentDashboardProps {
  items: HomeworkItem[];
  rewards: Reward[];
  claimedRewards: ClaimedReward[];
  onUpdateRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
  onApproval: (claimedRewardId: string, isApproved: boolean) => void;
  onNavigate?: (view: View) => void;
}

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

/* ─── Section wrapper ─── */
function DashboardSection({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-slate-800/30 border border-slate-700/30 overflow-hidden transition-all duration-300 hover:border-slate-600/50">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/30 bg-slate-800/20">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="min-w-0 truncate text-lg font-bold text-slate-200">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

const ParentDashboard = ({
  items,
  rewards,
  claimedRewards,
  onUpdateRewards,
  onApproval,
  onNavigate,
}: ParentDashboardProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const resetInactivityTimer = () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      activityTimeoutRef.current = setTimeout(() => {
        setIsUnlocked(false);
      }, INACTIVITY_TIMEOUT);
    };

    if (isUnlocked) {
      const events: (keyof WindowEventMap)[] = [
        'mousemove',
        'mousedown',
        'keypress',
        'touchstart',
        'scroll',
      ];
      events.forEach((event) => window.addEventListener(event, resetInactivityTimer));
      resetInactivityTimer();

      return () => {
        events.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
        if (activityTimeoutRef.current) {
          clearTimeout(activityTimeoutRef.current);
        }
      };
    }
    return undefined;
  }, [isUnlocked]);

  if (!isUnlocked) {
    return <SecurePinLock onUnlock={() => setIsUnlocked(true)} />;
  }

  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    void (async () => {
      try {
        const result = await syncService.exportForHub();
        window.alert(
          `Export complete!\n\nSaved: ${result.relativePath}\n\nPlease connect USB to Windows to ingest.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        window.alert(`Sync failed: ${message}`);
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  const completedTasks = items.filter((i) => i.completed).length;
  const pendingRewards = claimedRewards.length;
  const affirmationStats = getAffirmationStats();
  const thoughtStats = getThoughtJournalStats();

  return (
    <div className="h-full flex flex-col overflow-x-hidden min-w-0 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="shrink-0 px-5 pt-5 pb-4 bg-gradient-to-b from-slate-900/80 to-transparent">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <h1 className="min-w-0 flex-1 truncate text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
            Parent Dashboard
          </h1>
          <div className="shrink-0 flex items-center gap-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate('parent-rules')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white transition-all duration-200"
              >
                <Shield className="w-4 h-4" /> Rules
              </button>
            )}
            <button
              onClick={() => setIsUnlocked(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all duration-200"
            >
              <Lock className="w-4 h-4" /> Lock
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
          <div className="rounded-xl py-3 px-4 bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-500/20 text-center">
            <p className="text-2xl font-black text-teal-400 tabular-nums">{completedTasks}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Tasks Done</p>
          </div>
          <div className="rounded-xl py-3 px-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 text-center">
            <p className="text-2xl font-black text-amber-400 tabular-nums">{pendingRewards}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Pending Rewards</p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-xl py-3 px-4 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20 text-center hover:border-indigo-500/40 transition-all duration-200 disabled:opacity-50"
          >
            <Upload
              className={`w-6 h-6 mx-auto text-indigo-400 ${isSyncing ? 'animate-pulse' : ''}`}
            />
            <p className="text-xs text-slate-400 font-medium mt-1">
              {isSyncing ? 'Syncing…' : 'Sync Hub'}
            </p>
          </button>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">
        <DashboardSection
          icon={TrendingUp}
          title="Progress Reports"
          accent="bg-gradient-to-br from-teal-500 to-cyan-500"
        >
          <ProgressReports items={items} />
        </DashboardSection>

        <DashboardSection
          icon={MessageSquare}
          title="Chat Analytics"
          accent="bg-gradient-to-br from-blue-500 to-indigo-500"
        >
          <ChatAnalytics />
        </DashboardSection>

        <DashboardSection
          icon={Clock}
          title="Screen Time"
          accent="bg-gradient-to-br from-orange-500 to-amber-500"
        >
          <ScreenTimeSettings />
        </DashboardSection>

        <DashboardSection
          icon={Gift}
          title="Reward Settings"
          accent="bg-gradient-to-br from-sky-500 to-rose-500"
        >
          <RewardSettings
            rewards={rewards}
            onUpdateRewards={onUpdateRewards}
            claimedRewards={claimedRewards}
            onApproval={onApproval}
          />
        </DashboardSection>

        <DashboardSection
          icon={Heart}
          title="Wellness Insights"
          accent="bg-gradient-to-br from-pink-500 to-violet-500"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl px-3 py-2 bg-slate-900/50 border border-slate-700/40">
                <p className="text-xs text-slate-400">Current Streak</p>
                <p className="text-lg font-black text-pink-300">{affirmationStats.currentStreak} days</p>
              </div>
              <div className="rounded-xl px-3 py-2 bg-slate-900/50 border border-slate-700/40">
                <p className="text-xs text-slate-400">Check-ins (7d)</p>
                <p className="text-lg font-black text-violet-300">{affirmationStats.entriesThisWeek}</p>
              </div>
              <div className="rounded-xl px-3 py-2 bg-slate-900/50 border border-slate-700/40">
                <p className="text-xs text-slate-400">Thought Entries</p>
                <p className="text-lg font-black text-sky-300">{thoughtStats.totalEntries}</p>
              </div>
              <div className="rounded-xl px-3 py-2 bg-slate-900/50 border border-slate-700/40">
                <p className="text-xs text-slate-400">Mood Trend</p>
                <p className="text-lg font-black text-emerald-300 capitalize">{affirmationStats.moodTrend}</p>
              </div>
            </div>

            <div className="rounded-xl px-4 py-3 bg-slate-900/40 border border-slate-700/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-slate-300">
                Review the child&apos;s check-ins and thought journal activity to spot support moments early.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('wellness')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500/15 border border-pink-400/30 text-pink-300 hover:bg-pink-500/25 transition-all duration-200 font-semibold text-sm"
                >
                  Open Wellness Hub <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </DashboardSection>

        <DashboardSection
          icon={Database}
          title="Data Management"
          accent="bg-gradient-to-br from-slate-500 to-zinc-500"
        >
          <DataManagement />
        </DashboardSection>
      </div>
    </div>
  );
};

export default ParentDashboard;
