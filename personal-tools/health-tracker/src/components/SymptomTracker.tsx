import { format, parseISO, subDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db, todayKey } from '../lib/db';
import { buildHealthInsights } from '../lib/symptomInsights';
import type { CSSProperties, FormEvent } from 'react';
import type { InsightPriority, SymptomEntry, SymptomSummary } from '../lib/types';

interface SymptomForm {
  date: string;
  time: string;
  symptom: string;
  severity: number;
  notes: string;
  tags: string;
}

const PRIORITY_STYLE: Record<InsightPriority, string> = {
  info: 'bg-sky-50 text-sky-700 ring-sky-100',
  watch: 'bg-amber-50 text-amber-700 ring-amber-100',
  attention: 'bg-orange-50 text-orange-700 ring-orange-100',
  urgent: 'bg-rose-50 text-rose-700 ring-rose-100',
};

function todayTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function daysAgoKey(days: number): string {
  return subDays(new Date(), days).toISOString().slice(0, 10);
}

function defaultForm(): SymptomForm {
  return {
    date: todayKey(),
    time: todayTime(),
    symptom: '',
    severity: 5,
    notes: '',
    tags: '',
  };
}

function formatShortDate(date: string): string {
  try {
    return format(parseISO(date), 'MMM d');
  } catch {
    return date;
  }
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function averageSeverity(entries: SymptomEntry[]): string {
  if (entries.length === 0) return '--';
  const total = entries.reduce((sum, entry) => sum + entry.severity, 0);
  return (total / entries.length).toFixed(1);
}

function buildSummary(entries: SymptomEntry[]): SymptomSummary[] {
  const groups = new Map<string, SymptomEntry[]>();
  for (const entry of entries) {
    const key = entry.symptom.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return Array.from(groups.entries())
    .map(([symptom, group]) => ({
      symptom,
      count: group.length,
      avgSeverity: Number(
        (group.reduce((sum, entry) => sum + entry.severity, 0) / group.length).toFixed(1)
      ),
    }))
    .sort((a, b) => b.count - a.count || b.avgSeverity - a.avgSeverity);
}

function displaySymptom(symptom: string): string {
  return symptom
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 19V5M4 19h16M8 16l3-4 4 2 5-8" />
        </svg>
      </div>
      <div>
        <dt className="metric-label text-sm font-extrabold text-slate-600">{label}</dt>
        <dd className="metric-value display-font mt-1 text-2xl font-black leading-none text-slate-950">
          {value}
        </dd>
        <p className="metric-helper mt-1 text-xs font-bold text-slate-400">{helper}</p>
      </div>
    </article>
  );
}

function SymptomRow({ entry, onDelete }: { entry: SymptomEntry; onDelete: (id: number) => void }) {
  const barWidth = `${Math.max(4, entry.severity * 10)}%`;

  return (
    <article className="sky-card grid gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">{displaySymptom(entry.symptom)}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {formatShortDate(entry.date)}
            {entry.time ? ` at ${entry.time}` : ''}
          </p>
        </div>
        {entry.id !== undefined && (
          <button
            type="button"
            onClick={() => onDelete(entry.id as number)}
            className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-100"
            aria-label={`Delete ${entry.symptom}`}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M8 6V4h8v2M9 10v8M15 10v8M5 6l1 16h12l1-16" />
            </svg>
          </button>
        )}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs font-black text-slate-500">
          <span>Severity</span>
          <span>{entry.severity}/10</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-rose-500" style={{ width: barWidth }} />
        </div>
      </div>

      {entry.notes && <p className="text-sm font-semibold text-slate-600">{entry.notes}</p>}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <span key={tag} className="theme-chip">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export function SymptomTracker() {
  const [form, setForm] = useState<SymptomForm>(defaultForm);
  const [range, setRange] = useState({ from: daysAgoKey(14), to: todayKey() });
  const [saving, setSaving] = useState(false);

  const allSymptoms = useLiveQuery(() => db.symptoms.orderBy('date').reverse().toArray(), []) ?? [];
  const entries = useMemo(
    () =>
      allSymptoms
        .filter((entry) => entry.date >= range.from && entry.date <= range.to)
        .sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`)),
    [allSymptoms, range.from, range.to]
  );
  const summary = useMemo(() => buildSummary(entries), [entries]);
  const insights = useMemo(() => buildHealthInsights([...entries].reverse()), [entries]);
  const severityStyle = {
    '--range-color': '#e11d48',
    '--range-progress': `${form.severity * 10}%`,
  } as CSSProperties;

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const symptom = form.symptom.trim();
    if (!symptom) return;

    try {
      setSaving(true);
      const now = Date.now();
      await db.symptoms.add({
        date: form.date,
        time: form.time || null,
        symptom,
        severity: form.severity,
        notes: form.notes.trim(),
        tags: parseTags(form.tags),
        createdAt: now,
        updatedAt: now,
      });
      setForm(defaultForm());
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    await db.symptoms.delete(id);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-6 lg:py-8">
      <header className="section-hero relative overflow-hidden p-5 sm:p-7">
        <p className="text-sm font-extrabold text-sky-700">Symptom log</p>
        <h1 className="display-font mt-1 text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
          Symptoms
        </h1>
        <p className="mt-2 max-w-xl text-base font-semibold text-slate-500">
          Track symptoms, severity, timing, and likely triggers beside the rest of your health data.
        </p>
        <div className="cloud-rail" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard label="Entries" value={String(entries.length)} helper="In selected range" />
        <MetricCard label="Average" value={averageSeverity(entries)} helper="Severity score" />
        <MetricCard
          label="High"
          value={String(entries.filter((entry) => entry.severity >= 8).length)}
          helper="8/10 or above"
        />
      </dl>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[0.9fr_1.2fr_0.9fr]">
        <form className="sky-card grid gap-4 p-5" onSubmit={(event) => void handleSave(event)}>
          <div>
            <h2 className="text-xl font-black text-slate-900">Log a symptom</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Record what happened and what might have contributed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm font-black text-slate-600">
              Date
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="field-input"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-600">
              Time
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                className="field-input"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-black text-slate-600">
            Symptom
            <input
              required
              value={form.symptom}
              onChange={(event) => setForm((current) => ({ ...current, symptom: event.target.value }))}
              placeholder="Headache, nausea, fatigue"
              className="field-input"
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-600">
            Severity: {form.severity}/10
            <input
              min="0"
              max="10"
              type="range"
              value={form.severity}
              onChange={(event) =>
                setForm((current) => ({ ...current, severity: Number(event.target.value) }))
              }
              className="score-range"
              style={severityStyle}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-600">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Context, medication, meals, sleep, activity"
              className="field-input min-h-28 resize-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-600">
            Tags
            <input
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="sleep, stress, food"
              className="field-input"
            />
          </label>

          <button
            type="submit"
            disabled={saving || !form.symptom.trim()}
            className="rounded-full bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-900/10 disabled:opacity-50"
          >
            Save symptom
          </button>
        </form>

        <section className="grid gap-4">
          <div className="sky-card grid gap-3 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-600">
                From
                <input
                  type="date"
                  value={range.from}
                  onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
                  className="field-input"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-600">
                To
                <input
                  type="date"
                  value={range.to}
                  onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
                  className="field-input"
                />
              </label>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="sky-card flex min-h-56 flex-col items-center justify-center gap-3 border-dashed p-8 text-center">
              <p className="text-base font-black text-slate-700">No symptoms in this range.</p>
              <p className="max-w-md text-sm font-semibold text-slate-500">
                Add a symptom when something changes. A few entries are enough to start spotting
                repeated timing, trigger, or severity patterns.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {entries.map((entry) => (
                <SymptomRow
                  key={entry.id ?? `${entry.date}-${entry.createdAt}`}
                  entry={entry}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="grid gap-4">
          <section className="sky-card p-5">
            <h2 className="text-xl font-black text-slate-900">Top symptoms</h2>
            <div className="mt-4 grid gap-3">
              {summary.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">No summary yet.</p>
              ) : (
                summary.slice(0, 6).map((item) => (
                  <div key={item.symptom}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="font-black text-slate-800">{displaySymptom(item.symptom)}</span>
                      <span className="font-bold text-slate-500">
                        {item.count} logs, {item.avgSeverity}/10
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${Math.max(4, item.avgSeverity * 10)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="sky-card p-5">
            <h2 className="text-xl font-black text-slate-900">Pattern insights</h2>
            <p className="mt-2 rounded-2xl bg-sky-50 p-3 text-sm font-bold text-slate-600 ring-1 ring-sky-100">
              {insights.disclaimer}
            </p>
            <div className="mt-4 grid gap-3">
              {insights.insights.map((insight) => (
                <article key={insight.id} className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-100">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
                      PRIORITY_STYLE[insight.priority]
                    }`}
                  >
                    {insight.priority}
                  </span>
                  <h3 className="mt-2 text-sm font-black text-slate-900">{insight.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{insight.detail}</p>
                  {insight.evidence.length > 0 && (
                    <p className="mt-2 text-xs font-bold text-slate-400">{insight.evidence.join(' | ')}</p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="sky-card p-5">
            <h2 className="text-xl font-black text-slate-900">Appointment questions</h2>
            <ul className="mt-3 grid gap-2 pl-5 text-sm font-semibold text-slate-600">
              {insights.suggestedQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
