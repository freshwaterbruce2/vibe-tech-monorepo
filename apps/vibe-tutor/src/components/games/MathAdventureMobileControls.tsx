import type { LaneIndex } from './mathAdventureRunner';
import { actionVerb, LANE_LABELS, type MathGateEncounter, type ObstacleEncounter } from './mathAdventureUtils';

interface MathAdventureMobileControlsProps {
  playerLane: LaneIndex;
  boostCharges: number;
  hasBoostCharge: boolean;
  upcomingMathGate: MathGateEncounter | null;
  upcomingObstacle: ObstacleEncounter | null;
  selectLane: (lane: LaneIndex) => void;
  triggerAction: (type: 'jump' | 'dash') => void;
}

export default function MathAdventureMobileControls({
  playerLane,
  boostCharges,
  hasBoostCharge,
  upcomingMathGate,
  upcomingObstacle,
  selectLane,
  triggerAction,
}: MathAdventureMobileControlsProps) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 px-4 md:hidden">
      <div className="mx-auto max-w-md rounded-[26px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.88))] p-2.5 shadow-[0_24px_50px_-28px_rgba(139,92,246,0.95)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3 px-2 text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          <span>
            {upcomingMathGate
              ? `Solve ${upcomingMathGate.problem.prompt}`
              : upcomingObstacle
                ? `${actionVerb(upcomingObstacle.requiredAction)} ready`
                : 'Tap the answer rail or field to steer'}
          </span>
          <span className="font-semibold text-[#38bdf8]">
            {upcomingMathGate ? `Lane ${LANE_LABELS[playerLane]}` : `Boost ${boostCharges}`}
          </span>
        </div>
        {upcomingMathGate ? (
          <div className="grid grid-cols-4 gap-2">
            {upcomingMathGate.problem.answerChoices.map((choice, lane) => {
              const isSelected = playerLane === lane;
              return (
                <button type="button" key={`mobile-answer-${upcomingMathGate.id}-${lane}`}
                  onClick={() => selectLane(lane as LaneIndex)}
                  className={`min-h-[60px] rounded-[20px] border px-2 py-2 text-center transition active:scale-95 ${
                    isSelected
                      ? 'border-cyan-200/55 bg-gradient-to-br from-[#22d3ee] via-[#a78bfa] to-[#38bdf8] text-slate-950 shadow-[0_14px_30px_-20px_rgba(34,211,238,0.95)]'
                      : 'glass-card border border-[var(--glass-border)] text-white'
                  }`}>
                  <span className={`block text-[10px] font-semibold uppercase tracking-[0.24em] ${isSelected ? 'text-slate-900/70' : 'text-[var(--text-secondary)]'}`}>
                    {LANE_LABELS[lane]}
                  </span>
                  <span className="mt-1 block text-lg font-black">{choice}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => triggerAction('jump')}
              className={`min-h-[58px] rounded-[20px] border px-4 py-2.5 text-left transition active:scale-95 ${
                hasBoostCharge
                  ? 'border-cyan-200/35 bg-gradient-to-r from-[#22d3ee] to-[#a78bfa] text-slate-950'
                  : 'glass-card border border-[var(--glass-border)] text-white/70'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.16em]">Jump</span>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${hasBoostCharge ? 'text-slate-900/75' : 'text-[var(--text-secondary)]'}`}>
                  {hasBoostCharge ? 'Ready' : 'Charge first'}
                </span>
              </div>
            </button>
            <button onClick={() => triggerAction('dash')}
              className={`min-h-[58px] rounded-[20px] border px-4 py-2.5 text-left transition active:scale-95 ${
                hasBoostCharge
                  ? 'border-violet-200/35 bg-gradient-to-r from-[#38bdf8] to-[#a78bfa] text-slate-950'
                  : 'glass-card border border-[var(--glass-border)] text-white/70'
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-[0.16em]">Dash</span>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${hasBoostCharge ? 'text-slate-900/75' : 'text-[var(--text-secondary)]'}`}>
                  {hasBoostCharge ? 'Ready' : 'Charge first'}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
