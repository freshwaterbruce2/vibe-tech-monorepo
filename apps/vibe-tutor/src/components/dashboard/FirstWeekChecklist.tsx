import type { OnboardingNavigationAction, View } from '../../types';

interface FirstWeekChecklistProps {
  hasAvatar: boolean;
  welcomeTokensEarned: boolean;
  hasHomework: boolean;
  hasCompletedTask: boolean;
  hasVisitedShop: boolean;
  onNavigate: (view: View, action?: OnboardingNavigationAction) => void;
}

interface ChecklistTask {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
  action?: { label: string; handler: () => void };
}

const FirstWeekChecklist = ({
  hasAvatar,
  welcomeTokensEarned,
  hasHomework,
  hasCompletedTask,
  hasVisitedShop,
  onNavigate,
}: FirstWeekChecklistProps) => {
  const tasks: ChecklistTask[] = [
    { id: 'avatar', label: 'Create your avatar', done: hasAvatar },
    {
      id: 'tokens',
      label: 'Finish welcome setup',
      done: welcomeTokensEarned,
      action: !welcomeTokensEarned
        ? { label: 'Finish setup', handler: () => onNavigate('onboarding') }
        : undefined,
    },
    {
      id: 'homework',
      label: 'Add your first homework',
      done: hasHomework,
      action: !hasHomework
        ? {
            label: 'Add homework',
            handler: () => onNavigate('dashboard', 'open-add-homework'),
          }
        : undefined,
    },
    {
      id: 'complete',
      label: 'Complete a task',
      done: hasCompletedTask,
      action: !hasCompletedTask ? { label: 'Open tasks', handler: () => onNavigate('dashboard') } : undefined,
    },
    {
      id: 'shop',
      label: 'Visit the reward shop',
      done: hasVisitedShop,
      action: { label: 'Open shop', handler: () => onNavigate('shop') },
    },
  ];

  const completedCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  if (completedCount === total) return null;

  return (
    <section
      aria-label="Getting started checklist"
      className="glass-card p-5 rounded-2xl border border-[var(--glass-border)] space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold neon-text-primary">
          🎯 Getting Started ({completedCount} of {total})
        </h3>
      </div>

      <div
        className="w-full h-2 bg-[var(--glass-border)] rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full bg-gradient-to-r from-[var(--primary-accent)] to-[var(--tertiary-accent)] transition-all duration-500"
          style={{ width: `${(completedCount / total) * 100}%` }}
        />
      </div>

      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  t.done
                    ? 'bg-[var(--primary-accent)] text-white'
                    : 'border-2 border-[var(--glass-border)]'
                }`}
                aria-hidden="true"
              >
                {t.done ? '✓' : ''}
              </span>
              <span
                className={
                  t.done
                    ? 'line-through text-[var(--text-muted)]'
                    : 'text-[var(--text-primary)]'
                }
              >
                {t.label}
              </span>
            </div>
            {!t.done && t.action && (
              <button
                type="button"
                onClick={t.action.handler}
                className="text-sm font-semibold text-[var(--primary-accent)] hover:underline"
              >
                {t.action.label}
              </button>
            )}
            {!t.done && t.hint && !t.action && (
              <span className="text-xs text-[var(--text-secondary)]">{t.hint}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default FirstWeekChecklist;
