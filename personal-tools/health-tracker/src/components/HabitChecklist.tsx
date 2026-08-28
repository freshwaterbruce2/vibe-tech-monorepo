import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Dimension, HabitDefinition } from '../lib/types';

interface Props {
  completed: Record<string, boolean>;
  onToggle: (habitId: string) => void;
}

const DIMENSIONS: { key: Dimension; label: string; accent: string }[] = [
  { key: 'physical', label: 'Physical Health', accent: 'text-emerald-700' },
  { key: 'mental', label: 'Mental Wellness', accent: 'text-sky-700' },
  { key: 'emotional', label: 'Emotional Care', accent: 'text-rose-700' },
  { key: 'spiritual', label: 'Spiritual Growth', accent: 'text-amber-700' },
];

function habitsForDimension(habits: HabitDefinition[], dimension: Dimension) {
  return habits.filter((habit) => habit.dimension === dimension && habit.enabled);
}

export function HabitChecklist({ completed, onToggle }: Props) {
  const habits = useLiveQuery(() => db.habits.filter((habit) => habit.enabled).toArray(), []);

  if (!habits) return null;

  return (
    <section className="sky-card flex self-start flex-col gap-5 p-5 xl:max-h-[27.5rem]">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Habit Check-In</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Small actions, big impact.</p>
        </div>
      </div>

      <div className="habit-list flex flex-col gap-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
        {DIMENSIONS.map((dimension) => {
          const group = habitsForDimension(habits, dimension.key);
          if (group.length === 0) return null;

          return (
            <div key={dimension.key} className="flex flex-col gap-2 xl:gap-1.5">
              <h3 className={`text-sm font-extrabold ${dimension.accent}`}>{dimension.label}</h3>
              <div className="grid gap-2">
                {group.map((habit) => (
                  <label
                    key={habit.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:border-sky-200 hover:bg-white xl:py-1.5 xl:text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={!!completed[habit.id]}
                      onChange={() => onToggle(habit.id)}
                      className="h-[1.125rem] w-[1.125rem] accent-sky-500"
                    />
                    <span className={completed[habit.id] ? 'text-slate-400 line-through' : ''}>
                      {habit.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
