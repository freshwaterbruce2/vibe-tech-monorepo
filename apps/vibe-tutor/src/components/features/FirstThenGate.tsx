import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { getSchedules, getTodayProgress } from '../../services/scheduleService';
import type { DailySchedule, ScheduleProgress } from '../../types/schedule';

import { appStore } from '../../utils/electronStore';

interface FirstThenGateProps {
  children: React.ReactNode;
  onGateOpen?: () => void;
  minimumStepsRequired?: number; // Default: 3 steps completed
  showSchedulePrompt?: boolean; // Show link to schedule if not completed
}

const FirstThenGate = ({
  children,
  onGateOpen,
  minimumStepsRequired = 3,
  showSchedulePrompt = true,
}: FirstThenGateProps) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [_progress, setProgress] = useState<ScheduleProgress[]>([]);
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);

  const checkGateStatus = useCallback(async () => {
    try {
      setLoading(true);

      // Check if First-Then is enabled in parent rules
      const rulesEnabled = appStore.get('firstThenEnabled');
      if (rulesEnabled === 'false') {
        // Gate is disabled, always unlock
        setIsUnlocked(true);
        setLoading(false);
        return;
      }

      const [todayProgress, allSchedules] = await Promise.all([
        getTodayProgress(),
        getSchedules(),
      ]);

      setProgress(todayProgress);
      setSchedules(allSchedules);

      // Count total completed steps from all schedules today
      const completed = todayProgress.reduce((sum, p) => sum + p.completedSteps.length, 0);
      setTotalCompleted(completed);

      // Unlock if minimum steps completed
      if (completed >= minimumStepsRequired) {
        setIsUnlocked(true);
        if (onGateOpen) {
          onGateOpen();
        }
      } else {
        setIsUnlocked(false);
      }
    } catch (error) {
      console.error('Failed to check gate status:', error);
      // On error, allow access (fail-open for better UX)
      setIsUnlocked(true);
    } finally {
      setLoading(false);
    }
  }, [minimumStepsRequired, onGateOpen]);

  useEffect(() => {
    void checkGateStatus();
  }, [checkGateStatus]);

  const getScheduleType = (): 'morning' | 'evening' | null => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 17 && hour < 22) return 'evening';
    return null;
  };

  const getCurrentSchedule = (): DailySchedule | null => {
    const type = getScheduleType();
    if (!type) return null;
    return schedules.find(s => s.type === type && s.active) ?? null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  // Gate is locked
  const stepsRemaining = minimumStepsRequired - totalCompleted;
  const currentSchedule = getCurrentSchedule();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 flex items-center justify-center">
      <div className="glass-card p-8 max-w-2xl w-full text-center">
        {/* Lock Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center animate-pulse">
            <Lock className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-4">
          First Things First!
        </h2>

        {/* Message */}
        <p className="text-lg text-white/80 mb-6">
          Complete <span className="font-bold text-[var(--success-accent)]">{stepsRemaining} more routine step{stepsRemaining !== 1 ? 's' : ''}</span> to unlock Brain Games.
        </p>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/70">Progress</span>
            <span className="text-[var(--success-accent)] font-semibold">{totalCompleted}/{minimumStepsRequired} steps</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--success-accent)] to-purple-500 transition-all duration-500"
              style={{ width: `${Math.min((totalCompleted / minimumStepsRequired) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Encouragement */}
        <div className="glass-card p-4 bg-gradient-to-r from-purple-600/20 to-purple-600/20 border border-purple-500/30 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div className="text-left">
              <h3 className="font-bold text-white mb-1">Why First-Then?</h3>
              <p className="text-sm text-white/70">
                Getting your routine done first helps build good habits. After completing your tasks, Brain Games will be your reward!
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        {showSchedulePrompt && currentSchedule && (
          <button
            onClick={() => {
              // Navigate to schedules (parent component should handle this)
              window.dispatchEvent(new CustomEvent('navigate-to-schedule', { detail: { type: currentSchedule.type } }));
            }}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg font-bold text-lg hover:scale-105 transition-transform"
          >
            Go to {currentSchedule.type === 'morning' ? 'Morning' : 'Evening'} Routine
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {!currentSchedule && (
          <p className="text-white/60 text-sm">
            No active routine for this time of day. Check back in the morning or evening!
          </p>
        )}

        {/* Fun Visual */}
        <div className="mt-8 flex items-center justify-center gap-4 opacity-60">
          <div className="flex items-center gap-2 text-white/50">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">Routine Steps</span>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30" />
          <div className="flex items-center gap-2 text-white/50">
            <Unlock className="w-5 h-5" />
            <span className="text-sm">Brain Games Unlocked</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstThenGate;

