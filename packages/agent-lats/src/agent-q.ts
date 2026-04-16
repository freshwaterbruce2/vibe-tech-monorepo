/**
 * Agent Q Assessment — Phase 2
 *
 * Aggregates per-file self_critiques for a completed LATS node into
 * a single quality score that replaces the binary success/failure signal
 * in MCTS backpropagation.
 *
 * The "Agent Q" name comes from process reward model research:
 * instead of only knowing whether the final outcome was correct,
 * we score the quality of intermediate steps (the modified files),
 * producing a continuous 0.0–1.0 signal that compounds over time.
 *
 * Quality dimensions (weighted average):
 *   50%  file_quality    — avg static_score from self_critiques rubric
 *   25%  completion_rate — % of critiqued files that are 'positive' preference
 *   25%  cleanliness     — % of files with zero violations
 *
 * When no critiques exist for a node, returns null and the caller falls
 * back to the binary success/failure signal from Phase 1.
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentQAssessment {
  id: string;
  latsNodeId: string;
  agentId: string | null;
  taskDescription: string;
  filesCritiqued: number;
  avgFileQuality: number;      // avg static_score from self_critiques
  positiveFiles: number;       // preference_type = 'positive'
  negativeFiles: number;       // preference_type = 'negative'
  cleanFiles: number;          // zero violations
  qualityScore: number;        // final 0.0–1.0 signal
  qualityBand: 'excellent' | 'good' | 'acceptable' | 'poor';
  summary: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

/**
 * Aggregate self_critiques for a completed LATS node into an Agent Q score.
 * Returns null if no critiques have been stored for this node yet.
 */
export function assessNodeFromCritiques(
  db: Database.Database,
  latsNodeId: string,
): AgentQAssessment | null {
  // Fetch node metadata (task description + agent used)
  const node = db
    .prepare(`SELECT task_description, agent_id FROM mcts_nodes WHERE id = ?`)
    .get(latsNodeId) as { task_description: string; agent_id: string | null } | undefined;

  if (!node) return null;

  // Aggregate all per-file critiques linked to this node
  const agg = db
    .prepare(`
      SELECT
        COUNT(*)                                                               AS total,
        AVG(static_score)                                                      AS avg_score,
        SUM(CASE WHEN preference_type = 'positive' THEN 1 ELSE 0 END)         AS positives,
        SUM(CASE WHEN preference_type = 'negative' THEN 1 ELSE 0 END)         AS negatives,
        SUM(CASE WHEN violations IS NULL OR violations = '[]' THEN 1 ELSE 0 END) AS clean
      FROM self_critiques
      WHERE lats_node_id = ?
    `)
    .get(latsNodeId) as {
    total: number;
    avg_score: number | null;
    positives: number;
    negatives: number;
    clean: number;
  } | undefined;

  if (!agg || agg.total === 0) return null;

  const avgFileQuality = agg.avg_score ?? 0.5;
  const completionRate = agg.positives / agg.total;
  const cleanliness = agg.clean / agg.total;

  const qualityScore =
    0.50 * avgFileQuality +
    0.25 * completionRate +
    0.25 * cleanliness;

  const qualityBand: AgentQAssessment['qualityBand'] =
    qualityScore >= 0.90 ? 'excellent' :
    qualityScore >= 0.75 ? 'good'      :
    qualityScore >= 0.55 ? 'acceptable': 'poor';

  const summary =
    `${agg.total} file(s) critiqued. ` +
    `avg=${avgFileQuality.toFixed(3)} ` +
    `positive=${agg.positives}/${agg.total} ` +
    `clean=${agg.clean}/${agg.total} ` +
    `→ quality=${qualityScore.toFixed(3)} [${qualityBand}]`;

  return {
    id: randomUUID(),
    latsNodeId,
    agentId: node.agent_id,
    taskDescription: node.task_description,
    filesCritiqued: agg.total,
    avgFileQuality,
    positiveFiles: agg.positives,
    negativeFiles: agg.negatives,
    cleanFiles: agg.clean,
    qualityScore,
    qualityBand,
    summary,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Persist an Agent Q assessment to the agent_q_assessments table */
export function storeAgentQAssessment(
  db: Database.Database,
  a: AgentQAssessment,
): void {
  db.prepare(`
    INSERT OR REPLACE INTO agent_q_assessments
      (id, lats_node_id, agent_id, task_description, files_critiqued,
       avg_file_quality, positive_files, negative_files, clean_files,
       quality_score, quality_band, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    a.id,
    a.latsNodeId,
    a.agentId,
    a.taskDescription,
    a.filesCritiqued,
    a.avgFileQuality,
    a.positiveFiles,
    a.negativeFiles,
    a.cleanFiles,
    a.qualityScore,
    a.qualityBand,
    a.summary,
    a.createdAt,
  );
}

/**
 * Back-fill the MCTS node's value with the quality score so future UCB1
 * calculations use the richer signal instead of the binary 0/1.
 * Only updates nodes that have already been executed.
 */
export function updateNodeQualityScore(
  db: Database.Database,
  latsNodeId: string,
  qualityScore: number,
): void {
  db.prepare(`
    UPDATE mcts_nodes
    SET total_value = ?,
        value_score = ?
    WHERE id = ? AND executed_at IS NOT NULL
  `).run(qualityScore, qualityScore, latsNodeId);
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Historical avg quality score for an agent on tasks matching these keywords.
 * Used by the MCTS value function to bias planning toward higher-quality agents.
 * Returns 0.5 (neutral prior) when no data exists.
 */
export function getAvgQualityForAgent(
  db: Database.Database,
  taskKeywords: string[],
  agentId?: string,
): number {
  if (taskKeywords.length === 0) return 0.5;

  const like = taskKeywords.map(() => `task_description LIKE ?`).join(' OR ');
  const params: (string | number)[] = taskKeywords.map((k) => `%${k}%`);

  let sql = `SELECT AVG(quality_score) AS avg_q, COUNT(*) AS n
             FROM agent_q_assessments WHERE (${like})`;
  if (agentId) {
    sql += ' AND agent_id = ?';
    params.push(agentId);
  }

  // better-sqlite3: pass params as rest args
  const row = (db.prepare(sql).get as (...p: (string | number)[]) => unknown)(
    ...params,
  ) as { avg_q: number | null; n: number } | undefined;

  if (!row || row.n === 0) return 0.5;
  return row.avg_q ?? 0.5;
}

/**
 * Recent quality scores for display in the CLI `assess stats` command.
 */
export function getRecentAssessments(
  db: Database.Database,
  limit = 10,
  agentId?: string,
): AgentQAssessment[] {
  let sql = `
    SELECT id, lats_node_id, agent_id, task_description, files_critiqued,
           avg_file_quality, positive_files, negative_files, clean_files,
           quality_score, quality_band, summary, created_at
    FROM agent_q_assessments
  `;
  const params: (string | number)[] = [];
  if (agentId) {
    sql += ' WHERE agent_id = ?';
    params.push(agentId);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const rows = (db.prepare(sql).all as (...p: (string | number)[]) => unknown[])(
    ...params,
  ) as Array<{
    id: string; lats_node_id: string; agent_id: string | null;
    task_description: string; files_critiqued: number;
    avg_file_quality: number; positive_files: number;
    negative_files: number; clean_files: number;
    quality_score: number; quality_band: string;
    summary: string | null; created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    latsNodeId: r.lats_node_id,
    agentId: r.agent_id,
    taskDescription: r.task_description,
    filesCritiqued: r.files_critiqued,
    avgFileQuality: r.avg_file_quality,
    positiveFiles: r.positive_files,
    negativeFiles: r.negative_files,
    cleanFiles: r.clean_files,
    qualityScore: r.quality_score,
    qualityBand: r.quality_band as AgentQAssessment['qualityBand'],
    summary: r.summary ?? '',
    createdAt: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Full assessment cycle for a completed LATS node:
 *   1. Aggregate self_critiques → AgentQAssessment
 *   2. Store to agent_q_assessments
 *   3. Back-fill quality score into mcts_nodes
 *
 * Returns the assessment, or null if no critique data is available yet.
 */
export function runAssessmentCycle(
  db: Database.Database,
  latsNodeId: string,
): AgentQAssessment | null {
  const assessment = assessNodeFromCritiques(db, latsNodeId);
  if (!assessment) return null;

  storeAgentQAssessment(db, assessment);
  updateNodeQualityScore(db, latsNodeId, assessment.qualityScore);

  return assessment;
}
