import confetti from 'canvas-confetti';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useGameAudio } from '../../hooks/useGameAudio';
import type { AnimationSpeed, LaneIndex, MathRunnerState, RunnerAction } from './mathAdventureRunner';
import {
  BOOST_ACTION_DURATIONS,
  consumeBoostCharge,
  createInitialMathRunnerState,
  getDifficultyForProgress,
  getEncounterRecoveryBufferMs,
  getEncounterSpawnIntervalMs,
  getMotionIntensity,
  getRunnerSpeed,
  resolveMathLaneChoice,
  resolveObstacleHit,
  RUNNER_SESSION_MS,
  tickMathRunner,
} from './mathAdventureRunner';
import {
  ACTION_REWARD_TOKEN,
  actionVerb,
  buildEncounter,
  FRAME_LIMIT_MS,
  getStoredAnimationSpeed,
  laneFromOffset,
  PLAYFIELD_SWIPE_DOMINANCE_PX,
  PLAYFIELD_SWIPE_THRESHOLD_PX,
  type ActiveAction,
  type Encounter,
  type MathAdventureProps,
  ENCOUNTER_DESPAWN_X,
  PLAYER_X,
} from './mathAdventureUtils';
import { accuracyFromState } from './mathAdventureUtils';

export function useMathAdventureGame({ onClose, onEarnTokens }: MathAdventureProps) {
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

  useEffect(() => { runnerStateRef.current = runnerState; }, [runnerState]);
  useEffect(() => { playerLaneRef.current = playerLane; }, [playerLane]);
  useEffect(() => { encountersRef.current = encounters; }, [encounters]);
  useEffect(() => { activeActionRef.current = activeAction; }, [activeAction]);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setAnimationSpeed(getStoredAnimationSpeed());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributeFilter: ['data-animation-speed'], attributes: true });
    return () => observer.disconnect();
  }, []);

  const moveLane = useCallback((direction: -1 | 1) => {
    setPlayerLane((c) => globalThis.Math.max(0, globalThis.Math.min(3, c + direction)) as LaneIndex);
  }, []);

  const selectLane = useCallback((lane: LaneIndex) => { setPlayerLane(lane); }, []);

  const awardTokens = useEffectEvent((amount: number) => {
    if (amount <= 0) return;
    setTokensCollected((c) => c + amount);
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
    runnerStateRef.current = { ...boostResult.state, lastEvent: `${actionVerb(type)} ready.` };
    setRunnerState(runnerStateRef.current);
    setActiveAction({ remainingMs: BOOST_ACTION_DURATIONS[type], type });
    playSound('pop');
  }, [playSound]);

  const resetRun = useCallback(() => {
    const fresh = createInitialMathRunnerState();
    const nextEnc = [buildEncounter('math', getDifficultyForProgress(0))];
    spawnAccumulatorRef.current = 0;
    spawnRecoveryBufferRef.current = 0;
    nextSpawnKindRef.current = 'obstacle';
    lastFrameRef.current = null;
    runnerStateRef.current = fresh;
    encountersRef.current = nextEnc;
    activeActionRef.current = null;
    playerLaneRef.current = 1;
    setRunnerState(fresh);
    setEncounters(nextEnc);
    setActiveAction(null);
    setPlayerLane(1);
    setImpactFlash(0);
  }, []);

  const handlePlayfieldPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    playfieldGestureRef.current = { x: event.clientX, y: event.clientY };
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
      if (!start) { selectLane(nextLane); return; }
      const dX = event.clientX - start.x;
      const dY = event.clientY - start.y;
      if (globalThis.Math.abs(dY) >= PLAYFIELD_SWIPE_THRESHOLD_PX &&
          globalThis.Math.abs(dY) > globalThis.Math.abs(dX) + PLAYFIELD_SWIPE_DOMINANCE_PX) {
        moveLane(dY < 0 ? -1 : 1);
        return;
      }
      selectLane(nextLane);
    },
    [moveLane, selectLane],
  );

  const clearPlayfieldGesture = useCallback(() => { playfieldGestureRef.current = null; }, []);

  /* ---------- Main game loop ---------- */
  const stepFrame = useEffectEvent((deltaMs: number) => {
    const allowConfetti = animationSpeed === 'normal';
    const allowFlash = animationSpeed !== 'none';
    let nextState = tickMathRunner(runnerStateRef.current, deltaMs);
    let nextAction = activeActionRef.current;
    let flash = impactFlash;

    const commit = (s: MathRunnerState, enc: Encounter[], a: ActiveAction | null, f: number) => {
      runnerStateRef.current = s; encountersRef.current = enc; activeActionRef.current = a;
      setRunnerState(s); setEncounters(enc); setActiveAction(a); setImpactFlash(f);
    };

    if (nextAction) {
      const rem = globalThis.Math.max(0, nextAction.remainingMs - deltaMs);
      nextAction = rem > 0 ? { ...nextAction, remainingMs: rem } : null;
    }
    if (flash > 0) flash = globalThis.Math.max(0, flash - deltaMs);

    if (nextState.isGameOver) {
      if (!runnerStateRef.current.isGameOver) {
        playSound(nextState.hearts > 0 ? 'victory' : 'error');
        if (allowConfetti && tokensCollected > 0) void confetti({ colors: ['#22d3ee', '#facc15', '#fb7185'], origin: { y: 0.5 }, particleCount: 90, spread: 70 });
      }
      commit(nextState, encountersRef.current, nextAction, 0);
      return;
    }

    const progress = 1 - nextState.remainingMs / RUNNER_SESSION_MS;
    const difficulty = getDifficultyForProgress(progress);
    const spawnInterval = getEncounterSpawnIntervalMs(progress);
    const speed = getRunnerSpeed(nextState);
    spawnAccumulatorRef.current += deltaMs;
    spawnRecoveryBufferRef.current = globalThis.Math.max(0, spawnRecoveryBufferRef.current - deltaMs);
    let nextEnc = encountersRef.current.map((e) => ({ ...e, x: e.x - speed * (deltaMs / 1000) }));

    if (!nextState.isGameOver && spawnRecoveryBufferRef.current <= 0 && spawnAccumulatorRef.current >= spawnInterval) {
      spawnAccumulatorRef.current -= spawnInterval;
      nextEnc = [...nextEnc, buildEncounter(nextSpawnKindRef.current, difficulty)];
      nextSpawnKindRef.current = nextSpawnKindRef.current === 'math' ? 'obstacle' : 'math';
    }

    for (const enc of nextEnc) {
      if (enc.resolved || enc.x > PLAYER_X) continue;
      if (enc.kind === 'math') {
        const result = resolveMathLaneChoice(nextState, enc.problem, playerLaneRef.current);
        nextState = result.state; enc.resolved = true;
        spawnRecoveryBufferRef.current = globalThis.Math.max(spawnRecoveryBufferRef.current, getEncounterRecoveryBufferMs(progress));
        if (result.isCorrect) { playSound('success'); awardTokens(result.tokenDelta); if (allowConfetti && result.state.streak > 0 && result.state.streak % 5 === 0) void confetti({ colors: ['#38bdf8', '#facc15', '#c084fc'], origin: { x: 0.55, y: 0.3 }, particleCount: 70, spread: 55 }); }
        else { playSound('error'); flash = allowFlash ? (animationSpeed === 'reduced' ? 120 : 220) : 0; }
        if (nextState.isGameOver) break;
        continue;
      }
      const laneHit = enc.lane === playerLaneRef.current;
      if (!laneHit) { enc.resolved = true; continue; }
      const evaded = nextAction?.type === enc.requiredAction;
      const result = resolveObstacleHit(nextState, evaded, enc.requiredAction);
      nextState = result.state; enc.resolved = true;
      spawnRecoveryBufferRef.current = globalThis.Math.max(spawnRecoveryBufferRef.current, getEncounterRecoveryBufferMs(progress));
      if (evaded) { playSound('pop'); awardTokens(ACTION_REWARD_TOKEN); }
      else { playSound('error'); flash = allowFlash ? (animationSpeed === 'reduced' ? 120 : 220) : 0; }
      if (nextState.isGameOver) break;
    }

    nextEnc = nextEnc.filter((e) => e.x > ENCOUNTER_DESPAWN_X);
    if (nextState.isGameOver && !runnerStateRef.current.isGameOver) {
      playSound(nextState.hearts > 0 ? 'victory' : 'error');
      if (allowConfetti && tokensCollected > 0) void confetti({ colors: ['#22d3ee', '#facc15', '#fb7185'], origin: { y: 0.5 }, particleCount: 90, spread: 70 });
    }
    commit(nextState, nextEnc, nextAction, flash);
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (runnerStateRef.current.isGameOver) return;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') { e.preventDefault(); moveLane(-1); }
      else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') { e.preventDefault(); moveLane(1); }
      else if (e.key === ' ' || e.key.toLowerCase() === 'j') { e.preventDefault(); triggerAction('jump'); }
      else if (e.key === 'Shift' || e.key.toLowerCase() === 'k') { e.preventDefault(); triggerAction('dash'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveLane, triggerAction]);

  useEffect(() => {
    const animate = (ts: number) => {
      lastFrameRef.current ??= ts;
      const dt = globalThis.Math.min(ts - lastFrameRef.current, FRAME_LIMIT_MS);
      lastFrameRef.current = ts;
      stepFrame(dt);
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };
    animationFrameRef.current = window.requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current); };
  }, []);

  const accuracy = useMemo(() => accuracyFromState(runnerState), [runnerState]);
  const motionIntensity = useMemo(() => getMotionIntensity(animationSpeed), [animationSpeed]);
  const speedMph = useMemo(() => globalThis.Math.round((getRunnerSpeed(runnerState) / 24) * 10) / 10, [runnerState]);
  const playerLift = useMemo(() => {
    const jL = animationSpeed === 'none' ? 0 : animationSpeed === 'reduced' ? 18 : 36;
    const dL = animationSpeed === 'none' ? 0 : animationSpeed === 'reduced' ? 4 : 10;
    if (activeAction?.type === 'jump') return jL;
    if (activeAction?.type === 'dash') return dL;
    return 0;
  }, [activeAction, animationSpeed]);

  const hasBoostCharge = runnerState.boostCharges > 0;
  const upcomingEncounter = useMemo(() => {
    let next: Encounter | null = null;
    for (const e of encounters) { if (!e.resolved && (next === null || e.x < next.x)) next = e; }
    return next;
  }, [encounters]);
  const upcomingMathGate = upcomingEncounter?.kind === 'math' ? upcomingEncounter : null;
  const upcomingObstacle = upcomingEncounter?.kind === 'obstacle' ? upcomingEncounter : null;

  return {
    runnerState, playerLane, encounters, activeAction, animationSpeed,
    tokensCollected, impactFlash, accuracy, motionIntensity, speedMph,
    playerLift, hasBoostCharge, upcomingMathGate, upcomingObstacle,
    moveLane, selectLane, triggerAction, resetRun, onClose,
    handlePlayfieldPointerDown, handlePlayfieldPointerUp, clearPlayfieldGesture,
  };
}
