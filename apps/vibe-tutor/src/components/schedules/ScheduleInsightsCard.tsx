import { Flame, TrendingUp, Zap } from 'lucide-react';

interface ScheduleInsightsCardProps {
  peakHours: number[];
  weeklyStats: { completed: number; total: number };
  streak: number;
}

function formatHour(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 || 12;
  return `${display}${ampm}`;
}

export function ScheduleInsightsCard({ peakHours, weeklyStats, streak }: ScheduleInsightsCardProps) {
  const peakLabel =
    peakHours.length >= 2
      ? `${formatHour(peakHours[0] ?? 0)}–${formatHour(peakHours[peakHours.length - 1] ?? 0)}`
      : formatHour(peakHours[0] ?? 16);

  return (
    <div className="glass-card p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)]">
      <p className="text-xs font-semibold text-[var(--primary-accent)] mb-3 uppercase tracking-wide">
        ✨ Your Insights
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <Zap className="w-5 h-5 text-[var(--token-color)] mx-auto mb-1" />
          <p className="text-xs text-[var(--text-secondary)]">Best Time</p>
          <p className="text-sm font-bold text-white">{peakLabel}</p>
        </div>
        <div>
          <TrendingUp className="w-5 h-5 text-[var(--success-accent)] mx-auto mb-1" />
          <p className="text-xs text-[var(--text-secondary)]">This Week</p>
          <p className="text-sm font-bold text-white">
            {weeklyStats.completed}/{weeklyStats.total}
          </p>
        </div>
        <div>
          <Flame className="w-5 h-5 text-[var(--secondary-accent)] mx-auto mb-1" />
          <p className="text-xs text-[var(--text-secondary)]">Streak</p>
          <p className="text-sm font-bold text-white">
            {streak} day{streak !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
