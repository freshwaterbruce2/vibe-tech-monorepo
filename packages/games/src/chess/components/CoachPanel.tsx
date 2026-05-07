import { Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import type { CoachFeedback, CoachHint } from '../lib/coach';

interface CoachPanelProps {
  feedback: CoachFeedback;
  hints?: CoachHint[];
  hintLevel: number;
  onHint: () => void;
  enabled: boolean;
  onToggle: () => void;
}

export function CoachPanel({ feedback, hints = [], hintLevel, onHint, enabled, onToggle }: CoachPanelProps) {
  const Icon = feedback.tone === 'warning' ? ShieldAlert : feedback.tone === 'good' ? Sparkles : Lightbulb;
  const toneClass = feedback.tone === 'warning'
    ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
    : feedback.tone === 'good'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
      : 'border-sky-500/20 bg-sky-500/10 text-sky-100';
  const activeHint = hints[Math.max(0, Math.min(hintLevel - 1, hints.length - 1))];

  return (
    <section className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={18} className="shrink-0" />
          <h3 className="truncate text-sm font-bold uppercase tracking-widest">{feedback.title}</h3>
        </div>
        <button
          onClick={onToggle}
          className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${
            enabled ? 'bg-white/15 text-white' : 'bg-black/20 text-slate-400'
          }`}
        >
          {enabled ? 'Coach On' : 'Coach Off'}
        </button>
      </div>

      {enabled && (
        <>
          <p className="text-sm font-medium leading-relaxed opacity-90">{feedback.message}</p>
          {activeHint && (
            <p className="mt-3 rounded-md bg-black/20 px-3 py-2 text-sm font-bold">
              Hint {activeHint.level}: {activeHint.text}
            </p>
          )}
          {hints.length > 0 && (
            <button
              onClick={onHint}
              className="mt-3 rounded-md bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/20"
            >
              {hintLevel === 0 ? 'Show Hint' : hintLevel < hints.length ? 'More Hint' : 'Hide Hints'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
