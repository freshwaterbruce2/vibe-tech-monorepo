import { useMemo } from 'react';
import type { HomeworkItem as HomeworkItemType } from '../../types';
// FIX: Import the LightningIcon
import { LightningIcon } from '../ui/icons/LightningIcon';

interface HomeworkItemProps {
  item: HomeworkItemType;
  onToggleComplete: (id: string) => void;
  // FIX: Add the onBreakdownClick prop
  onBreakdownClick: (item: HomeworkItemType) => void;
}

const subjectColorMap: Record<string, { bg: string; text: string }> = {
  math: { bg: '#2E5A8833', text: '#63A3EE' },
  science: { bg: '#2E8B5733', text: '#66CDAA' },
  history: { bg: '#D2691E33', text: '#FFA07A' },
  english: { bg: '#483D8B33', text: '#9370DB' },
  language: { bg: '#C7158533', text: '#FF69B4' },
  'language arts': { bg: '#C7158533', text: '#FF69B4' },
  bible: { bg: '#F59E0B33', text: '#FCD34D' },
  art: { bg: '#FFD70033', text: '#FFD700' },
  music: { bg: '#DC143C33', text: '#FF6347' },
  default: { bg: '#69696933', text: '#D3D3D3' },
};

const getSubjectColor = (subject: string): { bg: string; text: string } => {
  return subjectColorMap[subject.toLowerCase()] ?? subjectColorMap['default']!;
};

const HomeworkItem = ({ item, onToggleComplete, onBreakdownClick }: HomeworkItemProps) => {
  const color = getSubjectColor(item.subject) ?? subjectColorMap.default;

  // Calculate urgency (color-coded deadlines)
  const urgency = useMemo(() => {
    if (item.completed) return 'completed';

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dueDate = new Date(item.dueDate);
    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    return 'future';
  }, [item.dueDate, item.completed]);

  const urgencyStyles = {
    overdue: 'border-red-500/50 bg-red-500/5',
    today: 'border-yellow-500/50 bg-yellow-500/5',
    tomorrow: 'border-orange-500/30 bg-orange-500/5',
    future: 'border-[var(--glass-border)]',
    completed: 'border-green-500/30 bg-green-500/5',
  };

  return (
    <div
      className={`glass-card p-6 rounded-2xl border relative overflow-hidden group transition-all duration-300 ${urgencyStyles[urgency]} ${
        item.completed
          ? 'opacity-60 scale-95'
          : 'hover:scale-105 hover:shadow-[var(--neon-glow-soft)] hover:border-[var(--border-hover)]'
      }`}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--glass-surface)] via-transparent to-[var(--glass-surface)] opacity-50 group-hover:opacity-70 transition-opacity"></div>

      <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <span
              className="text-xs font-bold uppercase px-3 py-1.5 rounded-full glass-card border border-[var(--glass-border)] backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, ${color.bg}, ${color.bg}50)`,
                color: color.text,
                textShadow: `0 0 8px ${color.text}50`,
              }}
            >
              {item.subject}
            </span>
            {!item.completed && (
              <div className="w-2 h-2 bg-[var(--primary-accent)] rounded-full animate-pulse shadow-[var(--neon-glow-primary)]"></div>
            )}
          </div>
          <h3
            className={`text-lg font-semibold min-w-0 break-words transition-all duration-300 ${
              item.completed
                ? 'line-through text-[var(--text-muted)]'
                : 'text-[var(--text-primary)] group-hover:neon-text-primary'
            }`}
          >
            {item.title}
          </h3>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <p className="text-sm text-[var(--text-secondary)] font-medium">
                Due:{' '}
                {new Date(item.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              </p>
              {urgency === 'overdue' && (
                <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded">
                  OVERDUE
                </span>
              )}
              {urgency === 'today' && (
                <span className="text-xs font-bold text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                  TODAY
                </span>
              )}
              {urgency === 'tomorrow' && (
                <span className="text-xs font-bold text-orange-400 bg-orange-500/20 px-2 py-1 rounded">
                  TOMORROW
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!item.completed && (
              <button
                onClick={() => onBreakdownClick(item)}
                className="glass-card flex items-center gap-2 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--secondary-accent)] hover:scale-105 transition-all duration-300 focus-glow"
                title="Break down task with AI"
                style={{ touchAction: 'manipulation' }}
              >
                <LightningIcon className="w-4 h-4" />
                AI Help
              </button>
            )}
            <button
              onClick={() => onToggleComplete(item.id)}
              className={`flex items-center gap-2 px-5 py-3.5 min-h-[46px] rounded-lg text-sm font-medium transition-all duration-300 ${
                item.completed
                  ? 'glass-card text-[var(--text-muted)] hover:scale-105'
                  : 'glass-button text-white hover:scale-105 shadow-lg'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  item.completed
                    ? 'bg-[var(--primary-accent)] border-[var(--primary-accent)] shadow-[var(--neon-glow-primary)]'
                    : 'border-[var(--text-secondary)] group-hover:border-white'
                }`}
              >
                {item.completed && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              {item.completed ? 'Done' : 'Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeworkItem;
