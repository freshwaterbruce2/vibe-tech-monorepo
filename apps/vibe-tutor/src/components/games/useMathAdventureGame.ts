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
  const pendingEncounterIdRef = useRef<string | null>(null);
  const failedEncounterIdRef = useRef<string | null>(null);

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

  const selectLane = useCallback((lane: LaneIndex) => {
    playerLaneRef.current = lane;
    setPlayerLane(lane);
    // A rejected gate stays in place; selecting a lane is the explicit retry gesture.
    failedEncounterIdRef.current = null;
  }, []);

  const awardEncounter = useEffectEvent(async (
    encounter: Encounter,
    amount: number,
    resolvedState: MathRunnerState,
    isMathGate: boolean,
  ) => {
    if (pendingEncounterIdRef.current || amount <= 0) return;
    pendingEncounterIdRef.current = encounter.id;
    let accepted = !onEarnTokens;
    try {
      accepted ||= await onEarnTokens!(amount, `math-adventure:${encounter.id}`);
    } catch {
      accepted = false;
    }
    pendingEncounterIdRef.current = null;
    if (!accepted) {
      failedEncounterIdRef.current = encounter.id;
      const retryable = { ...runnerStateRef.current, lastEvent: 'Token reward could not be saved. Choose a lane to retry this encounter.' };
      runnerStateRef.current = retryable;
      setRunnerState(retryable);
      return;
    }
    const settledEncounters = encountersRef.current.map((item) => item.id === encounter.id ? { ...item, resolved: true } : item);
    runnerStateRef.current = resolvedState;
    encountersRef.current = settledEncounters;
    setRunnerState(resolvedState);
    setEncounters(settledEncounters);
    setTokensCollected((current) => current + amount);
    playSound(isMathGate ? 'success' : 'pop');
  });

  const triggerAction = useCallback((type: RunnerAction) => {
    // Jump/dash is the explicit retry gesture for a rejected obstacle-clear award.
    failedEncounterIdRef.current = null;
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
    pendingEncounterIdRef.current = null;
    failedEncounterIdRef.current = null;
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
    // Do not let the runner move past a reward-bearing encounter until its ledger
    // mutation is settled. This intentionally freezes only the bounded encounter.
    if (pendingEncounterIdRef.current) return;
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
      if (failedEncounterIdRef.current === enc.id) {
        commit(runnerStateRef.current, encountersRef.current, activeActionRef.current, impactFlash);
        return;
      }
      if (enc.kind === 'math') {
        const result = resolveMathLaneChoice(nextState, enc.problem, playerLaneRef.current);
        if (result.isCorrect) {
          void awardEncounter(enc, result.tokenDelta, result.state, true);
          commit(runnerStateRef.current, encountersRef.current, activeActionRef.current, impactFlash);
          return;
        }
        nextState = result.state; enc.resolved = true;
        spawnRecoveryBufferRef.current = globalThis.Math.max(spawnRecoveryBufferRef.current, getEncounterRecoveryBufferMs(progress));
        playSound('error'); flash = allowFlash ? (animationSpeed === 'reduced' ? 120 : 220) : 0;
        if (nextState.isGameOver) break;
        continue;
      }
      const laneHit = enc.lane === playerLaneRef.current;
      if (!laneHit) { enc.resolved = true; continue; }
      const evaded = nextAction?.type === enc.requiredAction;
      const result = resolveObstacleHit(nextState, evaded, enc.requiredAction);
      if (evaded) {
        void awardEncounter(enc, ACTION_REWARD_TOKEN, result.state, false);
        commit(runnerStateRef.current, encountersRef.current, activeActionRef.current, impactFlash);
        return;
      }
      nextState = result.state; enc.resolved = true;
      spawnRecoveryBufferRef.current = globalThis.Math.max(spawnRecoveryBufferRef.current, getEncounterRecoveryBufferMs(progress));
      playSound('error'); flash = allowFlash ? (animationSpeed === 'reduced' ? 120 : 220) : 0;
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
