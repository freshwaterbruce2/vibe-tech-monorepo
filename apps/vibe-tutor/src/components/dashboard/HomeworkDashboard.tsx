import { Bell, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { HomeworkItem, ParsedHomework } from '../../types';
import { GradientIcon } from '../ui/icons/GradientIcon';
import AddHomeworkModal from './AddHomeworkModal';
import BreakdownModal from './BreakdownModal';
import GoalsPanel from './GoalsPanel';
import HomeworkItemComponent from './HomeworkItem';
import NotificationPanel from './NotificationPanel';
import QuickStats from './QuickStats';
import StreakTracker from './StreakTracker';
import StudyTimeInsight from './StudyTimeInsight';
import SubjectChart from './SubjectChart';
import WeekProgress from './WeekProgress';

interface HomeworkDashboardProps {
  items: HomeworkItem[];
  onAdd: (item: ParsedHomework) => void;
  onToggleComplete: (id: string) => void;
  tokens: number;
  onboardingBanner?: ReactNode;
}

const HomeworkDashboard = ({
  items,
  onAdd,
  onToggleComplete,
  tokens,
  onboardingBanner,
}: HomeworkDashboardProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [breakdownItem, setBreakdownItem] = useState<HomeworkItem | null>(null);

  const upcomingItems = useMemo(() => {
    // FIX: Use UTC dates for comparison to avoid timezone issues.
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    return items
      .filter((item) => {
        if (item.completed) return false;
        const itemDate = new Date(item.dueDate); // 'YYYY-MM-DD' is parsed as UTC
        return itemDate.getTime() === today.getTime() || itemDate.getTime() === tomorrow.getTime();
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [items]);

  const activeItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  const handleAdd = (item: ParsedHomework) => {
    onAdd(item);
    setIsAddModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-y-auto relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--glass-surface)] via-transparent to-[var(--glass-surface)] pointer-events-none opacity-30"></div>

      <header className="relative z-10 glass-card p-4 md:p-6 mb-4 md:mb-8 rounded-2xl border border-[var(--glass-border)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold neon-text-primary glow-on-hover">
              Homework Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] text-sm md:text-lg">
              Stay on top of your tasks
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full sm:w-auto">
            <div className="relative">
              <button
                onClick={() => setIsNotifPanelOpen((prev) => !prev)}
                className="glass-card p-3 md:p-3 min-h-[48px] min-w-[48px] rounded-xl hover:scale-110 transition-all duration-300 group relative overflow-hidden focus-glow flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
                aria-label="Notifications"
              >
                <GradientIcon Icon={Bell} size={24} gradientId="vibe-gradient-accent" />
                {upcomingItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--tertiary-accent)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-[var(--tertiary-accent)] text-xs text-white items-center justify-center font-bold">
                      {upcomingItems.length}
                    </span>
                  </span>
                )}
              </button>
              {isNotifPanelOpen && (
                <NotificationPanel
                  items={upcomingItems}
                  onClose={() => setIsNotifPanelOpen(false)}
                />
              )}
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-button flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 min-h-[48px] font-semibold text-white rounded-xl hover:scale-105 transition-all duration-300 shadow-lg flex-1 sm:flex-initial"
              style={{ touchAction: 'manipulation' }}
            >
              <GradientIcon Icon={Plus} size={20} gradientId="vibe-gradient-mobile" />
              <span className="text-sm md:text-base">Add</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 relative z-10 space-y-8">
        {onboardingBanner}

        {/* Quick Stats Overview */}
        <QuickStats items={items} />

        {/* Progress & Goals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeekProgress homeworkItems={items} />
          <GoalsPanel homeworkItems={items} tokens={tokens} />
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StreakTracker items={items} />
          <StudyTimeInsight items={items} />
        </div>

        {/* Subject Distribution */}
        <SubjectChart items={items} />

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold neon-text-secondary">To Do</h2>
            <div className="glass-card px-4 py-2 rounded-full">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {activeItems.length}
              </span>
            </div>
          </div>

          {activeItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeItems.map((item, index) => (
                <div
                  key={item.id}
                  className="transform transition-all duration-500"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                  }}
                >
                  <HomeworkItemComponent
                    item={item}
                    onToggleComplete={onToggleComplete}
                    onBreakdownClick={setBreakdownItem}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card text-center py-16 rounded-2xl border-2 border-dashed border-[var(--glass-border)] bg-gradient-to-br from-[var(--glass-surface)] to-transparent">
              <div className="space-y-4">
                <div className="text-6xl" aria-hidden="true">🎉</div>
                <p className="text-xl font-semibold neon-text-primary">No active assignments!</p>
                <p className="text-[var(--text-secondary)]">You're all caught up. Great job!</p>
              </div>
            </div>
          )}
        </section>

        {completedItems.length > 0 && (
          <section className="space-y-6 opacity-80">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-secondary)] to-[var(--text-muted)]">
                Completed
              </h2>
              <div className="glass-card px-4 py-2 rounded-full opacity-60">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {completedItems.length}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="transform transition-all duration-500 opacity-75 hover:opacity-100"
                  style={{
                    animationDelay: `${(activeItems.length + index) * 0.1}s`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                  }}
                >
                  <HomeworkItemComponent
                    item={item}
                    onToggleComplete={onToggleComplete}
                    onBreakdownClick={setBreakdownItem}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {isAddModalOpen && (
        <AddHomeworkModal onClose={() => setIsAddModalOpen(false)} onAdd={handleAdd} />
      )}
      {breakdownItem && (
        <BreakdownModal item={breakdownItem} onClose={() => setBreakdownItem(null)} />
      )}
    </div>
  );
};

export default HomeworkDashboard;
