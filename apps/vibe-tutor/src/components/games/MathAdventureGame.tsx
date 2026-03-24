import confetti from 'canvas-confetti';
import {
  ArrowDown,
  ArrowUp,
  Coins,
  Heart,
  Shield,
  Sparkles,
  Star,
  Timer,
  Zap,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { SensoryPreferences } from '../../types';
import { useGameAudio } from '../../hooks/useGameAudio';
import { appStore } from '../../utils/electronStore';
import {
  BOOST_ACTION_DURATIONS,
  consumeBoostCharge,
  createInitialMathRunnerState,
  createMathRunnerProblem,
  getEncounterRecoveryBufferMs,
  getEncounterSpawnIntervalMs,
  getDifficultyForProgress,
  getMotionIntensity,
  getRunnerSpeed,
  resolveMathLaneChoice,
  resolveObstacleHit,
  RUNNER_SESSION_MS,
  tickMathRunner,
  type AnimationSpeed,
  type LaneIndex,
  type MathRunnerDifficulty,
  type MathRunnerProblem,
  type MathRunnerState,
  type RunnerAction,
} from './mathAdventureRunner';

interface MathAdventureProps {
  onClose?: () => void;
  onEarnTokens?: (amount: number) => void;
}

interface ActiveAction {
  remainingMs: number;
  type: RunnerAction;
}

interface MathGateEncounter {
  id: string;
  kind: 'math';
  problem: MathRunnerProblem;
  resolved: boolean;
  x: number;
}

interface ObstacleEncounter {
  id: string;
  kind: 'obstacle';
  lane: LaneIndex;
  requiredAction: RunnerAction;
  resolved: boolean;
  x: number;
}

type Encounter = MathGateEncounter | ObstacleEncounter;

const WORLD_WIDTH = 960;
const PLAYER_X = 220;
const SPAWN_X = 900;
const ENCOUNTER_DESPAWN_X = -140;
const FRAME_LIMIT_MS = 40;
const ACTION_REWARD_TOKEN = 1;
const LANE_LABELS = ['A', 'B', 'C', 'D'] as const;
const PLAYFIELD_SWIPE_THRESHOLD_PX = 24;
const PLAYFIELD_SWIPE_DOMINANCE_PX = 12;

function isAnimationSpeed(value: unknown): value is AnimationSpeed {
  return value === 'normal' || value === 'reduced' || value === 'none';
}

function getStoredAnimationSpeed(): AnimationSpeed {
  const rootValue = document.documentElement.getAttribute('data-animation-speed');
  if (isAnimationSpeed(rootValue)) {
    return rootValue;
  }

  const prefs = appStore.get<Partial<SensoryPreferences>>('sensory-prefs');
  if (isAnimationSpeed(prefs?.animationSpeed)) {
    return prefs.animationSpeed;
  }

  return 'normal';
}

function laneTop(lane: LaneIndex): string {
  return `${16 + lane * 18}%`;
}

function laneFromOffset(offsetY: number, height: number): LaneIndex {
  const boundedOffset = globalThis.Math.max(0, globalThis.Math.min(offsetY, height - 1));
  return globalThis.Math.floor((boundedOffset / height) * 4) as LaneIndex;
}

function formatTime(remainingMs: number): string {
  const totalSeconds = globalThis.Math.ceil(remainingMs / 1000);
  const minutes = globalThis.Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function accuracyFromState(state: MathRunnerState): number {
  const totalAnswers = state.correctAnswers + state.wrongAnswers;
  if (totalAnswers === 0) {
    return 100;
  }

  return globalThis.Math.round((state.correctAnswers / totalAnswers) * 100);
}

function actionVerb(action: RunnerAction): string {
  return action === 'jump' ? 'Jump' : 'Dash';
}

function buildEncounter(kind: 'math' | 'obstacle', difficulty: MathRunnerDifficulty): Encounter {
  if (kind === 'math') {
    return {
      id: `math-${Date.now()}-${globalThis.Math.round(globalThis.Math.random() * 10_000)}`,
      kind: 'math',
      problem: createMathRunnerProblem(difficulty),
      resolved: false,
      x: SPAWN_X,
    };
  }

  return {
    id: `obstacle-${Date.now()}-${globalThis.Math.round(globalThis.Math.random() * 10_000)}`,
    kind: 'obstacle',
    lane: globalThis.Math.floor(globalThis.Math.random() * 4) as LaneIndex,
    requiredAction: globalThis.Math.random() > 0.5 ? 'jump' : 'dash',
    resolved: false,
    x: SPAWN_X,
  };
}

export default function MathAdventureGame({ onClose, onEarnTokens }: MathAdventureProps) {
  const { playSound } = useGameAudio();
  const [runnerState, setRunnerState] = useState<MathRunnerState>(() => createInitialMathRunnerState());
  const [playerLane, setPlayerLane] = useState<LaneIndex>(1);
  const [encounters, setEncounters] = useState<Encounter[]>(() => [
    buildEncounter('math', getDifficultyForProgress(0)),
  ]);
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>(() => getStoredAnimationSpeed());
  const [tokensCollected, setTokensCollected] = useState(0);
  const [impactFlash, setImpactFlash] = useState(0);

  const runnerStateRef = useRef(runnerState);
  const playerLaneRef = useRef(playerLane);
  const encountersRef = useRef(encounters);
  const activeActionRef = useRef(activeAction);
  const spawnAccumulatorRef = useRef(0);
  const spawnRecoveryBufferRef = useRef(0);
  const nextSpawnKindRef = useRef<'math' | 'obstacle'>('obstacle');
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const playfieldGestureRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    runnerStateRef.current = runnerState;
  }, [runnerState]);

  useEffect(() => {
    playerLaneRef.current = playerLane;
  }, [playerLane]);

  useEffect(() => {
    encountersRef.current = encounters;
  }, [encounters]);

  useEffect(() => {
    activeActionRef.current = activeAction;
  }, [activeAction]);

  useEffect(() => {
    const root = document.documentElement;
    const syncAnimationSpeed = () => setAnimationSpeed(getStoredAnimationSpeed());

    syncAnimationSpeed();

    const observer = new MutationObserver(syncAnimationSpeed);
    observer.observe(root, {
      attributeFilter: ['data-animation-speed'],
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  const moveLane = useCallback((direction: -1 | 1) => {
    setPlayerLane((current) => {
      const nextLane = globalThis.Math.max(0, globalThis.Math.min(3, current + direction));
      return nextLane as LaneIndex;
    });
  }, []);

  const selectLane = useCallback((lane: LaneIndex) => {
    setPlayerLane(lane);
  }, []);

  const awardTokens = useEffectEvent((amount: number) => {
    if (amount <= 0) {
      return;
    }

    setTokensCollected((current) => current + amount);
    onEarnTokens?.(amount);
  });

  const triggerAction = useCallback((type: RunnerAction) => {
    const boostResult = consumeBoostCharge(runnerStateRef.current);
    if (!boostResult.consumed) {
      runnerStateRef.current = boostResult.state;
      setRunnerState(boostResult.state);
      playSound('error');
      return;
    }

    runnerStateRef.current = {
      ...boostResult.state,
      lastEvent: `${actionVerb(type)} ready.`,
    };
    setRunnerState(runnerStateRef.current);
    setActiveAction({
      remainingMs: BOOST_ACTION_DURATIONS[type],
      type,
    });
    playSound('pop');
  }, [playSound]);

  const resetRun = useCallback(() => {
    const freshState = createInitialMathRunnerState();
    const nextEncounters = [buildEncounter('math', getDifficultyForProgress(0))];

    spawnAccumulatorRef.current = 0;
    spawnRecoveryBufferRef.current = 0;
    nextSpawnKindRef.current = 'obstacle';
    lastFrameRef.current = null;
    runnerStateRef.current = freshState;
    encountersRef.current = nextEncounters;
    activeActionRef.current = null;
    playerLaneRef.current = 1;

    setRunnerState(freshState);
    setEncounters(nextEncounters);
    setActiveAction(null);
    setPlayerLane(1);
    setImpactFlash(0);
  }, []);

  const handlePlayfieldPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      return;
    }

    playfieldGestureRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const handlePlayfieldPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' || runnerStateRef.current.isGameOver) {
        playfieldGestureRef.current = null;
        return;
      }

      const bounds = event.currentTarget.getBoundingClientRect();
      const start = playfieldGestureRef.current;
      playfieldGestureRef.current = null;
      const nextLane = laneFromOffset(event.clientY - bounds.top, bounds.height);

      if (!start) {
        selectLane(nextLane);
        return;
      }

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;

      if (
        globalThis.Math.abs(deltaY) >= PLAYFIELD_SWIPE_THRESHOLD_PX &&
        globalThis.Math.abs(deltaY) > globalThis.Math.abs(deltaX) + PLAYFIELD_SWIPE_DOMINANCE_PX
      ) {
        moveLane(deltaY < 0 ? -1 : 1);
        return;
      }

      selectLane(nextLane);
    },
    [moveLane, selectLane],
  );

  const clearPlayfieldGesture = useCallback(() => {
    playfieldGestureRef.current = null;
  }, []);

  const stepFrame = useEffectEvent((deltaMs: number) => {
    const allowConfetti = animationSpeed === 'normal';
    const allowImpactFlash = animationSpeed !== 'none';
    let nextState = tickMathRunner(runnerStateRef.current, deltaMs);
    let nextAction = activeActionRef.current;
    let flash = impactFlash;

    const commitFrame = (
      state: MathRunnerState,
      nextFrameEncounters: Encounter[],
      action: ActiveAction | null,
      nextFlash: number,
    ) => {
      runnerStateRef.current = state;
      encountersRef.current = nextFrameEncounters;
      activeActionRef.current = action;

      setRunnerState(state);
      setEncounters(nextFrameEncounters);
      setActiveAction(action);
      setImpactFlash(nextFlash);
    };

    if (nextAction) {
      const remainingMs = globalThis.Math.max(0, nextAction.remainingMs - deltaMs);
      nextAction = remainingMs > 0 ? { ...nextAction, remainingMs } : null;
    }

    if (flash > 0) {
      flash = globalThis.Math.max(0, flash - deltaMs);
    }

    if (nextState.isGameOver) {
      if (!runnerStateRef.current.isGameOver) {
        playSound(nextState.hearts > 0 ? 'victory' : 'error');
        if (allowConfetti && tokensCollected > 0) {
          void confetti({
            colors: ['#22d3ee', '#facc15', '#fb7185'],
            origin: { y: 0.5 },
            particleCount: 90,
            spread: 70,
          });
        }
      }

      commitFrame(nextState, encountersRef.current, nextAction, 0);
      return;
    }

    const progress = 1 - nextState.remainingMs / RUNNER_SESSION_MS;
    const difficulty = getDifficultyForProgress(progress);
    const spawnIntervalMs = getEncounterSpawnIntervalMs(progress);
    const speed = getRunnerSpeed(nextState);

    spawnAccumulatorRef.current += deltaMs;
    spawnRecoveryBufferRef.current = globalThis.Math.max(0, spawnRecoveryBufferRef.current - deltaMs);
    let nextEncounters = encountersRef.current.map((encounter) => ({
      ...encounter,
      x: encounter.x - speed * (deltaMs / 1000),
    }));

    if (
      !nextState.isGameOver &&
      spawnRecoveryBufferRef.current <= 0 &&
      spawnAccumulatorRef.current >= spawnIntervalMs
    ) {
      spawnAccumulatorRef.current -= spawnIntervalMs;
      nextEncounters = [
        ...nextEncounters,
        buildEncounter(nextSpawnKindRef.current, difficulty),
      ];
      nextSpawnKindRef.current = nextSpawnKindRef.current === 'math' ? 'obstacle' : 'math';
    }

    for (const encounter of nextEncounters) {
      if (encounter.resolved || encounter.x > PLAYER_X) {
        continue;
      }

      if (encounter.kind === 'math') {
        const result = resolveMathLaneChoice(
          nextState,
          encounter.problem,
          playerLaneRef.current,
        );
        nextState = result.state;
        encounter.resolved = true;
        spawnRecoveryBufferRef.current = globalThis.Math.max(
          spawnRecoveryBufferRef.current,
          getEncounterRecoveryBufferMs(progress),
        );

        if (result.isCorrect) {
          playSound('success');
          awardTokens(result.tokenDelta);
          if (allowConfetti && result.state.streak > 0 && result.state.streak % 5 === 0) {
            void confetti({
              colors: ['#38bdf8', '#facc15', '#22c55e'],
              origin: { x: 0.55, y: 0.3 },
              particleCount: 70,
              spread: 55,
            });
          }
        } else {
          playSound('error');
          flash = allowImpactFlash ? (animationSpeed === 'reduced' ? 120 : 220) : 0;
        }

        if (nextState.isGameOver) {
          break;
        }
        continue;
      }

      const laneCollision = encounter.lane === playerLaneRef.current;
      if (!laneCollision) {
        encounter.resolved = true;
        continue;
      }

      const didEvade = nextAction?.type === encounter.requiredAction;
      const result = resolveObstacleHit(nextState, didEvade, encounter.requiredAction);
      nextState = result.state;
      encounter.resolved = true;
      spawnRecoveryBufferRef.current = globalThis.Math.max(
        spawnRecoveryBufferRef.current,
        getEncounterRecoveryBufferMs(progress),
      );

      if (didEvade) {
        playSound('pop');
        awardTokens(ACTION_REWARD_TOKEN);
      } else {
        playSound('error');
        flash = allowImpactFlash ? (animationSpeed === 'reduced' ? 120 : 220) : 0;
      }

      if (nextState.isGameOver) {
        break;
      }
    }

    nextEncounters = nextEncounters.filter((encounter) => encounter.x > ENCOUNTER_DESPAWN_X);

    if (nextState.isGameOver && !runnerStateRef.current.isGameOver) {
      playSound(nextState.hearts > 0 ? 'victory' : 'error');
      if (allowConfetti && tokensCollected > 0) {
        void confetti({
          colors: ['#22d3ee', '#facc15', '#fb7185'],
          origin: { y: 0.5 },
          particleCount: 90,
          spread: 70,
        });
      }
    }

    commitFrame(nextState, nextEncounters, nextAction, flash);
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (runnerStateRef.current.isGameOver) {
        return;
      }

      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault();
        moveLane(-1);
      } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault();
        moveLane(1);
      } else if (event.key === ' ' || event.key.toLowerCase() === 'j') {
        event.preventDefault();
        triggerAction('jump');
      } else if (event.key === 'Shift' || event.key.toLowerCase() === 'k') {
        event.preventDefault();
        triggerAction('dash');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLane, triggerAction]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      lastFrameRef.current ??= timestamp;

      const deltaMs = globalThis.Math.min(timestamp - lastFrameRef.current, FRAME_LIMIT_MS);
      lastFrameRef.current = timestamp;
      stepFrame(deltaMs);
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const accuracy = useMemo(() => accuracyFromState(runnerState), [runnerState]);
  const motionIntensity = useMemo(() => getMotionIntensity(animationSpeed), [animationSpeed]);
  const speedMph = useMemo(
    () => globalThis.Math.round((getRunnerSpeed(runnerState) / 24) * 10) / 10,
    [runnerState],
  );
  const playerLift = useMemo(() => {
    const jumpLift = animationSpeed === 'none' ? 0 : animationSpeed === 'reduced' ? 18 : 36;
    const dashLift = animationSpeed === 'none' ? 0 : animationSpeed === 'reduced' ? 4 : 10;

    if (activeAction?.type === 'jump') {
      return jumpLift;
    }

    if (activeAction?.type === 'dash') {
      return dashLift;
    }

    return 0;
  }, [activeAction, animationSpeed]);
  const hasBoostCharge = runnerState.boostCharges > 0;
  const upcomingEncounter = useMemo(() => {
    let nextEncounter: Encounter | null = null;

    for (const encounter of encounters) {
      if (encounter.resolved) {
        continue;
      }

      if (nextEncounter === null || encounter.x < nextEncounter.x) {
        nextEncounter = encounter;
      }
    }

    return nextEncounter;
  }, [encounters]);
  const upcomingMathGate = upcomingEncounter?.kind === 'math' ? upcomingEncounter : null;
  const upcomingObstacle = upcomingEncounter?.kind === 'obstacle' ? upcomingEncounter : null;

  return (
    <div
      className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.26)_0%,rgba(34,211,238,0.16)_26%,rgba(15,23,42,0.95)_56%,#020617_100%)] pb-28 text-white md:pb-0"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
    >
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:gap-5 md:px-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[28px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.72))] p-4 shadow-[0_30px_80px_-35px_rgba(139,92,246,0.48)] backdrop-blur">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                  Math Runner
                </p>
                <h2 className="bg-gradient-to-r from-[#a78bfa] via-[#22d3ee] to-[#f472b6] bg-clip-text text-2xl font-black tracking-tight text-transparent md:text-3xl">
                  Charge the lane. Spend it on motion.
                </h2>
              </div>
              <button
                onClick={onClose}
                className="glass-card rounded-full border border-[var(--glass-border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:scale-[1.02] hover:bg-white/10"
              >
                Back to hub
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 xl:hidden">
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  <Timer className="h-4 w-4" />
                  Time
                </div>
                <div className="text-lg font-black">{formatTime(runnerState.remainingMs)}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  <Heart className="h-4 w-4" />
                  Hearts
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((index) => (
                    <Heart
                      key={index}
                      className={`h-4 w-4 ${
                        index < runnerState.hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  <Zap className="h-4 w-4" />
                  Boost
                </div>
                <div className="text-lg font-black text-[#a78bfa]">{runnerState.boostCharges}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-2 py-2.5">
                <div className="mb-1 flex items-center gap-1 text-[9px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  <Star className="h-4 w-4" />
                  Score
                </div>
                <div className="text-lg font-black text-[#a78bfa]">{runnerState.score}</div>
              </div>
            </div>

            <div className="glass-card mt-2 rounded-[20px] border border-[var(--glass-border)] px-3 py-2.5 xl:hidden">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="truncate font-semibold text-white">{runnerState.lastEvent}</p>
                <div className="flex items-center gap-1 text-amber-300">
                  <Coins className="h-4 w-4" />
                  <span className="font-black">{tokensCollected}</span>
                </div>
              </div>
            </div>

            <div className="hidden gap-3 xl:grid xl:grid-cols-5">
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <Timer className="h-4 w-4" />
                  Time
                </div>
                <div className="text-2xl font-black">{formatTime(runnerState.remainingMs)}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <Heart className="h-4 w-4" />
                  Hearts
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((index) => (
                    <Heart
                      key={index}
                      className={`h-5 w-5 ${
                        index < runnerState.hearts
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <Zap className="h-4 w-4" />
                  Boost
                </div>
                <div className="text-2xl font-black text-[#a78bfa]">{runnerState.boostCharges}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <Star className="h-4 w-4" />
                  Score
                </div>
                <div className="text-2xl font-black text-[#a78bfa]">{runnerState.score}</div>
              </div>
              <div className="glass-card rounded-2xl border border-[var(--glass-border)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <Coins className="h-4 w-4" />
                  Tokens
                </div>
                <div className="text-2xl font-black text-amber-300">{tokensCollected}</div>
              </div>
            </div>

            <div
              className={`relative mt-4 overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.86))] p-3 transition ${
                impactFlash > 0 ? 'ring-2 ring-rose-400/70' : ''
              }`}
            >
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 18%, rgba(167,139,250,0.26), transparent 24%), radial-gradient(circle at 80% 22%, rgba(244,114,182,0.18), transparent 22%), radial-gradient(circle at 50% 100%, rgba(34,211,238,0.12), transparent 26%), linear-gradient(180deg, rgba(15,23,42,0.2), rgba(2,6,23,0.95))',
                }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-8 h-20 bg-repeat-x opacity-35"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, rgba(244,114,182,0.14) 0 16px, transparent 16px 80px)',
                  backgroundPositionX: `${-runnerState.runDistance * 0.25 * motionIntensity}px`,
                }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(11,15,34,0.42) 28%, rgba(10,14,29,0.9) 100%)',
                }}
              />
              <div
                className="relative h-[340px] overflow-hidden rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(8,47,73,0.25),rgba(15,23,42,0.08))] sm:h-[400px] xl:h-[420px]"
                onPointerCancel={clearPlayfieldGesture}
                onPointerDown={handlePlayfieldPointerDown}
                onPointerUp={handlePlayfieldPointerUp}
                style={{ touchAction: 'none' }}
              >
                {[0, 1, 2, 3].map((lane) => (
                  <div
                    key={lane}
                    className="absolute left-0 right-0 border-t border-dashed border-fuchsia-200/10"
                    style={{ top: laneTop(lane as LaneIndex) }}
                  />
                ))}

                <div
                  className="pointer-events-none absolute left-2 right-2 z-0 h-14 rounded-[20px] border border-cyan-300/15 bg-cyan-300/8 shadow-[0_0_0_1px_rgba(34,211,238,0.08)] transition sm:h-16"
                  style={{
                    top: `calc(${laneTop(playerLane)} - 4px)`,
                    transition:
                      animationSpeed === 'none' ? 'none' : 'top 120ms ease, opacity 120ms ease',
                  }}
                />

                <div
                  className="absolute bottom-6 left-0 right-0 h-20 opacity-90 sm:bottom-8 xl:bottom-10"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(15,23,42,0.05), rgba(15,23,42,0.15)), linear-gradient(90deg, rgba(15,23,42,0.9) 0 12px, rgba(167,139,250,0.08) 12px 24px)',
                    backgroundPositionX: `${-runnerState.runDistance * motionIntensity}px`,
                    backgroundSize: '96px 100%, 48px 100%',
                  }}
                />

                {encounters.map((encounter) => {
                  const left = `${(encounter.x / WORLD_WIDTH) * 100}%`;

                  if (encounter.kind === 'math') {
                    return (
                      <div
                        key={encounter.id}
                        className="absolute bottom-6 w-[156px] sm:w-[168px] xl:bottom-10 xl:w-[180px]"
                        style={{ left }}
                      >
                        <div className="mb-3 rounded-2xl border border-fuchsia-300/20 bg-slate-950/88 px-3 py-2 text-center shadow-lg shadow-fuchsia-950/25">
                          <div className="text-[11px] uppercase tracking-[0.25em] text-fuchsia-200/65">
                            Math Gate
                          </div>
                          <div className="mt-1 text-xl font-black sm:text-2xl">{encounter.problem.prompt}</div>
                        </div>
                        <div className="relative h-[300px]">
                          {encounter.problem.answerChoices.map((choice, lane) => {
                            const isPlayerLane = playerLane === lane;
                            return (
                              <button
                                type="button"
                                key={`${encounter.id}-${lane}`}
                                className={`absolute left-0 right-0 flex h-12 items-center justify-between rounded-2xl border px-3 font-black transition sm:h-14 sm:px-4 ${
                                  isPlayerLane
                                    ? 'border-fuchsia-200/70 bg-gradient-to-r from-violet-500/25 via-cyan-400/20 to-fuchsia-500/25 text-white shadow-[0_0_0_1px_rgba(192,132,252,0.35)]'
                                    : 'border-white/10 bg-slate-900/80 text-slate-100 hover:border-fuchsia-200/35'
                                }`}
                                style={{ top: laneTop(lane as LaneIndex) }}
                                onClick={() => selectLane(lane as LaneIndex)}
                              >
                                <span className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                                  {LANE_LABELS[lane]}
                                </span>
                                <span className="text-xl sm:text-2xl">{choice}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={encounter.id}
                      className="absolute w-24 sm:w-28"
                      style={{
                        left,
                        top: `calc(${laneTop(encounter.lane)} + 8px)`,
                      }}
                    >
                      {encounter.requiredAction === 'jump' ? (
                        <div className="rounded-[24px] border border-cyan-200/20 bg-gradient-to-b from-slate-900/92 via-slate-900/80 to-violet-950/45 px-3 py-3 shadow-[0_18px_35px_-20px_rgba(34,211,238,0.55)]">
                          <div className="mb-2 flex items-center justify-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                            <span className="h-1.5 w-10 rounded-full bg-cyan-300/35" />
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-3 gap-1">
                              <span className="h-3 rounded-md bg-gradient-to-br from-cyan-200/75 to-cyan-400/45" />
                              <span className="h-3 rounded-md bg-gradient-to-br from-cyan-200/80 to-violet-400/45" />
                              <span className="h-3 rounded-md bg-gradient-to-br from-cyan-200/75 to-cyan-400/45" />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 px-1">
                              <span className="h-3.5 rounded-md bg-gradient-to-br from-cyan-100/75 to-cyan-400/40" />
                              <span className="h-3.5 rounded-md bg-gradient-to-br from-cyan-100/75 to-cyan-400/40" />
                            </div>
                            <div className="h-4 rounded-xl bg-gradient-to-r from-cyan-200/85 via-violet-300/55 to-cyan-200/85" />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-fuchsia-200/25 bg-gradient-to-b from-slate-950/92 via-fuchsia-950/40 to-slate-900/88 px-3 py-3 shadow-[0_18px_35px_-20px_rgba(244,114,182,0.72)]">
                          <div className="flex h-16 items-stretch justify-between gap-2">
                            <div className="w-4 rounded-full bg-gradient-to-b from-fuchsia-300/95 via-fuchsia-500/70 to-violet-500/80 shadow-[0_0_20px_rgba(244,114,182,0.45)]" />
                            <div className="flex-1 rounded-[18px] border border-fuchsia-300/35 bg-[linear-gradient(90deg,rgba(244,114,182,0.08),rgba(255,255,255,0.02),rgba(244,114,182,0.08))]" />
                            <div className="w-4 rounded-full bg-gradient-to-b from-fuchsia-300/95 via-fuchsia-500/70 to-violet-500/80 shadow-[0_0_20px_rgba(244,114,182,0.45)]" />
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-fuchsia-400/20 via-fuchsia-200/70 to-fuchsia-400/20" />
                        </div>
                      )}
                    </div>
                  );
                })}

                <div
                  className="absolute z-10"
                  style={{
                    left: `${(PLAYER_X / WORLD_WIDTH) * 100}%`,
                    top: `calc(${laneTop(playerLane)} - ${playerLift}px)`,
                    transition:
                      animationSpeed === 'none'
                        ? 'none'
                        : animationSpeed === 'reduced'
                          ? 'top 80ms linear'
                          : 'top 120ms ease, transform 120ms ease',
                  }}
                >
                  <div className="relative">
                    <div
                      className={`absolute left-3 top-16 h-4 w-16 rounded-full bg-violet-400/30 blur-md ${
                        activeAction?.type === 'dash' ? 'scale-125' : ''
                      }`}
                    />
                    <div
                      className={`relative flex h-14 w-16 items-center justify-center rounded-[22px] border text-white shadow-[0_15px_40px_-22px_rgba(139,92,246,0.95)] ${
                        activeAction?.type === 'dash'
                          ? 'border-fuchsia-300/70 bg-gradient-to-r from-fuchsia-500/80 to-violet-400/75'
                          : activeAction?.type === 'jump'
                            ? 'border-cyan-300/70 bg-gradient-to-r from-cyan-500/80 to-violet-400/75'
                            : 'border-violet-300/70 bg-gradient-to-r from-violet-500/85 to-cyan-400/70'
                      }`}
                    >
                      <Shield className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                {runnerState.isGameOver && (
                  <div className="absolute inset-0 z-20 overflow-y-auto bg-slate-950/80 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-6">
                    <div className="mx-auto w-full max-w-md rounded-[30px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))] p-5 text-center shadow-[0_30px_80px_-30px_rgba(139,92,246,0.6)] sm:p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-secondary)]">
                        Run Summary
                      </p>
                      <h3 className="mt-2 text-2xl font-black sm:text-3xl">
                        {runnerState.hearts > 0 ? 'Run Complete' : 'Take Another Shot'}
                      </h3>
                      <p className="mt-3 text-sm text-slate-300">{runnerState.lastEvent}</p>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Score</div>
                          <div className="mt-1 text-2xl font-black">{runnerState.score}</div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tokens</div>
                          <div className="mt-1 text-2xl font-black text-amber-300">
                            {tokensCollected}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Accuracy</div>
                          <div className="mt-1 text-2xl font-black">{accuracy}%</div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Best Streak</div>
                          <div className="mt-1 text-2xl font-black">{runnerState.streak}</div>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={resetRun}
                          className="min-h-[56px] flex-1 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#22d3ee] to-[#f472b6] px-4 py-3 font-black text-slate-950 transition hover:brightness-110"
                        >
                          Run Again
                        </button>
                        <button
                          onClick={onClose}
                          className="glass-card min-h-[56px] flex-1 rounded-full border border-[var(--glass-border)] px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                        >
                          Collect Rewards
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="hidden flex-col gap-3 rounded-[28px] border border-[var(--glass-border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.7))] p-4 shadow-[0_24px_60px_-30px_rgba(139,92,246,0.42)] backdrop-blur md:flex">
            <div className="glass-card rounded-[24px] border border-[var(--glass-border)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                Mission Feed
              </p>
              <p className="mt-3 text-lg font-bold text-white">{runnerState.lastEvent}</p>
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

            <div className="rounded-[24px] border border-[var(--glass-border)] bg-gradient-to-br from-violet-500/10 via-cyan-500/8 to-fuchsia-500/12 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                Controls
              </p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/75">
                  Strategy
                </p>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-amber-50/90">
                <li>Correct lanes charge your next jump or dash.</li>
                <li>Wrong answers cost a heart and kill momentum.</li>
                <li>Jump clears barriers. Dash slips through neon gates.</li>
              </ul>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3">
              <button
                onClick={() => moveLane(-1)}
                className="glass-card flex items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] px-4 py-3 font-semibold text-white transition hover:scale-[1.02] hover:bg-white/10"
              >
                <ArrowUp className="h-4 w-4" />
                Up
              </button>
              <button
                onClick={() => moveLane(1)}
                className="glass-card flex items-center justify-center gap-2 rounded-full border border-[var(--glass-border)] px-4 py-3 font-semibold text-white transition hover:scale-[1.02] hover:bg-white/10"
              >
                <ArrowDown className="h-4 w-4" />
                Down
              </button>
              <button
                onClick={() => triggerAction('jump')}
                className="rounded-full bg-gradient-to-r from-[#22d3ee] to-[#a78bfa] px-4 py-3 font-black text-slate-950 transition hover:brightness-110"
              >
                Jump
              </button>
              <button
                onClick={() => triggerAction('dash')}
                className="rounded-full bg-gradient-to-r from-[#f472b6] to-[#a78bfa] px-4 py-3 font-black text-slate-950 transition hover:brightness-110"
              >
                Dash
              </button>
            </div>
          </aside>
        </div>
      </div>

      {!runnerState.isGameOver && (
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
              <span className="font-semibold text-[#f472b6]">
                {upcomingMathGate ? `Lane ${LANE_LABELS[playerLane]}` : `Boost ${runnerState.boostCharges}`}
              </span>
            </div>
            {upcomingMathGate ? (
              <div className="grid grid-cols-4 gap-2">
                {upcomingMathGate.problem.answerChoices.map((choice, lane) => {
                  const isSelectedLane = playerLane === lane;

                  return (
                    <button
                      type="button"
                      key={`mobile-answer-${upcomingMathGate.id}-${lane}`}
                      onClick={() => selectLane(lane as LaneIndex)}
                      className={`min-h-[60px] rounded-[20px] border px-2 py-2 text-center transition active:scale-95 ${
                        isSelectedLane
                          ? 'border-cyan-200/55 bg-gradient-to-br from-[#22d3ee] via-[#a78bfa] to-[#f472b6] text-slate-950 shadow-[0_14px_30px_-20px_rgba(34,211,238,0.95)]'
                          : 'glass-card border border-[var(--glass-border)] text-white'
                      }`}
                    >
                      <span
                        className={`block text-[10px] font-semibold uppercase tracking-[0.24em] ${
                          isSelectedLane ? 'text-slate-900/70' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {LANE_LABELS[lane]}
                      </span>
                      <span className="mt-1 block text-lg font-black">{choice}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => triggerAction('jump')}
                  className={`min-h-[58px] rounded-[20px] border px-4 py-2.5 text-left transition active:scale-95 ${
                    hasBoostCharge
                      ? 'border-cyan-200/35 bg-gradient-to-r from-[#22d3ee] to-[#a78bfa] text-slate-950'
                      : 'glass-card border border-[var(--glass-border)] text-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-[0.16em]">Jump</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
                        hasBoostCharge ? 'text-slate-900/75' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {hasBoostCharge ? 'Ready' : 'Charge first'}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => triggerAction('dash')}
                  className={`min-h-[58px] rounded-[20px] border px-4 py-2.5 text-left transition active:scale-95 ${
                    hasBoostCharge
                      ? 'border-fuchsia-200/35 bg-gradient-to-r from-[#f472b6] to-[#a78bfa] text-slate-950'
                      : 'glass-card border border-[var(--glass-border)] text-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-[0.16em]">Dash</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
                        hasBoostCharge ? 'text-slate-900/75' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {hasBoostCharge ? 'Ready' : 'Charge first'}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
