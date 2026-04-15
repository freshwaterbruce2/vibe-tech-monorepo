import { ArrowDown, ArrowUp, Sparkles } from 'lucide-react';

interface MathAdventureSidebarProps {
  lastEvent: string;
  accuracy: number;
  speedMph: number;
  tokensCollected: number;
  moveLane: (direction: -1 | 1) => void;
  triggerAction: (type: 'jump' | 'dash') => void;
}

export default function MathAdventureSidebar({
  lastEvent,
  accuracy,
  speedMph,
  moveLane,
  triggerAction,
}: MathAdventureSidebarProps) {
  return (
    <aside className="hidden flex-col gap-3 rounded-[28px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.7))] p-4 shadow-[0_24px_60px_-30px_rgba(139,92,246,0.42)] backdrop-blur md:flex">
      <div className="glass-card rounded-[24px] border border-[var(--glass-border)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">Mission Feed</p>
        <p className="mt-3 text-lg font-bold text-white">{lastEvent}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="glass-card rounded-2xl border border-[var(--glass-border)] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Accuracy</div>
            <div className="mt-1 text-xl font-black text-[#a78bfa]">{accuracy}%</div>
          </div>
          <div className="glass-card rounded-2xl border border-[var(--glass-border)] p-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Speed</div>
            <div className="mt-1 text-xl font-black text-[#22d3ee]">{speedMph}x</div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[var(--glass-border)] bg-gradient-to-br from-violet-500/10 via-cyan-500/8 to-violet-500/12 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">Controls</p>
        <div className="mt-3 grid gap-3 text-sm text-slate-200">
          <div className="glass-card rounded-2xl border border-[var(--glass-border)] p-3">
            <div className="font-semibold">Move lanes</div>
            <div className="text-[var(--text-secondary)]">Arrow keys, tap the answer rail, or tap a lane in the field</div>
          </div>
          <div className="glass-card rounded-2xl border border-[var(--glass-border)] p-3">
            <div className="font-semibold">Jump</div>
            <div className="text-[var(--text-secondary)]">Press Space or tap Jump</div>
          </div>
          <div className="glass-card rounded-2xl border border-[var(--glass-border)] p-3">
            <div className="font-semibold">Dash</div>
            <div className="text-[var(--text-secondary)]">Press Shift or tap Dash</div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-amber-300/15 bg-amber-300/8 p-4">
        <div className="flex items-center gap-2 text-amber-200">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/75">Strategy</p>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-amber-50/90">
          <li>Correct lanes charge your next jump or dash.</li>
          <li>Wrong answers cost a heart and kill momentum.</li>
          <li>Jump clears barriers. Dash slips through neon gates.</li>
        </ul>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <button onClick={() => moveLane(-1)}
          className="glass-card flex items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] px-4 py-3 font-semibold text-white transition hover:scale-[1.02] hover:bg-white/10">
          <ArrowUp className="h-4 w-4" /> Up
        </button>
        <button onClick={() => moveLane(1)}
          className="glass-card flex items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] px-4 py-3 font-semibold text-white transition hover:scale-[1.02] hover:bg-white/10">
          <ArrowDown className="h-4 w-4" /> Down
        </button>
        <button onClick={() => triggerAction('jump')}
          className="rounded-full bg-gradient-to-r from-[#22d3ee] to-[#a78bfa] px-4 py-3 font-black text-slate-950 transition hover:brightness-110">
          Jump
        </button>
        <button onClick={() => triggerAction('dash')}
          className="rounded-full bg-gradient-to-r from-[#38bdf8] to-[#a78bfa] px-4 py-3 font-black text-slate-950 transition hover:brightness-110">
          Dash
        </button>
      </div>
    </aside>
  );
}
