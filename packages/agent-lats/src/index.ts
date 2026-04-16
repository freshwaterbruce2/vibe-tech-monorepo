/**
 * @vibetech/agent-lats
 *
 * Language Agent Tree Search — MCTS-powered planning for autonomous agents.
 *
 * Usage:
 *   import { createPlanner } from '@vibetech/agent-lats';
 *
 *   const planner = createPlanner();
 *   const result = planner.plan('Implement OAuth login for the vibe-shop app');
 *   console.log(result.recommended.approach);
 *
 *   // After executing:
 *   planner.backpropagate({ nodeId: result.recommended.nodeId, success: true });
 *   planner.close();
 */

export type {
  MCTSNode,
  SuccessPattern,
  PlanResult,
  RankedCandidate,
  ScoreBreakdown,
  ExecutionOutcome,
  LATSOptions,
  ApproachSource,
} from './types.js';

export { generateReflectionPrompt, parseReflectionAnswers } from './reflect.js';
export { formatPlanForAgent } from './mcts.js';
export { critiqueFile, generatePreferencePair } from './critique.js';
export type { CritiqueResult, RubricResult } from './critique.js';
export {
  assessNodeFromCritiques,
  storeAgentQAssessment,
  updateNodeQualityScore,
  getAvgQualityForAgent,
  getRecentAssessments,
  runAssessmentCycle,
} from './agent-q.js';
export type { AgentQAssessment } from './agent-q.js';
export {
  snapshot,
  evolve,
  deployVariant,
  benchmark,
  mutate,
  diffVariants,
  getVariantHistory,
  getDeployedVariant,
  saveVariant,
  resolveSkillPath,
  parseSkill,
  assembleSkill,
} from './skill-evolution.js';
export type {
  MutationType,
  SkillVariant,
  BenchmarkBreakdown,
  EvolutionResult,
} from './skill-evolution.js';

export {
  startRun,
  recordStage,
  finishRun,
  getStageStats,
  suggestOrderings,
  getRunHistory,
  getRunStages,
  recomputeAllBlame,
  computeBlameForRun,
  predictSuccessRate,
  isValidOrdering,
  DEFAULT_ORDERING,
  HARD_DEPS,
} from './pipeline-evolution.js';
export type {
  StageName,
  PipelineRun,
  StageResult,
  StageStats,
  OrderingSuggestion,
} from './pipeline-evolution.js';

import { getDb, closeDb, recordOutcome } from './db.js';
import { plan, formatPlanForAgent } from './mcts.js';
import type { PlanResult, ExecutionOutcome, LATSOptions } from './types.js';

export interface Planner {
  /** Generate MCTS-ranked approach candidates for a task */
  plan(taskDescription: string): PlanResult;

  /** Record the actual outcome and backpropagate through the tree */
  backpropagate(outcome: ExecutionOutcome): void;

  /** Format a plan as human-readable text for agent context injection */
  format(result: PlanResult): string;

  /** Close the DB connection */
  close(): void;
}

export function createPlanner(opts: LATSOptions = {}): Planner {
  const db = getDb(opts.dbPath);

  return {
    plan: (taskDescription: string) => plan(db, taskDescription, opts),
    backpropagate: (outcome: ExecutionOutcome) => recordOutcome(db, outcome),
    format: (result: PlanResult) => formatPlanForAgent(result),
    close: () => closeDb(),
  };
}
