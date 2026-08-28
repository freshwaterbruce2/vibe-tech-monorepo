import type { PathLike } from 'node:fs';

/**
 * Immutable specification loaded once per loop run.
 */
export interface LoopSpec {
  /** Unique identifier for this spec. */
  id: string;
  /** Human-readable objective. */
  objective: string;
  /** Raw markdown content. */
  content: string;
  /** Absolute path to the spec file. */
  path: string;
}

/**
 * Mutable checkpoint written and read across iterations.
 */
export interface TaskPlan {
  /** Current phase of work. */
  phase: string;
  /** Ordered list of tasks with completion status. */
  tasks: TaskEntry[];
  /** Extra context accumulated during the loop. */
  context: Record<string, unknown>;
  /** Set to true when the loop should terminate successfully. */
  done: boolean;
}

export interface TaskEntry {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
}

/**
 * Budget and termination controls.
 */
export interface LoopBudget {
  /** Maximum number of iterations. */
  maxIterations: number;
  /** Maximum estimated cost in USD. */
  maxCostUsd: number;
  /** Optional assertion gate that must pass. */
  assertionCommand?: string;
}

export interface LoopConfig {
  /** Directory containing specs/*.md files. */
  specsDir: PathLike;
  /** Path to the mutable task_plan.md file. */
  taskPlanPath: PathLike;
  /** Path to the session log progress.md file. */
  progressPath: PathLike;
  /** Budget and termination settings. */
  budget: LoopBudget;
  /** Provider endpoint to invoke on each iteration. */
  providerEndpoint?: string;
}

export interface LoopResult {
  /** Number of iterations actually executed. */
  iterations: number;
  /** Final task plan state. */
  taskPlan: TaskPlan;
  /** Whether the loop terminated successfully. */
  success: boolean;
  /** Reason for termination. */
  terminationReason: string;
}

/**
 * Provider interface for spawning fresh-context sessions.
 */
export interface ProviderClient {
  runIteration(input: ProviderInput): Promise<ProviderOutput>;
}

export interface ProviderInput {
  specs: LoopSpec[];
  taskPlan: TaskPlan;
  progress: string[];
  iteration: number;
}

export interface ProviderOutput {
  updatedTaskPlan: TaskPlan;
  logEntry: string;
  costUsd?: number;
}
