import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { HomeworkItem } from '../../types';

export type HomeworkTaskCardsDensity = 'comfortable' | 'compact';

export interface HomeworkTaskCardsProps {
  items: HomeworkItem[];
  selectedId?: string;
  ariaLabel?: string;
  density?: HomeworkTaskCardsDensity;

  onSelect?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  onRequestBreakdown?: (item: HomeworkItem) => void;
}

type Urgency = 'overdue' | 'today' | 'tomorrow' | 'future' | 'completed';

function getUrgency(item: HomeworkItem): Urgency {
  if (item.completed) return 'completed';

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dueUtc = new Date(item.dueDate); // 'YYYY-MM-DD' parses as UTC in JS

  const diffMs = dueUtc.getTime() - todayUtc.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return 'future';
}

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

const HomeworkTaskCards = ({
  items,
  selectedId,
  ariaLabel = 'Homework tasks',
  density = 'comfortable',
  onSelect,
  onToggleComplete,
  onRequestBreakdown,
}: HomeworkTaskCardsProps) => {
  const ordered = useMemo(() => items.slice(), [items]);

  const initialActiveIndex = useMemo(() => {
    if (ordered.length === 0) return 0;
    if (typeof selectedId !== 'string' || selectedId.length === 0) return 0;
    const idx = ordered.findIndex(i => i.id === selectedId);
    return Math.max(idx, 0);
  }, [ordered, selectedId]);

  const [activeIndex, setActiveIndex] = useState<number>(initialActiveIndex);
  const selectButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setActiveIndex(initialActiveIndex);
  }, [initialActiveIndex]);

  const spacing = density === 'compact' ? 'p-4' : 'p-6';

  const urgencyStyles: Record<Urgency, string> = {
    overdue: 'border-red-500/50 bg-red-500/5',
    today: 'border-yellow-500/50 bg-yellow-500/5',
    tomorrow: 'border-orange-500/30 bg-orange-500/5',
    future: 'border-[var(--glass-border)]',
    completed: 'border-fuchsia-500/30 bg-fuchsia-500/5 opacity-70',
  };

  const moveFocusToIndex = (nextIndex: number) => {
    const clamped = clampIndex(nextIndex, ordered.length);
    setActiveIndex(clamped);
    selectButtonRefs.current[clamped]?.focus();
  };

  if (ordered.length === 0) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-[var(--glass-border)] text-center">
        <p className="text-[var(--text-secondary)]">No homework tasks yet.</p>
      </div>
    );
  }

  return (
    <ul aria-label={ariaLabel} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ordered.map((item, idx) => {
        const urgency = getUrgency(item);
        const isSelected = typeof selectedId === 'string' ? item.id === selectedId : idx === activeIndex;

        const handleSelectKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
          const key = e.key;
          if (key === 'ArrowDown' || key === 'ArrowRight') {
            e.preventDefault();
            moveFocusToIndex(idx + 1);
            return;
          }
          if (key === 'ArrowUp' || key === 'ArrowLeft') {
            e.preventDefault();
            moveFocusToIndex(idx - 1);
            return;
          }
          if (key === 'Home') {
            e.preventDefault();
            moveFocusToIndex(0);
            return;
          }
          if (key === 'End') {
            e.preventDefault();
            moveFocusToIndex(ordered.length - 1);
          }
        };

        return (
          <li
            key={item.id}
            className={`glass-card rounded-2xl border relative overflow-hidden group transition-all duration-300 ${spacing} ${urgencyStyles[urgency]} ${
              isSelected ? 'ring-2 ring-[var(--primary-accent)] ring-offset-0' : ''
            } ${item.completed ? '' : 'hover:scale-[1.02] hover:border-[var(--border-hover)]'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--glass-surface)] via-transparent to-[var(--glass-surface)] opacity-40 group-hover:opacity-60 transition-opacity" />

            <div className="relative z-10 flex flex-col gap-4">
              <button
                type="button"
                ref={(el) => {
                  selectButtonRefs.current[idx] = el;
                }}
                onFocus={() => setActiveIndex(idx)}
                onKeyDown={handleSelectKeyDown}
                onClick={() => onSelect?.(item.id)}
                className="text-left outline-none focus-glow rounded-xl"
                aria-label={`Select task: ${item.title}`}
                aria-current={isSelected ? 'true' : undefined}
              >
                <p className="text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wide">
                  {item.subject}
                </p>
                <h3
                  className={`mt-1 text-lg font-semibold break-words ${
                    item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {item.title}
                </h3>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span aria-label={`Due ${formatDueDate(item.dueDate)}`}>Due: {formatDueDate(item.dueDate)}</span>
                  {urgency === 'overdue' && (
                    <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded">Overdue</span>
                  )}
                  {urgency === 'today' && (
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">Today</span>
                  )}
                  {urgency === 'tomorrow' && (
                    <span className="text-xs font-bold text-orange-400 bg-orange-500/20 px-2 py-1 rounded">Tomorrow</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {typeof onToggleComplete === 'function' && (
                    <button
                      type="button"
                      className={`min-h-[44px] px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 focus-glow ${
                        item.completed
                          ? 'bg-[var(--primary-accent)]/20 border-[var(--primary-accent)]/40 text-[var(--text-primary)]'
                          : 'glass-card border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                      }`}
                      aria-label={item.completed ? 'Mark task as not completed' : 'Mark task as completed'}
                      onClick={() => onToggleComplete(item.id)}
                    >
                      {item.completed ? 'Completed' : 'Complete'}
                    </button>
                  )}

                  {typeof onRequestBreakdown === 'function' && !item.completed && (
                    <button
                      type="button"
                      className="glass-card px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--secondary-accent)] hover:scale-105 transition-all duration-300 focus-glow"
                      aria-label={`Get help breaking down: ${item.title}`}
                      onClick={() => onRequestBreakdown(item)}
                    >
                      Break down
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Tip: Use arrow keys to move. Press Enter to select.
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default HomeworkTaskCards;
