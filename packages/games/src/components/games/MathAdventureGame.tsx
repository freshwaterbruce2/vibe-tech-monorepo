import { Coins, Heart, Shield, Star, Timer, Zap } from 'lucide-react';
import type { LaneIndex } from './mathAdventureRunner';
import MathAdventureMobileControls from './MathAdventureMobileControls';
import MathAdventureSidebar from './MathAdventureSidebar';
import { formatTime, laneTop, LANE_LABELS, WORLD_WIDTH, PLAYER_X, type MathAdventureProps } from './mathAdventureUtils';
import { useMathAdventureGame } from './useMathAdventureGame';

export default function MathAdventureGame(props: MathAdventureProps) {
  const g = useMathAdventureGame(props);

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.26)_0%,rgba(34,211,238,0.16)_26%,rgba(15,23,42,0.95)_56%,#020617_100%)] pb-28 text-white md:pb-0"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:gap-5 md:px-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[28px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.72))] p-4 shadow-[0_30px_80px_-35px_rgba(139,92,246,0.48)] backdrop-blur">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">Math Runner</p>
                <h2 className="bg-gradient-to-r from-[#a78bfa] via-[#22d3ee] to-[#38bdf8] bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
                  Charge the lane. Spend it on motion.
                </h2>
              </div>
              <button onClick={g.onClose}
                className="glass-card rounded-full border border-[var(--glass-border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:scale-[1.02] hover:bg-white/10">
                Back to hub
              </button>
            </div>

            {/* Mobile HUD */}
            <div className="grid grid-cols-4 gap-2 xl:hidden">
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]"><Timer className="h-4 w-4" />Time</div>
                <div className="text-lg font-black">{formatTime(g.runnerState.remainingMs)}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]"><Heart className="h-4 w-4" />Hearts</div>
                <div className="flex gap-1.5">{[0, 1, 2].map((i) => <Heart key={i} className={`h-4 w-4 ${i < g.runnerState.hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`} />)}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]"><Zap className="h-4 w-4" />Boost</div>
                <div className="text-lg font-black text-[#a78bfa]">{g.runnerState.boostCharges}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]"><Star className="h-4 w-4" />Score</div>
                <div className="text-lg font-black text-[#a78bfa]">{g.runnerState.score}</div>
              </div>
            </div>

            <div className="glass-card mt-2 rounded-[20px] border border-[var(--glass-border)] px-3 py-2.5 xl:hidden">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="truncate font-semibold text-white">{g.runnerState.lastEvent}</p>
                <div className="flex items-center gap-1 text-amber-300"><Coins className="h-4 w-4" /><span className="font-black">{g.tokensCollected}</span></div>
              </div>
            </div>

            {/* Desktop HUD */}
            <div className="hidden gap-3 xl:grid xl:grid-cols-5">
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]"><Timer className="h-4 w-4" />Time</div>
                <div className="text-2xl font-black">{formatTime(g.runnerState.remainingMs)}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]"><Heart className="h-4 w-4" />Hearts</div>
                <div className="flex gap-2">{[0, 1, 2].map((i) => <Heart key={i} className={`h-5 w-5 ${i < g.runnerState.hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`} />)}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]"><Zap className="h-4 w-4" />Boost</div>
                <div className="text-2xl font-black text-[#a78bfa]">{g.runnerState.boostCharges}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]"><Star className="h-4 w-4" />Score</div>
                <div className="text-2xl font-black text-[#a78bfa]">{g.runnerState.score}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]"><Coins className="h-4 w-4" />Tokens</div>
                <div className="text-2xl font-black text-amber-300">{g.tokensCollected}</div>
              </div>
            </div>

            {/* Playfield */}
            <div className={`relative mt-4 overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.86))] p-3 transition ${g.impactFlash > 0 ? 'ring-2 ring-rose-400/70' : ''}`}>
              <div className="absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(circle at 20% 18%, rgba(167,139,250,0.26), transparent 24%), radial-gradient(circle at 80% 22%, rgba(244,114,182,0.18), transparent 22%), radial-gradient(circle at 50% 100%, rgba(34,211,238,0.12), transparent 26%), linear-gradient(180deg, rgba(15,23,42,0.2), rgba(2,6,23,0.95))' }} />
              <div className="pointer-events-none absolute inset-x-0 top-8 h-20 bg-repeat-x opacity-35"
                style={{ backgroundImage: 'linear-gradient(90deg, rgba(244,114,182,0.14) 0 16px, transparent 16px 80px)', backgroundPositionX: `${-g.runnerState.runDistance * 0.25 * g.motionIntensity}px` }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
                style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(11,15,34,0.42) 28%, rgba(10,14,29,0.9) 100%)' }} />

              <div className="relative h-[340px] overflow-hidden rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(8,47,73,0.25),rgba(15,23,42,0.08))] sm:h-[400px] xl:h-[420px]"
                onPointerCancel={g.clearPlayfieldGesture} onPointerDown={g.handlePlayfieldPointerDown} onPointerUp={g.handlePlayfieldPointerUp}
                style={{ touchAction: 'none' }}>
                {[0, 1, 2, 3].map((lane) => (
                  <div key={lane} className="absolute left-0 right-0 border-t border-dashed border-violet-200/10" style={{ top: laneTop(lane as LaneIndex) }} />
                ))}

                <div className="pointer-events-none absolute left-2 right-2 z-0 h-14 rounded-[20px] border border-cyan-300/15 bg-cyan-300/8 shadow-[0_0_0_1px_rgba(34,211,238,0.08)] transition sm:h-16"
                  style={{ top: `calc(${laneTop(g.playerLane)} - 4px)`, transition: g.animationSpeed === 'none' ? 'none' : 'top 120ms ease, opacity 120ms ease' }} />

                <div className="absolute bottom-6 left-0 right-0 h-20 opacity-90 sm:bottom-8 xl:bottom-10"
                  style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.05), rgba(15,23,42,0.15)), linear-gradient(90deg, rgba(15,23,42,0.9) 0 12px, rgba(167,139,250,0.08) 12px 24px)', backgroundPositionX: `${-g.runnerState.runDistance * g.motionIntensity}px`, backgroundSize: '96px 100%, 48px 100%' }} />

                {g.encounters.map((enc) => {
                  const left = `${(enc.x / WORLD_WIDTH) * 100}%`;
                  if (enc.kind === 'math') {
                    return (
                      <div key={enc.id} className="absolute bottom-6 w-[156px] sm:w-[168px] xl:bottom-10 xl:w-[180px]" style={{ left }}>
                        <div className="mb-3 rounded-2xl border border-violet-300/20 bg-slate-950/88 px-3 py-2 text-center shadow-lg shadow-violet-950/25">
                          <div className="text-[11px] uppercase tracking-[0.25em] text-violet-200/65">Math Gate</div>
                          <div className="mt-1 text-xl font-black sm:text-2xl">{enc.problem.prompt}</div>
                        </div>
                        <div className="relative h-[300px]">
                          {enc.problem.answerChoices.map((choice, lane) => (
                            <button type="button" key={`${enc.id}-${lane}`}
                              className={`absolute left-0 right-0 flex h-12 items-center justify-between rounded-2xl border px-3 font-black transition sm:h-14 sm:px-4 ${
                                g.playerLane === lane ? 'border-violet-200/70 bg-gradient-to-r from-violet-500/25 via-cyan-400/20 to-violet-500/25 text-white shadow-[0_0_0_1px_rgba(192,132,252,0.35)]' : 'border-white/10 bg-slate-900/80 text-slate-100 hover:border-violet-200/35'
                              }`}
                              style={{ top: laneTop(lane as LaneIndex) }}
                              onClick={() => g.selectLane(lane as LaneIndex)}>
                              <span className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{LANE_LABELS[lane]}</span>
                              <span className="text-xl sm:text-2xl">{choice}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={enc.id} className="absolute w-24 sm:w-28" style={{ left, top: `calc(${laneTop(enc.lane)} + 8px)` }}>
                      {enc.requiredAction === 'jump' ? (
                        <div className="rounded-[24px] border border-cyan-200/20 bg-gradient-to-b from-slate-900/92 via-slate-900/80 to-violet-950/45 px-3 py-3 shadow-[0_18px_35px_-20px_rgba(34,211,238,0.55)]">
                          <div className="mb-2 flex items-center justify-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" /><span className="h-1.5 w-10 rounded-full bg-cyan-300/35" /><span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" /></div>
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-3 gap-1"><span className="h-3 rounded-md bg-gradient-to-br from-cyan-200/75 to-cyan-400/45" /><span className="h-3 rounded-md bg-gradient-to-br from-cyan-200/80 to-violet-400/45" /><span className="h-3 rounded-md bg-gradient-to-br from-cyan-200/75 to-cyan-400/45" /></div>
                            <div className="grid grid-cols-2 gap-1.5 px-1"><span className="h-3.5 rounded-md bg-gradient-to-br from-cyan-100/75 to-cyan-400/40" /><span className="h-3.5 rounded-md bg-gradient-to-br from-cyan-100/75 to-cyan-400/40" /></div>
                            <div className="h-4 rounded-xl bg-gradient-to-r from-cyan-200/85 via-violet-300/55 to-cyan-200/85" />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-violet-200/25 bg-gradient-to-b from-slate-950/92 via-violet-950/40 to-slate-900/88 px-3 py-3 shadow-[0_18px_35px_-20px_rgba(244,114,182,0.72)]">
                          <div className="flex h-16 items-stretch justify-between gap-2">
                            <div className="w-4 rounded-full bg-gradient-to-b from-violet-300/95 via-violet-500/70 to-violet-500/80 shadow-[0_0_20px_rgba(244,114,182,0.45)]" />
                            <div className="flex-1 rounded-[18px] border border-violet-300/35 bg-[linear-gradient(90deg,rgba(244,114,182,0.08),rgba(255,255,255,0.02),rgba(244,114,182,0.08))]" />
                            <div className="w-4 rounded-full bg-gradient-to-b from-violet-300/95 via-violet-500/70 to-violet-500/80 shadow-[0_0_20px_rgba(244,114,182,0.45)]" />
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-violet-400/20 via-violet-200/70 to-violet-400/20" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Player avatar */}
                <div className="absolute z-10" style={{
                  left: `${(PLAYER_X / WORLD_WIDTH) * 100}%`,
                  top: `calc(${laneTop(g.playerLane)} - ${g.playerLift}px)`,
                  transition: g.animationSpeed === 'none' ? 'none' : g.animationSpeed === 'reduced' ? 'top 80ms linear' : 'top 120ms ease, transform 120ms ease',
                }}>
                  <div className="relative">
                    <div className={`absolute left-3 top-16 h-4 w-16 rounded-full bg-violet-400/30 blur-md ${g.activeAction?.type === 'dash' ? 'scale-125' : ''}`} />
                    <div className={`relative flex h-14 w-16 items-center justify-center rounded-[22px] border text-white shadow-[0_15px_40px_-22px_rgba(139,92,246,0.95)] ${
                      g.activeAction?.type === 'dash' ? 'border-violet-300/70 bg-gradient-to-r from-violet-500/80 to-violet-400/75'
                        : g.activeAction?.type === 'jump' ? 'border-cyan-300/70 bg-gradient-to-r from-cyan-500/80 to-violet-400/75'
                        : 'border-violet-300/70 bg-gradient-to-r from-violet-500/85 to-cyan-400/70'
                    }`}>
                      <Shield className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {/* Game over overlay */}
                {g.runnerState.isGameOver && (
                  <div className="absolute inset-0 z-20 overflow-y-auto bg-slate-950/80 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-6">
                    <div className="mx-auto w-full max-w-md rounded-[30px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))] p-5 text-center shadow-[0_30px_80px_-30px_rgba(139,92,246,0.6)] sm:p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-secondary)]">Run Summary</p>
                      <h3 className="mt-2 text-2xl font-black sm:text-3xl">{g.runnerState.hearts > 0 ? 'Run Complete' : 'Take Another Shot'}</h3>
                      <p className="mt-3 text-sm text-slate-300">{g.runnerState.lastEvent}</p>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3"><div className="text-xs uppercase tracking-[0.24em] text-slate-400">Score</div><div className="mt-1 text-2xl font-black">{g.runnerState.score}</div></div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3"><div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tokens</div><div className="mt-1 text-2xl font-black text-amber-300">{g.tokensCollected}</div></div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3"><div className="text-xs uppercase tracking-[0.24em] text-slate-400">Accuracy</div><div className="mt-1 text-2xl font-black">{g.accuracy}%</div></div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3"><div className="text-xs uppercase tracking-[0.24em] text-slate-400">Best Streak</div><div className="mt-1 text-2xl font-black">{g.runnerState.streak}</div></div>
                      </div>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button onClick={g.resetRun} className="min-h-[56px] flex-1 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#22d3ee] to-[#38bdf8] px-4 py-3 font-black text-slate-950 transition hover:brightness-110">Run Again</button>
                        <button onClick={g.onClose} className="glass-card min-h-[56px] flex-1 rounded-full border border-[var(--glass-border)] px-4 py-3 font-semibold text-white transition hover:bg-white/10">Collect Rewards</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <MathAdventureSidebar lastEvent={g.runnerState.lastEvent} accuracy={g.accuracy} speedMph={g.speedMph}
            tokensCollected={g.tokensCollected} moveLane={g.moveLane} triggerAction={g.triggerAction} />
        </div>
      </div>

      {!g.runnerState.isGameOver && (
        <MathAdventureMobileControls playerLane={g.playerLane} boostCharges={g.runnerState.boostCharges}
          hasBoostCharge={g.hasBoostCharge} upcomingMathGate={g.upcomingMathGate} upcomingObstacle={g.upcomingObstacle}
          selectLane={g.selectLane} triggerAction={g.triggerAction} />
      )}
    </div>
  );
}
