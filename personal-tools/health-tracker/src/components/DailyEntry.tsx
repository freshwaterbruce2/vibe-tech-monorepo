import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { useTodayEntry } from '../hooks/useTodayEntry';
import { db, ensureStarterHabits } from '../lib/db';
import { DimensionSlider } from './DimensionSlider';
import { HabitChecklist } from './HabitChecklist';
import type { Dimension, Valence } from '../lib/types';

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'physical', label: 'Physical' },
  { key: 'mental', label: 'Mental' },
  { key: 'emotional', label: 'Emotional' },
  { key: 'spiritual', label: 'Spiritual' },
];

const VALENCE_OPTIONS: {
  value: Valence;
  label: string;
  icon: string;
  active: string;
  inactive: string;
}[] = [
  {
    value: 'positive',
    label: 'Good',
    icon: 'M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-100/70',
    inactive: 'border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50',
  },
  {
    value: 'neutral',
    label: 'Okay',
    icon: 'M8 14h8M9 9h.01M15 9h.01',
    active: 'border-sky-200 bg-sky-50 text-sky-700 shadow-sky-100/70',
    inactive: 'border-sky-100 bg-white/70 text-sky-700 hover:bg-sky-50',
  },
  {
    value: 'negative',
    label: 'Hard',
    icon: 'M8 15s1.5-2 4-2 4 2 4 2M9 9h.01M15 9h.01',
    active: 'border-rose-200 bg-rose-50 text-rose-700 shadow-rose-100/70',
    inactive: 'border-rose-100 bg-white/70 text-rose-700 hover:bg-rose-50',
  },
];

function getHeroDate(date: string): {
  desktop: string;
  mobileWeekday: string;
  mobileRest: string;
} {
  try {
    const parsed = parseISO(date);
    return {
      desktop: format(parsed, 'EEE, MMM. d, yyyy'),
      mobileWeekday: format(parsed, 'EEE'),
      mobileRest: format(parsed, 'MMM. d, yyyy'),
    };
  } catch {
    return {
      desktop: date,
      mobileWeekday: date,
      mobileRest: '',
    };
  }
}

function MetricCard({
  label,
  value,
  helper,
  tone,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  tone: 'green' | 'blue' | 'pink';
  icon: string;
}) {
  const color = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    blue: 'bg-sky-50 text-sky-700 ring-sky-100',
    pink: 'bg-rose-50 text-rose-700 ring-rose-100',
  }[tone];

  return (
    <div className="metric-card">
      <div className={`metric-icon ${color}`} aria-hidden="true">
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={icon} />
        </svg>
      </div>
      <div>
        <dt className="metric-label text-sm font-extrabold text-slate-600">{label}</dt>
        <dd className="metric-value display-font mt-1 text-2xl font-black leading-none text-slate-950">
          {value}
        </dd>
        <p className="metric-helper mt-1 text-xs font-bold text-slate-400">{helper}</p>
      </div>
    </div>
  );
}

export function DailyEntry() {
  const { entry, date, save, setScore, toggleHabit } = useTodayEntry();
  const enabledHabitCount =
    useLiveQuery(
      () => db.habits.filter((habit) => habit.enabled).count(),
      []
    ) ?? 0;
  const [themeInput, setThemeInput] = useState('');

  useEffect(() => {
    void ensureStarterHabits();
  }, []);

  const scores = entry?.scores ?? {};
  const habits = entry?.habits ?? {};
  const themes = entry?.themes ?? [];
  const enteredScores = DIMENSIONS.flatMap((dimension) => {
    const score = scores[dimension.key];
    return typeof score === 'number' ? [score] : [];
  });
  const averageScore =
    enteredScores.length > 0
      ? enteredScores.reduce((total, score) => total + score, 0) / enteredScores.length
      : undefined;
  const completedCount = Object.values(habits).filter(Boolean).length;
  const habitProgress = enabledHabitCount > 0 ? `${completedCount}/${enabledHabitCount}` : '0/0';
  const toneLabel = entry?.valence
    ? VALENCE_OPTIONS.find((option) => option.value === entry.valence)?.label ?? '--'
    : '--';
  const heroDate = getHeroDate(date);

  function handleValenceClick(value: Valence) {
    void save({ valence: entry?.valence === value ? undefined : value });
  }

  function handleThemeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = themeInput.trim().toLowerCase();
    if (!trimmed || themes.includes(trimmed)) {
      setThemeInput('');
      return;
    }
    void save({ themes: [...themes, trimmed] });
    setThemeInput('');
  }

  function removeTheme(theme: string) {
    void save({ themes: themes.filter((item) => item !== theme) });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-6 lg:py-8">
      <section className="sky-hero">
        <div className="relative z-10 max-w-3xl">
          <p className="text-base font-bold text-sky-800">Good morning</p>
          <h1
            className="display-font mt-3 text-[2.55rem] font-black leading-[0.98] text-slate-950 sm:text-7xl"
            aria-label={heroDate.desktop}
          >
            <span className="hidden sm:inline">{heroDate.desktop}</span>
            <span className="sm:hidden">
              {heroDate.mobileWeekday},
              <br />
              {heroDate.mobileRest}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg font-semibold text-slate-600">
            Take a moment to check in with yourself.
          </p>
        </div>
        <div className="sun-orb" aria-hidden="true" />
        <div className="bird bird-one" aria-hidden="true" />
        <div className="bird bird-two" aria-hidden="true" />
      </section>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard
          label="Average"
          value={averageScore === undefined ? '--' : averageScore.toFixed(1)}
          helper="Your daily average"
          tone="green"
          icon="M4 19V9M10 19V5M16 19v-7M3 19h18"
        />
        <MetricCard
          label="Habits"
          value={habitProgress}
          helper="Completed today"
          tone="blue"
          icon="M20 6L9 17l-5-5"
        />
        <MetricCard
          label="Tone"
          value={toneLabel}
          helper="How you're feeling"
          tone="pink"
          icon="M20.8 8.6c0 5.1-8.8 10.4-8.8 10.4S3.2 13.7 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z"
        />
      </dl>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.25fr_0.82fr_1.08fr]">
        <section className="sky-card self-start p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
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
                  <path d="M5 12c4-7 10-7 14 0-4 7-10 7-14 0Z" />
                  <path d="M12 9v6M9 12h6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  How are you in each dimension?
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Use the sliders to reflect on your day.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {DIMENSIONS.map((dimension) => (
              <DimensionSlider
                key={dimension.key}
                dimension={dimension.key}
                label={dimension.label}
                value={scores[dimension.key]}
                onChange={(value) => void setScore(dimension.key, value)}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 text-center text-xs font-bold text-slate-500">
            <span>Low</span>
            <span>Neutral</span>
            <span>High</span>
          </div>
        </section>

        <HabitChecklist completed={habits} onToggle={toggleHabit} />

        <aside className="grid self-start gap-4">
          <section className="sky-card p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-100">
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
                  <path d="M20.8 8.6c0 5.1-8.8 10.4-8.8 10.4S3.2 13.7 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Today's Tone</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  How would you describe your day?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {VALENCE_OPTIONS.map((option) => {
                const isActive = entry?.valence === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleValenceClick(option.value)}
                    className={`tone-button ${isActive ? option.active : option.inactive}`}
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d={option.icon} />
                    </svg>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="sky-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100">
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </div>
              <label htmlFor="themes-input" className="text-xl font-black text-slate-900">
                Themes <span className="text-sm font-bold text-slate-400">(optional)</span>
              </label>
            </div>
            <input
              id="themes-input"
              type="text"
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
              onKeyDown={handleThemeKeyDown}
              placeholder="e.g., Growth, Rest, Change..."
              className="field-input"
            />
            {themes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {themes.map((theme) => (
                  <span key={theme} className="theme-chip">
                    {theme}
                    <button
                      type="button"
                      onClick={() => removeTheme(theme)}
                      aria-label={`Remove theme ${theme}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="sky-card p-5">
            <div className="mb-3 flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700 ring-1 ring-rose-100">
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
                  <path d="M20.8 8.6c0 5.1-8.8 10.4-8.8 10.4S3.2 13.7 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z" />
                </svg>
              </div>
              <div>
                <label
                  htmlFor="gratitude-input"
                  className="block text-xl font-black text-slate-900"
                >
                  Gratitude
                </label>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  What are you grateful for today?
                </p>
              </div>
            </div>
            <textarea
              id="gratitude-input"
              value={entry?.gratitude ?? ''}
              onChange={(e) => void save({ gratitude: e.target.value })}
              placeholder="Write here..."
              rows={3}
              className="field-input min-h-24 resize-none"
            />
          </section>
        </aside>
      </section>

      <section className="sky-card p-5">
        <div className="mb-3 flex items-start gap-3">
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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
          <div>
            <label
              htmlFor="reflection-input"
              className="block text-xl font-black text-slate-900"
            >
              Reflection
            </label>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              What thoughts or lessons are you taking from today?
            </p>
          </div>
        </div>
        <textarea
          id="reflection-input"
          value={entry?.reflection ?? ''}
          onChange={(e) => void save({ reflection: e.target.value })}
          placeholder="Write your reflection..."
          rows={4}
          className="field-input min-h-24 resize-none"
        />
      </section>
    </div>
  );
}
