import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import type { DailySchedule, ScheduleStep } from '../../types/schedule';
import { StepCard } from './StepCard';
import { getSchedules, updateStepStatus } from '../../services/scheduleService';

interface VisualScheduleProps {
  type: 'morning' | 'evening';
  onStepComplete?: (step: ScheduleStep) => void;
  onEditSchedule?: () => void;
}

const VisualSchedule = ({ type, onStepComplete, onEditSchedule }: VisualScheduleProps) => {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const schedules = await getSchedules();
      const foundSchedule = schedules.find(s => s.type === type);
      setSchedule(foundSchedule ?? null);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const handleStepToggle = async (step: ScheduleStep) => {
    if (!schedule) return;

    const newStatus = step.status === 'completed' ? 'pending' : 'completed';

    try {
      await updateStepStatus(schedule.id, step.id, newStatus);

      // Update local state
      setSchedule(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: prev.steps.map(s =>
            s.id === step.id ? { ...s, status: newStatus, completedAt: newStatus === 'completed' ? Date.now() : undefined } : s
          ),
        };
      });

      // Notify parent if completed
      if (newStatus === 'completed' && onStepComplete) {
        onStepComplete({ ...step, status: newStatus, completedAt: Date.now() });
      }
    } catch (error) {
      console.error('Failed to update step:', error);
    }
  };

  const handleStartStep = (stepId: string) => {
    setActiveStepId(stepId);
  };

  const getCompletionStats = () => {
    if (!schedule) return { completed: 0, total: 0, percentage: 0 };
    const completed = schedule.steps.filter(s => s.status === 'completed').length;
    const total = schedule.steps.length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="glass-card p-6 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-purple-400" />
        <h3 className="text-lg font-bold text-white mb-2">No {type} schedule yet</h3>
        <p className="text-white/70 mb-4">Create a schedule to help structure your day</p>
        {onEditSchedule && (
          <button
            onClick={onEditSchedule}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Create Schedule
          </button>
        )}
      </div>
    );
  }

  const stats = getCompletionStats();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white capitalize">{type} Routine</h2>
          </div>
          {onEditSchedule && (
            <button
              onClick={onEditSchedule}
              className="px-3 py-1 text-sm bg-purple-600/30 hover:bg-purple-600/50 rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/80">Progress</span>
            <span className="text-cyan-400 font-semibold">{stats.completed}/{stats.total} steps</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {schedule.description && (
          <p className="text-white/60 text-sm mt-3">{schedule.description}</p>
        )}
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {schedule.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            stepNumber={index + 1}
            isActive={activeStepId === step.id}
            onToggle={() => { void handleStepToggle(step); }}
            onStart={() => handleStartStep(step.id)}
          />
        ))}
      </div>

      {/* Completion Message */}
      {stats.completed === stats.total && stats.total > 0 && (
        <div className="glass-card p-4 bg-gradient-to-r from-violet-600/20 to-violet-600/20 border border-fuchsia-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-fuchsia-400" />
            <div>
              <h3 className="font-bold text-white">All done!</h3>
              <p className="text-sm text-white/70">Great job completing your {type} routine 🎉</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualSchedule;
