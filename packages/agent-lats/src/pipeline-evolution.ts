/**
 * Pipeline Evolution Engine — Phase 4
 *
 * Applies EvoAgentX-style learnable pipeline ordering to the Ralph Wiggum
 * multi-agent loop. Instead of a fixed PatternAnalyzer→SkillGenerator→...
 * sequence, the system:
 *
 *   1. Record — log per-stage outcomes for every pipeline run
 *   2. Blame  — when a run fails, attribute causality to stages via
 *               input quality decay (did a bad upstream output cause downstream failure?)
 *   3. Suggest — rank alternative orderings by historical success rate,
 *                respecting hard dependency constraints
 *   4. Evolve  — swap adjacent unconstrained stages, promote orderings
 *               that improve success rate by >5% over the baseline
 *
 * Hard dependency constraints (must-before edges):
 *   PatternAnalyzer → SkillGenerator (can't generate before finding patterns)
 *   SkillGenerator  → CodeReviewer   (can't review code that doesn't exist)
 *   SkillGenerator  → TestArchitect  (can't test code that doesn't exist)
 *   SkillGenerator  → SecurityAuditor (can't audit code that doesn't exist)
 *   CodeReviewer    → DocsWriter     (docs should reflect reviewed code)
 *   QualityGate     → Monitor        (only monitor passing skills)
 *
 * Stages that CAN be reordered relative to each other:
 *   TestArchitect ↔ SecurityAuditor (both post-generation checks)
 *   DocsWriter    ↔ QualityGate    (both post-review steps — QualityGate first is safer)
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StageName =
  | 'PatternAnalyzer'
  | 'SkillGenerator'
  | 'CodeReviewer'
  | 'TestArchitect'
  | 'SecurityAuditor'
  | 'DocsWriter'
  | 'QualityGate'
  | 'Monitor';

export const DEFAULT_ORDERING: StageName[] = [
  'PatternAnalyzer',
  'SkillGenerator',
  'CodeReviewer',
  'TestArchitect',
  'SecurityAuditor',
  'DocsWriter',
  'QualityGate',
  'Monitor',
];

/**
 * Hard dependency graph: stage → set of stages that MUST run before it.
 * These constraints can never be violated by the evolution engine.
 */
export const HARD_DEPS: Partial<Record<StageName, StageName[]>> = {
  SkillGenerator:  ['PatternAnalyzer'],
  CodeReviewer:    ['SkillGenerator'],
  TestArchitect:   ['SkillGenerator'],
  SecurityAuditor: ['SkillGenerator'],
  DocsWriter:      ['CodeReviewer'],
  QualityGate:     [],                // no hard dep on DocsWriter or TestArchitect
  Monitor:         ['QualityGate'],
};

export interface PipelineRun {
  id: string;
  pipelineName: string;
  ordering: StageName[];
  success: boolean | null;
  failedAtStage: string | null;
  totalStages: number;
  completedStages: number;
  durationMs: number | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface StageResult {
  id: string;
  runId: string;
  stageName: StageName;
  position: number;
  success: boolean | null;
  durationMs: number | null;
  inputCritiqueScore: number | null;
  outputCritiqueScore: number | null;
  errorMessage: string | null;
  blameScore: number;
  createdAt: string;
}

export interface StageStats {
  stageName: StageName;
  runs: number;
  successRate: number;
  avgDurationMs: number | null;
  avgInputScore: number | null;
  avgOutputScore: number | null;
  blameFrequency: number;  // fraction of failures attributed to this stage
}

export interface OrderingSuggestion {
  ordering: StageName[];
  expectedSuccessRate: number;
  delta: number;             // vs. current default ordering
  rationale: string;
  violatesConstraints: boolean;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function rowToRun(r: Record<string, unknown>): PipelineRun {
  return {
    id: r['id'] as string,
    pipelineName: r['pipeline_name'] as string,
    ordering: JSON.parse(r['ordering'] as string) as StageName[],
    success: r['success'] === null ? null : (r['success'] as number) === 1,
    failedAtStage: r['failed_at_stage'] as string | null,
    totalStages: r['total_stages'] as number,
    completedStages: r['completed_stages'] as number,
    durationMs: r['duration_ms'] as number | null,
    notes: r['notes'] as string | null,
    createdAt: r['created_at'] as string,
    completedAt: r['completed_at'] as string | null,
  };
}

function rowToStage(r: Record<string, unknown>): StageResult {
  return {
    id: r['id'] as string,
    runId: r['run_id'] as string,
    stageName: r['stage_name'] as StageName,
    position: r['position'] as number,
    success: r['success'] === null ? null : (r['success'] as number) === 1,
    durationMs: r['duration_ms'] as number | null,
    inputCritiqueScore: r['input_critique_score'] as number | null,
    outputCritiqueScore: r['output_critique_score'] as number | null,
    errorMessage: r['error_message'] as string | null,
    blameScore: r['blame_score'] as number,
    createdAt: r['created_at'] as string,
  };
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

/** Start a new pipeline run; returns the run ID for subsequent stage recording */
export function startRun(
  db: Database.Database,
  opts: {
    pipelineName?: string;
    ordering?: StageName[];
    notes?: string;
  } = {},
): string {
  const id = randomUUID();
  const ordering = opts.ordering ?? DEFAULT_ORDERING;
  db.prepare(
    `INSERT INTO pipeline_runs
     (id, pipeline_name, ordering, total_stages, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    opts.pipelineName ?? 'ralph-wiggum',
    JSON.stringify(ordering),
    ordering.length,
    opts.notes ?? null,
    new Date().toISOString(),
  );
  return id;
}

/** Record the result of a single stage within an active run */
export function recordStage(
  db: Database.Database,
  runId: string,
  opts: {
    stageName: StageName;
    position: number;
    success: boolean;
    durationMs?: number;
    inputCritiqueScore?: number;
    outputCritiqueScore?: number;
    errorMessage?: string;
  },
): void {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO pipeline_stage_results
     (id, run_id, stage_name, position, success, duration_ms,
      input_critique_score, output_critique_score, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, runId,
    opts.stageName, opts.position,
    opts.success ? 1 : 0,
    opts.durationMs ?? null,
    opts.inputCritiqueScore ?? null,
    opts.outputCritiqueScore ?? null,
    opts.errorMessage ?? null,
    new Date().toISOString(),
  );

  // Increment completed count
  db.prepare(
    'UPDATE pipeline_runs SET completed_stages = completed_stages + 1 WHERE id = ?',
  ).run(runId);
}

/** Close a pipeline run with final outcome */
export function finishRun(
  db: Database.Database,
  runId: string,
  success: boolean,
  failedAtStage?: string,
): void {
  const now = new Date().toISOString();

  // Calculate duration
  const run = db.prepare('SELECT created_at FROM pipeline_runs WHERE id = ?')
    .get(runId) as { created_at: string } | undefined;
  const durationMs = run
    ? Date.now() - new Date(run.created_at).getTime()
    : null;

  db.prepare(
    `UPDATE pipeline_runs
     SET success = ?, failed_at_stage = ?, completed_at = ?, duration_ms = ?
     WHERE id = ?`,
  ).run(
    success ? 1 : 0,
    failedAtStage ?? null,
    now,
    durationMs,
    runId,
  );

  // If failed, compute blame scores for all stages in this run
  if (!success) {
    computeBlameForRun(db, runId);
  }
}

// ---------------------------------------------------------------------------
// Blame attribution
// ---------------------------------------------------------------------------

/**
 * Attribute blame across stages in a failed run.
 *
 * Algorithm:
 *   1. Find the stage that explicitly failed (success=0)
 *   2. Look upstream: if the immediately preceding stage had a low
 *      output_critique_score (<0.7), shift partial blame upstream
 *   3. Output a blame_score per stage (0.0–1.0, sums to ≤1.0)
 *
 * This is a simplified causal chain model:
 *   - Direct failure: 0.6 blame to the failing stage
 *   - If upstream score was low: 0.3 blame upstream, 0.3 to failing stage
 */
export function computeBlameForRun(db: Database.Database, runId: string): void {
  const stages = db
    .prepare(
      'SELECT * FROM pipeline_stage_results WHERE run_id = ? ORDER BY position ASC',
    )
    .all(runId) as Array<Record<string, unknown>>;

  if (stages.length === 0) return;

  const results = stages.map(rowToStage);

  // Find the first failing stage
  const failIdx = results.findIndex((s) => s.success === false);
  if (failIdx === -1) return; // no clear failure (shouldn't happen)

  const failing = results[failIdx]!;
  let failBlame = 0.6;
  let upstreamBlame = 0.0;
  let upstreamId: string | null = null;

  // Check upstream quality
  if (failIdx > 0) {
    const upstream = results[failIdx - 1]!;
    const upstreamScore = upstream.outputCritiqueScore;
    if (upstreamScore !== null && upstreamScore < 0.7) {
      // Low-quality output from upstream likely contributed
      const penalty = (0.7 - upstreamScore) / 0.7; // 0–1 how bad it was
      upstreamBlame = Math.min(0.35, 0.35 * penalty);
      failBlame = 0.6 - upstreamBlame * 0.5;
      upstreamId = upstream.id;
    }
  }

  // Write blame scores
  db.prepare('UPDATE pipeline_stage_results SET blame_score = ? WHERE id = ?')
    .run(failBlame, failing.id);

  if (upstreamId && upstreamBlame > 0) {
    db.prepare('UPDATE pipeline_stage_results SET blame_score = ? WHERE id = ?')
      .run(upstreamBlame, upstreamId);
  }
}

/** Recompute blame for all failed runs that have no blame scores yet */
export function recomputeAllBlame(db: Database.Database): number {
  const failedRuns = db
    .prepare(
      `SELECT r.id FROM pipeline_runs r
       WHERE r.success = 0
         AND NOT EXISTS (
           SELECT 1 FROM pipeline_stage_results s
           WHERE s.run_id = r.id AND s.blame_score > 0
         )`,
    )
    .all() as Array<{ id: string }>;

  for (const r of failedRuns) computeBlameForRun(db, r.id);
  return failedRuns.length;
}

// ---------------------------------------------------------------------------
// Stage statistics
// ---------------------------------------------------------------------------

export function getStageStats(db: Database.Database, pipelineName = 'ralph-wiggum'): StageStats[] {
  const rows = db
    .prepare(
      `SELECT s.stage_name,
              COUNT(*) as runs,
              ROUND(AVG(s.success) * 100, 1) as success_pct,
              ROUND(AVG(s.duration_ms)) as avg_ms,
              ROUND(AVG(s.input_critique_score), 3) as avg_input,
              ROUND(AVG(s.output_critique_score), 3) as avg_output,
              ROUND(AVG(s.blame_score), 4) as avg_blame
       FROM pipeline_stage_results s
       JOIN pipeline_runs r ON r.id = s.run_id
       WHERE r.pipeline_name = ?
       GROUP BY s.stage_name`,
    )
    .all(pipelineName) as Array<{
    stage_name: string;
    runs: number;
    success_pct: number;
    avg_ms: number | null;
    avg_input: number | null;
    avg_output: number | null;
    avg_blame: number;
  }>;

  return rows.map((r) => ({
    stageName: r.stage_name as StageName,
    runs: r.runs,
    successRate: r.success_pct / 100,
    avgDurationMs: r.avg_ms,
    avgInputScore: r.avg_input,
    avgOutputScore: r.avg_output,
    blameFrequency: r.avg_blame,
  }));
}

// ---------------------------------------------------------------------------
// Constraint validation
// ---------------------------------------------------------------------------

/** Returns true if the ordering respects all hard dependency constraints */
export function isValidOrdering(ordering: StageName[]): boolean {
  const position = new Map(ordering.map((s, i) => [s, i]));
  for (const [stage, deps] of Object.entries(HARD_DEPS)) {
    const stagePos = position.get(stage as StageName);
    if (stagePos === undefined) continue;
    for (const dep of (deps as StageName[])) {
      const depPos = position.get(dep);
      if (depPos === undefined) continue;
      if (depPos >= stagePos) return false; // dep must come before stage
    }
  }
  return true;
}

/** Generate all valid orderings reachable by a single adjacent swap from the given ordering */
function singleSwapNeighbours(ordering: StageName[]): StageName[][] {
  const neighbours: StageName[][] = [];
  for (let i = 0; i < ordering.length - 1; i++) {
    const candidate = [...ordering];
    // Swap positions i and i+1
    [candidate[i], candidate[i + 1]] = [candidate[i + 1]!, candidate[i]!];
    if (isValidOrdering(candidate)) neighbours.push(candidate);
  }
  return neighbours;
}

// ---------------------------------------------------------------------------
// Ordering evolution
// ---------------------------------------------------------------------------

/**
 * Compute the expected success rate for a given ordering based on historical
 * per-stage data. Uses a multiplicative model: P(pipeline) = ∏ P(stage_i).
 * Stages not yet seen use a neutral prior of 0.75.
 */
export function predictSuccessRate(
  ordering: StageName[],
  stats: StageStats[],
): number {
  const statMap = new Map(stats.map((s) => [s.stageName, s]));
  const PRIOR = 0.75;
  let p = 1.0;
  for (const stage of ordering) {
    const s = statMap.get(stage);
    const rate = s && s.runs >= 3 ? s.successRate : PRIOR;
    p *= rate;
  }
  return +p.toFixed(4);
}

/**
 * Suggest improved orderings by exploring the single-swap neighbourhood of
 * the current best ordering. Returns up to `topN` suggestions sorted by
 * expected success rate.
 */
export function suggestOrderings(
  db: Database.Database,
  pipelineName = 'ralph-wiggum',
  topN = 3,
): OrderingSuggestion[] {
  const stats = getStageStats(db, pipelineName);
  const baseline = predictSuccessRate(DEFAULT_ORDERING, stats);

  const seen = new Set<string>();
  const candidates: OrderingSuggestion[] = [];

  // BFS over single-swap neighbourhood (2 levels deep)
  let frontier = [DEFAULT_ORDERING];
  for (let depth = 0; depth < 2; depth++) {
    const nextFrontier: StageName[][] = [];
    for (const ord of frontier) {
      for (const neighbour of singleSwapNeighbours(ord)) {
        const key = neighbour.join(',');
        if (seen.has(key)) continue;
        seen.add(key);

        const rate = predictSuccessRate(neighbour, stats);
        const delta = rate - baseline;
        candidates.push({
          ordering: neighbour,
          expectedSuccessRate: rate,
          delta,
          rationale: delta > 0.01
            ? `Moves higher-confidence stages earlier; estimated +${(delta * 100).toFixed(1)}% pipeline success`
            : delta < -0.01
            ? `Moves lower-confidence stages earlier; estimated ${(delta * 100).toFixed(1)}% pipeline success (avoid)`
            : 'Neutral reordering — equivalent expected performance',
          violatesConstraints: false,
        });
        nextFrontier.push(neighbour);
      }
    }
    frontier = nextFrontier;
  }

  // Sort: best first, skip strictly worse orderings from top suggestions
  candidates.sort((a, b) => b.expectedSuccessRate - a.expectedSuccessRate);
  return candidates.slice(0, topN);
}

// ---------------------------------------------------------------------------
// Run history
// ---------------------------------------------------------------------------

export function getRunHistory(
  db: Database.Database,
  pipelineName = 'ralph-wiggum',
  limit = 10,
): PipelineRun[] {
  const rows = db
    .prepare(
      `SELECT * FROM pipeline_runs WHERE pipeline_name = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(pipelineName, limit) as Array<Record<string, unknown>>;
  return rows.map(rowToRun);
}

export function getRunStages(db: Database.Database, runId: string): StageResult[] {
  const rows = db
    .prepare('SELECT * FROM pipeline_stage_results WHERE run_id = ? ORDER BY position ASC')
    .all(runId) as Array<Record<string, unknown>>;
  return rows.map(rowToStage);
}
