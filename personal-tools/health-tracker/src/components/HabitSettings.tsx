import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Dimension, HabitDefinition } from '../lib/types';

const DIMENSIONS: { key: Dimension; label: string; accent: string }[] = [
  { key: 'physical', label: 'Physical', accent: 'text-emerald-700' },
  { key: 'mental', label: 'Mental', accent: 'text-sky-700' },
  { key: 'emotional', label: 'Emotional', accent: 'text-rose-700' },
  { key: 'spiritual', label: 'Spiritual', accent: 'text-amber-700' },
];

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-200 ${
        enabled ? 'bg-sky-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function HabitGroup({
  dimension,
  habits,
}: {
  dimension: { key: Dimension; label: string; accent: string };
  habits: HabitDefinition[];
}) {
  const dimHabits = habits.filter((h) => h.dimension === dimension.key);

  if (dimHabits.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className={`text-sm font-extrabold ${dimension.accent}`}>
        {dimension.label}
      </h3>
      {dimHabits.map((h) => (
        <div
          key={h.id}
          className="sky-card flex items-center justify-between p-4"
        >
          <span
            className={`text-sm font-medium ${h.enabled ? 'text-slate-700' : 'text-slate-400'}`}
          >
            {h.label}
          </span>
          <ToggleSwitch
            enabled={h.enabled}
            onToggle={() => db.habits.update(h.id, { enabled: !h.enabled })}
          />
        </div>
      ))}
    </div>
  );
}

export function HabitSettings() {
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? [];

  const [label, setLabel] = useState('');
  const [dimension, setDimension] = useState<Dimension>('physical');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    await db.habits.add({
      id: crypto.randomUUID(),
      dimension,
      label: trimmed,
      enabled: true,
    });
    setLabel('');
    setDimension('physical');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 lg:py-8">
      <header className="section-hero relative overflow-hidden p-5 sm:p-7">
        <p className="text-sm font-extrabold text-sky-700">Customize your day</p>
        <h1 className="display-font mt-1 text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
          Habits
        </h1>
        <p className="mt-2 max-w-xl text-base font-semibold text-slate-500">
          Keep only the little rituals that make the day feel lighter.
        </p>
        <div className="cloud-rail" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {DIMENSIONS.map((dim) => (
          <HabitGroup key={dim.key} dimension={dim} habits={habits} />
        ))}
      </section>

      <section className="sky-card flex flex-col gap-3 p-4">
        <h2 className="text-sm font-extrabold text-slate-600">
          Add Habit
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Habit description"
            className="field-input"
          />
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value as Dimension)}
            className="field-input"
          >
            {DIMENSIONS.map((dim) => (
              <option key={dim.key} value={dim.key}>
                {dim.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!label.trim()}
            className="w-full rounded-2xl bg-sky-600 py-3.5 font-extrabold text-white shadow-lg shadow-sky-200/50 transition-colors hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            Add Habit
          </button>
        </form>
      </section>
    </div>
  );
}
