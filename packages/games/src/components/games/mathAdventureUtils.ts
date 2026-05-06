import type { SensoryPreferences } from '../../types';
import { appStore } from '../../utils/electronStore';
import type {
  AnimationSpeed,
  LaneIndex,
  MathRunnerDifficulty,
  MathRunnerProblem,
  MathRunnerState,
  RunnerAction,
} from './mathAdventureRunner';
import { createMathRunnerProblem } from './mathAdventureRunner';

/* ---------- Types ---------- */
export interface MathAdventureProps {
  onClose?: () => void;
  onEarnTokens?: (amount: number) => void;
}

export interface ActiveAction {
  remainingMs: number;
  type: RunnerAction;
}

export interface MathGateEncounter {
  id: string;
  kind: 'math';
  problem: MathRunnerProblem;
  resolved: boolean;
  x: number;
}

export interface ObstacleEncounter {
  id: string;
  kind: 'obstacle';
  lane: LaneIndex;
  requiredAction: RunnerAction;
  resolved: boolean;
  x: number;
}

export type Encounter = MathGateEncounter | ObstacleEncounter;

/* ---------- Constants ---------- */
export const WORLD_WIDTH = 960;
export const PLAYER_X = 220;
export const SPAWN_X = 900;
export const ENCOUNTER_DESPAWN_X = -140;
export const FRAME_LIMIT_MS = 40;
export const ACTION_REWARD_TOKEN = 1;
export const LANE_LABELS = ['A', 'B', 'C', 'D'] as const;
export const PLAYFIELD_SWIPE_THRESHOLD_PX = 24;
export const PLAYFIELD_SWIPE_DOMINANCE_PX = 12;

/* ---------- Helpers ---------- */
export function isAnimationSpeed(value: unknown): value is AnimationSpeed {
  return value === 'normal' || value === 'reduced' || value === 'none';
}

export function getStoredAnimationSpeed(): AnimationSpeed {
  const rootValue = document.documentElement.getAttribute('data-animation-speed');
  if (isAnimationSpeed(rootValue)) return rootValue;
  const prefs = appStore.get<Partial<SensoryPreferences>>('sensory-prefs');
  if (isAnimationSpeed(prefs?.animationSpeed)) return prefs.animationSpeed;
  return 'normal';
}

export function laneTop(lane: LaneIndex): string {
  return `${16 + lane * 18}%`;
}

export function laneFromOffset(offsetY: number, height: number): LaneIndex {
  const boundedOffset = globalThis.Math.max(0, globalThis.Math.min(offsetY, height - 1));
  return globalThis.Math.floor((boundedOffset / height) * 4) as LaneIndex;
}

export function formatTime(remainingMs: number): string {
  const totalSeconds = globalThis.Math.ceil(remainingMs / 1000);
  const minutes = globalThis.Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function accuracyFromState(state: MathRunnerState): number {
  const totalAnswers = state.correctAnswers + state.wrongAnswers;
  if (totalAnswers === 0) return 100;
  return globalThis.Math.round((state.correctAnswers / totalAnswers) * 100);
}

export function actionVerb(action: RunnerAction): string {
  return action === 'jump' ? 'Jump' : 'Dash';
}

export function buildEncounter(kind: 'math' | 'obstacle', difficulty: MathRunnerDifficulty): Encounter {
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
