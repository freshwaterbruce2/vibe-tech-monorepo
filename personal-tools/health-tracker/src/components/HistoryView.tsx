import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { useHistory } from '../hooks/useHistory';
import { db } from '../lib/db';
import type { DailyEntry, Dimension, Valence } from '../lib/types';

const DIM_KEYS: Dimension[] = ['physical', 'mental', 'emotional', 'spiritual'];

const DIM_COLOR: Record<Dimension, string> = {
  physical: 'bg-emerald-500',
  mental: 'bg-sky-500',
  emotional: 'bg-rose-500',
  spiritual: 'bg-amber-500',
};

const VALENCE_STYLE: Record<Valence, { bg: string; text: string; label: string }> = {
  positive: { bg: 'bg-emerald-50 ring-emerald-100', text: 'text-emerald-700', label: 'Good' },
  neutral: { bg: 'bg-slate-100 ring-slate-200', text: 'text-slate-600', label: 'Okay' },
  negative: { bg: 'bg-rose-50 ring-rose-100', text: 'text-rose-700', label: 'Hard' },
};

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE, MMM d');
  } catch {
    return dateStr;
  }
}

function ScoreBars({ entry }: { entry: DailyEntry }) {
  return (
    <div className="flex gap-3 items-end">
      {DIM_KEYS.map((dim) => {
        const score = entry.scores[dim];
        const widthPercent = typeof score === 'number' ? (score / 10) * 100 : 0;
        return (
          <div key={dim} className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-center text-xs font-bold uppercase text-slate-400">
              {dim[0].toUpperCase()}
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${DIM_COLOR[dim]}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className="text-center text-xs font-semibold tabular-nums text-slate-400">
              {score ?? '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EntryCard({ entry, totalHabits }: { entry: DailyEntry; totalHabits: number }) {
  const completedCount = Object.values(entry.habits).filter(Boolean).length;
  const themes = entry.themes ?? [];
  const valenceStyle = entry.valence ? VALENCE_STYLE[entry.valence] : null;

  return (
    <div className="sky-card flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-slate-900">{formatDate(entry.date)}</span>
        {valenceStyle && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${valenceStyle.bg} ${valenceStyle.text}`}
          >
            {valenceStyle.label}
          </span>
        )}
      </div>

      <ScoreBars entry={entry} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">
          {completedCount}/{totalHabits} habits
        </span>
        {themes.map((theme) => (
          <span
            key={theme}
            className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-sky-100"
          >
            {theme}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HistoryView() {
  const entries = useHistory(60);
  const totalHabits =
    useLiveQuery(
      () => db.habits.filter((h) => h.enabled).count(),
      []
    ) ?? 0;

  if (entries === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-center text-sm font-medium text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="section-hero relative overflow-hidden p-5 sm:p-7">
        <p className="text-sm font-extrabold text-sky-700">
          Past entries
        </p>
        <h1 className="display-font mt-1 text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
          History
        </h1>
        <p className="mt-2 max-w-xl text-base font-semibold text-slate-500">
          A soft trail of the days you have already shown up for.
        </p>
        <div className="cloud-rail" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="sky-card flex flex-col items-center justify-center gap-3 border-dashed py-16">
          <p className="text-base font-bold text-slate-500">No entries yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {entries.map((entry) => (
            <EntryCard key={entry.id ?? entry.date} entry={entry} totalHabits={totalHabits} />
          ))}
        </div>
      )}
    </div>
  );
}
