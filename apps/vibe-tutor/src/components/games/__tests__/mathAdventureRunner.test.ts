import {
  createInitialMathRunnerState,
  createMathRunnerProblem,
  getEncounterRecoveryBufferMs,
  getEncounterSpawnIntervalMs,
  getMotionIntensity,
  resolveMathLaneChoice,
  resolveObstacleHit,
  tickMathRunner,
} from '../mathAdventureRunner';

describe('mathAdventureRunner', () => {
  it('builds a problem with a valid correct lane and unique answer choices', () => {
    const problem = createMathRunnerProblem('easy', () => 0.2);

    expect(problem.correctLane).toBeGreaterThanOrEqual(0);
    expect(problem.correctLane).toBeLessThan(4);
    expect(problem.answerChoices).toHaveLength(4);
    expect(new Set(problem.answerChoices).size).toBe(4);
    expect(problem.answerChoices[problem.correctLane]).toBe(problem.answer);
  });

  it('rewards a correct lane choice with score, tokens, streak, and boost', () => {
    const initial = createInitialMathRunnerState();
    const problem = createMathRunnerProblem('medium', () => 0.25);

    const result = resolveMathLaneChoice(initial, problem, problem.correctLane);

    expect(result.isCorrect).toBe(true);
    expect(result.tokenDelta).toBeGreaterThan(0);
    expect(result.state.score).toBeGreaterThan(initial.score);
    expect(result.state.streak).toBe(1);
    expect(result.state.boostCharges).toBe(1);
    expect(result.state.hearts).toBe(initial.hearts);
  });

  it('damages and slows the runner on a wrong lane choice', () => {
    const initial = createInitialMathRunnerState();
    const problem = createMathRunnerProblem('easy', () => 0.15);
    const wrongLane = problem.correctLane === 0 ? 1 : 0;

    const result = resolveMathLaneChoice(initial, problem, wrongLane);

    expect(result.isCorrect).toBe(false);
    expect(result.tokenDelta).toBe(0);
    expect(result.state.hearts).toBe(initial.hearts - 1);
    expect(result.state.streak).toBe(0);
    expect(result.state.slowdownMs).toBeGreaterThan(0);
  });

  it('ends the run when time expires', () => {
    const initial = {
      ...createInitialMathRunnerState(),
      remainingMs: 300,
    };

    const result = tickMathRunner(initial, 400);

    expect(result.remainingMs).toBe(0);
    expect(result.isGameOver).toBe(true);
  });

  it('keeps game-over state frozen on later ticks', () => {
    const initial = {
      ...createInitialMathRunnerState(),
      isGameOver: true,
      lastEvent: 'Run complete.',
      remainingMs: 0,
      runDistance: 420,
      score: 880,
    };

    const result = tickMathRunner(initial, 1_000);

    expect(result).toEqual(initial);
  });

  it('damages the runner when an obstacle is not evaded', () => {
    const initial = createInitialMathRunnerState();

    const result = resolveObstacleHit(initial, false, 'jump');

    expect(result.state.hearts).toBe(initial.hearts - 1);
    expect(result.state.slowdownMs).toBeGreaterThan(0);
    expect(result.state.lastEvent).toMatch(/jump/i);
  });

  it('maps sensory animation settings to motion intensity', () => {
    expect(getMotionIntensity('normal')).toBe(1);
    expect(getMotionIntensity('reduced')).toBe(0.35);
    expect(getMotionIntensity('none')).toBe(0);
  });

  it('gives easier spacing earlier in the run and tightens gradually later', () => {
    expect(getEncounterSpawnIntervalMs(0)).toBeGreaterThan(getEncounterSpawnIntervalMs(0.5));
    expect(getEncounterSpawnIntervalMs(0.5)).toBeGreaterThan(getEncounterSpawnIntervalMs(0.9));
  });

  it('adds a recovery buffer after encounters, with more help early in the run', () => {
    expect(getEncounterRecoveryBufferMs(0)).toBeGreaterThan(getEncounterRecoveryBufferMs(0.5));
    expect(getEncounterRecoveryBufferMs(0.5)).toBeGreaterThan(getEncounterRecoveryBufferMs(0.9));
    expect(getEncounterRecoveryBufferMs(0)).toBeGreaterThan(0);
  });

  it('does not award tokens or mutate answers after game over', () => {
    const initial = {
      ...createInitialMathRunnerState(),
      isGameOver: true,
      lastEvent: 'Run complete.',
      remainingMs: 0,
    };
    const problem = createMathRunnerProblem('hard', () => 0.4);

    const result = resolveMathLaneChoice(initial, problem, problem.correctLane);

    expect(result.tokenDelta).toBe(0);
    expect(result.state).toEqual(initial);
  });
});
