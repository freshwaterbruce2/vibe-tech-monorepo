export type MathRunnerDifficulty = 'easy' | 'medium' | 'hard';
export type LaneIndex = 0 | 1 | 2 | 3;
export type RunnerAction = 'jump' | 'dash';
export type AnimationSpeed = 'none' | 'reduced' | 'normal';

export interface MathRunnerProblem {
  answer: number;
  answerChoices: [number, number, number, number];
  correctLane: LaneIndex;
  difficulty: MathRunnerDifficulty;
  id: string;
  prompt: string;
}

export interface MathRunnerState {
  boostCharges: number;
  correctAnswers: number;
  hearts: number;
  isGameOver: boolean;
  lastEvent: string;
  obstacleClears: number;
  remainingMs: number;
  runDistance: number;
  score: number;
  slowdownMs: number;
  speed: number;
  streak: number;
  wrongAnswers: number;
}

export interface MathRunnerResolution {
  isCorrect: boolean;
  state: MathRunnerState;
  tokenDelta: number;
}

export const RUNNER_LANE_COUNT = 4;
export const RUNNER_SESSION_MS = 90_000;
export const BOOST_ACTION_DURATIONS: Record<RunnerAction, number> = {
  dash: 450,
  jump: 650,
};

const BASE_RUN_SPEED = 210;
const MAX_RUN_SPEED = 340;
const INITIAL_HEARTS = 3;
const MAX_BOOST_CHARGES = 3;
const MATH_SLOWDOWN_MS = 1_200;
const OBSTACLE_SLOWDOWN_MS = 900;
const SLOWDOWN_FACTOR = 0.68;
const ENCOUNTER_SPAWN_INTERVALS_MS: Record<MathRunnerDifficulty, number> = {
  easy: 3_200,
  medium: 2_750,
  hard: 2_350,
};
const ENCOUNTER_RECOVERY_BUFFERS_MS: Record<MathRunnerDifficulty, number> = {
  easy: 1_100,
  medium: 900,
  hard: 700,
};

function clamp(value: number, min: number, max: number): number {
  return globalThis.Math.min(globalThis.Math.max(value, min), max);
}

function toLaneIndex(value: number): LaneIndex {
  return clamp(globalThis.Math.floor(value), 0, RUNNER_LANE_COUNT - 1) as LaneIndex;
}

function buildPrompt(num1: number, num2: number, operation: '+' | '-' | 'x' | '/'): string {
  if (operation === 'x') {
    return `${num1} x ${num2}`;
  }

  if (operation === '/') {
    return `${num1} / ${num2}`;
  }

  return `${num1} ${operation} ${num2}`;
}

function createDistractor(
  answer: number,
  difficulty: MathRunnerDifficulty,
  rng: () => number,
  seed: number,
): number {
  const variance = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 12;
  const offset = globalThis.Math.round((rng() - 0.5) * variance * 2) + seed;
  const candidate = answer + offset;

  if (candidate <= 0 || candidate === answer) {
    return globalThis.Math.max(1, answer + seed + 1);
  }

  return candidate;
}

/** Create a new runner session state. */
export function createInitialMathRunnerState(): MathRunnerState {
  return {
    boostCharges: 0,
    correctAnswers: 0,
    hearts: INITIAL_HEARTS,
    isGameOver: false,
    lastEvent: 'Pick the correct lane to charge jump or dash.',
    obstacleClears: 0,
    remainingMs: RUNNER_SESSION_MS,
    runDistance: 0,
    score: 0,
    slowdownMs: 0,
    speed: BASE_RUN_SPEED,
    streak: 0,
    wrongAnswers: 0,
  };
}

/** Choose difficulty based on session progress. */
export function getDifficultyForProgress(progressRatio: number): MathRunnerDifficulty {
  if (progressRatio < 0.35) {
    return 'easy';
  }

  if (progressRatio < 0.75) {
    return 'medium';
  }

  return 'hard';
}

/** Return the encounter cadence for the current point in the run. */
export function getEncounterSpawnIntervalMs(progressRatio: number): number {
  return ENCOUNTER_SPAWN_INTERVALS_MS[getDifficultyForProgress(progressRatio)];
}

/** Return the extra breathing room after resolving a gate or obstacle. */
export function getEncounterRecoveryBufferMs(progressRatio: number): number {
  return ENCOUNTER_RECOVERY_BUFFERS_MS[getDifficultyForProgress(progressRatio)];
}

/** Build a math problem for a four-lane runner gate. */
export function createMathRunnerProblem(
  difficulty: MathRunnerDifficulty,
  rng: () => number = globalThis.Math.random,
): MathRunnerProblem {
  let num1 = 0;
  let num2 = 0;
  let answer = 0;
  let operation: '+' | '-' | 'x' | '/' = '+';

  const operationPool: Record<MathRunnerDifficulty, Array<'+' | '-' | 'x' | '/'>> = {
    easy: ['+', '-'],
    hard: ['+', '-', 'x', '/'],
    medium: ['+', '-', 'x'],
  };

  const selectedOperation =
    operationPool[difficulty][toLaneIndex(rng() * operationPool[difficulty].length)] ?? '+';
  operation = selectedOperation;

  if (difficulty === 'easy') {
    num1 = globalThis.Math.floor(rng() * 10) + 2;
    num2 = globalThis.Math.floor(rng() * 8) + 1;
  } else if (difficulty === 'medium') {
    num1 = globalThis.Math.floor(rng() * 18) + 4;
    num2 = globalThis.Math.floor(rng() * 10) + 2;
  } else {
    num1 = globalThis.Math.floor(rng() * 30) + 8;
    num2 = globalThis.Math.floor(rng() * 12) + 2;
  }

  switch (operation) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      if (num2 > num1) {
        [num1, num2] = [num2, num1];
      }
      answer = num1 - num2;
      break;
    case 'x':
      answer = num1 * num2;
      break;
    case '/':
      answer = globalThis.Math.floor(rng() * 10) + 2;
      num2 = globalThis.Math.floor(rng() * 8) + 2;
      num1 = answer * num2;
      break;
  }

  const correctLane = toLaneIndex(rng() * RUNNER_LANE_COUNT);
  const distractors: number[] = [];
  let attempts = 0;

  while (distractors.length < RUNNER_LANE_COUNT - 1 && attempts < 24) {
    attempts += 1;
    const candidate = createDistractor(answer, difficulty, rng, distractors.length + attempts);
    if (candidate !== answer && !distractors.includes(candidate)) {
      distractors.push(candidate);
    }
  }

  while (distractors.length < RUNNER_LANE_COUNT - 1) {
    const fallback = answer + distractors.length + 2;
    if (!distractors.includes(fallback)) {
      distractors.push(fallback);
    }
  }

  const answerChoices = [0, 0, 0, 0] as [number, number, number, number];
  let distractorIndex = 0;

  for (let lane = 0; lane < RUNNER_LANE_COUNT; lane += 1) {
    answerChoices[lane as LaneIndex] =
      lane === correctLane ? answer : distractors[distractorIndex++] ?? answer + lane + 1;
  }

  return {
    answer,
    answerChoices,
    correctLane,
    difficulty,
    id: `${difficulty}-${num1}-${num2}-${answer}-${globalThis.Math.round(rng() * 10_000)}`,
    prompt: buildPrompt(num1, num2, operation),
  };
}

/** Return the effective runner speed, including temporary slowdown effects. */
export function getRunnerSpeed(state: MathRunnerState): number {
  if (state.isGameOver) {
    return 0;
  }

  return state.speed * (state.slowdownMs > 0 ? SLOWDOWN_FACTOR : 1);
}

/** Convert sensory animation preference into a visual motion multiplier. */
export function getMotionIntensity(animationSpeed: AnimationSpeed): number {
  if (animationSpeed === 'none') {
    return 0;
  }

  if (animationSpeed === 'reduced') {
    return 0.35;
  }

  return 1;
}

/** Spend one boost charge to trigger a jump or dash. */
export function consumeBoostCharge(state: MathRunnerState): {
  consumed: boolean;
  state: MathRunnerState;
} {
  if (state.boostCharges <= 0 || state.isGameOver) {
    return {
      consumed: false,
      state: {
        ...state,
        lastEvent: 'Answer a gate correctly to charge jump or dash.',
      },
    };
  }

  return {
    consumed: true,
    state: {
      ...state,
      boostCharges: state.boostCharges - 1,
    },
  };
}

/** Resolve a player crossing an answer gate. */
export function resolveMathLaneChoice(
  state: MathRunnerState,
  problem: MathRunnerProblem,
  selectedLane: LaneIndex,
): MathRunnerResolution {
  if (state.isGameOver) {
    return { isCorrect: false, state, tokenDelta: 0 };
  }

  if (selectedLane === problem.correctLane) {
    const streak = state.streak + 1;
    const basePoints =
      problem.difficulty === 'easy' ? 100 : problem.difficulty === 'medium' ? 140 : 185;
    const tokenDelta = clamp(2 + globalThis.Math.floor(streak / 2), 2, 5);

    return {
      isCorrect: true,
      state: {
        ...state,
        boostCharges: clamp(state.boostCharges + 1, 0, MAX_BOOST_CHARGES),
        correctAnswers: state.correctAnswers + 1,
        lastEvent: `Correct lane for ${problem.prompt}. Boost charged.`,
        score: state.score + basePoints + state.streak * 20,
        speed: clamp(state.speed + 10, BASE_RUN_SPEED, MAX_RUN_SPEED),
        streak,
      },
      tokenDelta,
    };
  }

  const hearts = state.hearts - 1;

  return {
    isCorrect: false,
    state: {
      ...state,
      hearts,
      isGameOver: hearts <= 0 || state.remainingMs <= 0,
      lastEvent: `Wrong lane. ${problem.prompt} = ${problem.answer}.`,
      slowdownMs: MATH_SLOWDOWN_MS,
      speed: clamp(state.speed - 12, BASE_RUN_SPEED, MAX_RUN_SPEED),
      streak: 0,
      wrongAnswers: state.wrongAnswers + 1,
    },
    tokenDelta: 0,
  };
}

/** Resolve whether the player avoided a jump or dash obstacle. */
export function resolveObstacleHit(
  state: MathRunnerState,
  didEvade: boolean,
  requiredAction: RunnerAction,
): MathRunnerResolution {
  if (state.isGameOver) {
    return { isCorrect: false, state, tokenDelta: 0 };
  }

  if (didEvade) {
    return {
      isCorrect: true,
      state: {
        ...state,
        lastEvent: `Clean ${requiredAction}. Keep moving.`,
        obstacleClears: state.obstacleClears + 1,
        score: state.score + 55,
      },
      tokenDelta: 1,
    };
  }

  const hearts = state.hearts - 1;

  return {
    isCorrect: false,
    state: {
      ...state,
      hearts,
      isGameOver: hearts <= 0 || state.remainingMs <= 0,
      lastEvent:
        requiredAction === 'jump'
          ? 'Barrier hit. Jump sooner.'
          : 'Gate clipped you. Dash sooner.',
      slowdownMs: OBSTACLE_SLOWDOWN_MS,
      streak: 0,
      wrongAnswers: state.wrongAnswers + 1,
    },
    tokenDelta: 0,
  };
}

/** Advance the runner clock and ongoing slowdown state. */
export function tickMathRunner(state: MathRunnerState, deltaMs: number): MathRunnerState {
  if (state.isGameOver) {
    return state;
  }

  const remainingMs = globalThis.Math.max(0, state.remainingMs - deltaMs);
  const slowdownMs = globalThis.Math.max(0, state.slowdownMs - deltaMs);
  const nextState: MathRunnerState = {
    ...state,
    isGameOver: state.hearts <= 0 || remainingMs <= 0,
    remainingMs,
    runDistance: state.runDistance + getRunnerSpeed(state) * (deltaMs / 1000),
    slowdownMs,
  };

  return nextState;
}
