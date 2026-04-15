import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import type { MCTSNode, SuccessPattern, ExecutionOutcome } from './types.js';
import type { CritiqueResult } from './critique.js';

// Use AGENT_LATS_DB_PATH to avoid conflicting with the generic DATABASE_PATH
// which points to database.db (different schema).
const DEFAULT_DB_PATH = process.env['AGENT_LATS_DB_PATH'] ?? 'D:\\databases\\agent_learning.db';

let _db: Database.Database | null = null;

export function getDb(dbPath = DEFAULT_DB_PATH): Database.Database {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('busy_timeout = 5000');
    ensureSchema(_db);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mcts_nodes (
      id TEXT PRIMARY KEY,
      tree_id TEXT NOT NULL,
      parent_id TEXT,
      task_description TEXT NOT NULL,
      approach TEXT NOT NULL,
      approach_source TEXT NOT NULL,
      pattern_id INTEGER,
      value_score REAL DEFAULT 0.5,
      visit_count INTEGER DEFAULT 0,
      total_value REAL DEFAULT 0.0,
      actual_success INTEGER,
      reflection TEXT,
      agent_id TEXT,
      project_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      executed_at TEXT,
      FOREIGN KEY (parent_id) REFERENCES mcts_nodes(id)
    );
    CREATE INDEX IF NOT EXISTS idx_mcts_tree ON mcts_nodes(tree_id);
    CREATE INDEX IF NOT EXISTS idx_mcts_task ON mcts_nodes(task_description);
    CREATE INDEX IF NOT EXISTS idx_mcts_source ON mcts_nodes(approach_source, value_score DESC);

    CREATE TABLE IF NOT EXISTS self_critiques (
      id TEXT PRIMARY KEY,
      execution_id TEXT,
      lats_node_id TEXT,
      task_description TEXT NOT NULL,
      file_path TEXT NOT NULL,
      rubric_search_first INTEGER DEFAULT 0,
      rubric_no_mock INTEGER DEFAULT 0,
      rubric_no_any INTEGER DEFAULT 0,
      rubric_no_console INTEGER DEFAULT 0,
      rubric_type_imports INTEGER DEFAULT 0,
      rubric_no_nonnull INTEGER DEFAULT 0,
      rubric_no_react_default INTEGER DEFAULT 0,
      rubric_no_react_fc INTEGER DEFAULT 0,
      static_score REAL NOT NULL,
      violations TEXT,
      preference_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lats_node_id) REFERENCES mcts_nodes(id)
    );
    CREATE INDEX IF NOT EXISTS idx_critiques_file ON self_critiques(file_path, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_critiques_score ON self_critiques(static_score);

    CREATE TABLE IF NOT EXISTS preference_pairs (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      chosen_approach TEXT NOT NULL,
      chosen_score REAL NOT NULL,
      rejected_approach TEXT NOT NULL,
      rejected_score REAL NOT NULL,
      critique TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      source TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_prefs_task ON preference_pairs(task_type, confidence DESC);

    -- Phase 3: Skill Evolution Archive
    CREATE TABLE IF NOT EXISTS skill_variants (
      id TEXT PRIMARY KEY,
      skill_name TEXT NOT NULL,
      skill_path TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      parent_id TEXT,
      mutation_type TEXT NOT NULL DEFAULT 'original',
      content TEXT NOT NULL,
      benchmark_score REAL,
      benchmark_breakdown TEXT,
      is_deployed INTEGER NOT NULL DEFAULT 0,
      was_promoted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      benchmarked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_skill_variants_name ON skill_variants(skill_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_skill_variants_deployed ON skill_variants(skill_name, is_deployed);

    CREATE TABLE IF NOT EXISTS agent_mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mistake_type TEXT NOT NULL DEFAULT 'general',
      mistake_category TEXT NOT NULL DEFAULT 'planning',
      description TEXT NOT NULL,
      root_cause_analysis TEXT,
      context_when_occurred TEXT,
      impact_severity TEXT NOT NULL DEFAULT 'medium',
      prevention_strategy TEXT,
      identified_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_mistakes_resolved ON agent_mistakes(resolved, identified_at DESC);
    CREATE INDEX IF NOT EXISTS idx_mistakes_category ON agent_mistakes(mistake_category, resolved);

    -- Phase 4: Pipeline Evolution
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id TEXT PRIMARY KEY,
      pipeline_name TEXT NOT NULL,
      ordering TEXT NOT NULL,
      success INTEGER,
      failed_at_stage TEXT,
      total_stages INTEGER NOT NULL DEFAULT 8,
      completed_stages INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_name ON pipeline_runs(pipeline_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_success ON pipeline_runs(pipeline_name, success);

    CREATE TABLE IF NOT EXISTS pipeline_stage_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      position INTEGER NOT NULL,
      success INTEGER,
      duration_ms INTEGER,
      input_critique_score REAL,
      output_critique_score REAL,
      error_message TEXT,
      blame_score REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES pipeline_runs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_stage_results_run ON pipeline_stage_results(run_id);
    CREATE INDEX IF NOT EXISTS idx_stage_results_stage ON pipeline_stage_results(stage_name, success);
  `);
}

/** Load all success patterns above a confidence threshold */
export function loadSuccessPatterns(db: Database.Database, minConfidence = 0.7): SuccessPattern[] {
  const rows = db
    .prepare(
      `SELECT id, pattern_type, description, frequency, confidence_score, metadata
       FROM success_patterns
       WHERE confidence_score >= ?
       ORDER BY confidence_score DESC`,
    )
    .all(minConfidence) as Array<{
    id: number;
    pattern_type: string;
    description: string;
    frequency: number;
    confidence_score: number;
    metadata: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    patternType: r.pattern_type,
    description: r.description,
    frequency: r.frequency,
    confidenceScore: r.confidence_score,
    metadata: r.metadata,
  }));
}

/** Historical success rate for an agent_id on similar tasks */
export function getHistoricalSuccessRate(
  db: Database.Database,
  taskKeywords: string[],
  agentId?: string,
): number {
  // Match any execution whose task_type contains any of the keywords
  const like = taskKeywords.map(() => 'task_type LIKE ?').join(' OR ');
  const params: (string | number)[] = taskKeywords.map((k) => `%${k}%`);
  let sql = `SELECT COUNT(*) as total, SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as wins
             FROM agent_executions WHERE (${like})`;
  if (agentId) {
    sql += ' AND agent_id = ?';
    params.push(agentId);
  }
  const row = db.prepare(sql).get(...params) as { total: number; wins: number } | undefined;
  if (!row || row.total === 0) return 0.5; // neutral prior when no data
  return row.wins / row.total;
}

/** How many times has this tree_id been visited (total across all nodes) */
export function getTreeVisitCount(db: Database.Database, treeId: string): number {
  const row = db
    .prepare('SELECT SUM(visit_count) as total FROM mcts_nodes WHERE tree_id = ?')
    .get(treeId) as { total: number | null } | undefined;
  return row?.total ?? 0;
}

/** Insert a new MCTS node */
export function insertNode(db: Database.Database, node: MCTSNode): void {
  db.prepare(
    `INSERT INTO mcts_nodes
     (id, tree_id, parent_id, task_description, approach, approach_source,
      pattern_id, value_score, visit_count, total_value, actual_success,
      reflection, agent_id, project_name, created_at, executed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    node.id,
    node.treeId,
    node.parentId,
    node.taskDescription,
    node.approach,
    node.approachSource,
    node.patternId,
    node.valueScore,
    node.visitCount,
    node.totalValue,
    node.actualSuccess === null ? null : node.actualSuccess ? 1 : 0,
    node.reflection,
    node.agentId,
    node.projectName,
    node.createdAt,
    node.executedAt,
  );
}

/** Record the actual outcome and backpropagate up the tree */
export function recordOutcome(db: Database.Database, outcome: ExecutionOutcome): void {
  const now = new Date().toISOString();
  const successVal = outcome.success ? 1 : 0;

  // Update the executed node
  db.prepare(
    `UPDATE mcts_nodes
     SET actual_success = ?, executed_at = ?, reflection = ?, agent_id = COALESCE(?, agent_id), project_name = COALESCE(?, project_name),
         visit_count = visit_count + 1, total_value = total_value + ?
     WHERE id = ?`,
  ).run(
    successVal,
    now,
    outcome.reflection ?? null,
    outcome.agentId ?? null,
    outcome.projectName ?? null,
    successVal,
    outcome.nodeId,
  );

  // Backpropagate: walk up parent chain, incrementing visit counts
  const node = db
    .prepare('SELECT parent_id FROM mcts_nodes WHERE id = ?')
    .get(outcome.nodeId) as { parent_id: string | null } | undefined;

  let parentId = node?.parent_id ?? null;
  while (parentId) {
    db.prepare(
      'UPDATE mcts_nodes SET visit_count = visit_count + 1, total_value = total_value + ? WHERE id = ?',
    ).run(successVal, parentId);
    const parent = db
      .prepare('SELECT parent_id FROM mcts_nodes WHERE id = ?')
      .get(parentId) as { parent_id: string | null } | undefined;
    parentId = parent?.parent_id ?? null;
  }

  // If success, boost the corresponding success_pattern confidence
  const executed = db
    .prepare('SELECT pattern_id FROM mcts_nodes WHERE id = ?')
    .get(outcome.nodeId) as { pattern_id: number | null } | undefined;

  if (executed?.pattern_id && outcome.success) {
    db.prepare(
      `UPDATE success_patterns
       SET confidence_score = MIN(1.0, confidence_score + 0.02),
           frequency = frequency + 1,
           last_used = ?
       WHERE id = ?`,
    ).run(now, executed.pattern_id);
  }

  // If failure, write a mistake record
  if (!outcome.success && outcome.reflection) {
    const nodeRow = db
      .prepare('SELECT task_description, approach FROM mcts_nodes WHERE id = ?')
      .get(outcome.nodeId) as { task_description: string; approach: string } | undefined;

    if (nodeRow) {
      db.prepare(
        `INSERT INTO agent_mistakes
         (mistake_type, mistake_category, description, root_cause_analysis,
          context_when_occurred, impact_severity, prevention_strategy, identified_at, resolved)
         VALUES ('lats_approach_failure', 'planning', ?, ?, ?, 'medium', ?, ?, 0)`,
      ).run(
        `LATS chose wrong approach for: ${nodeRow.task_description.substring(0, 100)}`,
        outcome.reflection,
        nodeRow.approach,
        'Avoid this approach for similar tasks — see LATS reflection',
        now,
      );
    }
  }
}

/** Store a self-critique result for a modified file */
export function storeCritique(
  db: Database.Database,
  critique: CritiqueResult,
  taskDescription: string,
  latsNodeId?: string,
): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO self_critiques
     (id, lats_node_id, task_description, file_path,
      rubric_search_first, rubric_no_mock, rubric_no_any, rubric_no_console,
      rubric_type_imports, rubric_no_nonnull, rubric_no_react_default, rubric_no_react_fc,
      static_score, violations, preference_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    latsNodeId ?? null,
    taskDescription,
    critique.filePath,
    critique.rubric.searchFirst,
    critique.rubric.noMock,
    critique.rubric.noAny,
    critique.rubric.noConsole,
    critique.rubric.typeImports,
    critique.rubric.noNonnull,
    critique.rubric.noReactDefault,
    critique.rubric.noReactFc,
    critique.staticScore,
    critique.violations.length > 0 ? JSON.stringify(critique.violations) : null,
    critique.preferenceType,
  );
  return id;
}

/** Store a preference pair extracted from critique comparison */
export function storePreferencePair(
  db: Database.Database,
  opts: {
    taskType: string;
    chosen: string;
    chosenScore: number;
    rejected: string;
    rejectedScore: number;
    critique: string;
    confidence: number;
    source: string;
  },
): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO preference_pairs
     (id, task_type, chosen_approach, chosen_score, rejected_approach, rejected_score, critique, confidence, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    opts.taskType,
    opts.chosen,
    opts.chosenScore,
    opts.rejected,
    opts.rejectedScore,
    opts.critique,
    opts.confidence,
    opts.source,
  );
  return id;
}

/**
 * Average rubric score for all critiques of a given file path.
 * Used by the value function to adjust scores when we have prior critique data.
 */
export function getFileCritiqueHistory(
  db: Database.Database,
  filePath: string,
): { avgScore: number; count: number } {
  const row = db
    .prepare(
      `SELECT AVG(static_score) as avg_score, COUNT(*) as count
       FROM self_critiques WHERE file_path = ?`,
    )
    .get(filePath) as { avg_score: number | null; count: number };
  return { avgScore: row.avg_score ?? 0.5, count: row.count };
}

/**
 * Scan recent self_critiques and generate preference pairs where
 * the same task has both a passing and failing critique.
 * Returns the number of pairs generated.
 */
export function generatePreferencePairsFromHistory(db: Database.Database): number {
  // Find task descriptions with mixed outcomes in the last 100 critiques
  const mixed = db
    .prepare(
      `SELECT task_description,
              MAX(static_score) as best,
              MIN(static_score) as worst,
              COUNT(*) as n
       FROM self_critiques
       WHERE created_at > datetime('now', '-7 days')
       GROUP BY task_description
       HAVING MAX(static_score) > MIN(static_score) AND (MAX(static_score) - MIN(static_score)) >= 0.12 AND n >= 2`,
    )
    .all() as Array<{ task_description: string; best: number; worst: number; n: number }>;

  let generated = 0;
  for (const row of mixed) {
    const win = db
      .prepare(
        `SELECT * FROM self_critiques WHERE task_description = ? ORDER BY static_score DESC LIMIT 1`,
      )
      .get(row.task_description) as { file_path: string; static_score: number; violations: string | null } | undefined;
    const loss = db
      .prepare(
        `SELECT * FROM self_critiques WHERE task_description = ? ORDER BY static_score ASC LIMIT 1`,
      )
      .get(row.task_description) as { file_path: string; static_score: number; violations: string | null } | undefined;

    if (!win || !loss) continue;

    const lossViolations: string[] = loss.violations ? (JSON.parse(loss.violations) as string[]) : [];
    const delta = win.static_score - loss.static_score;
    const confidence = Math.min(0.95, 0.5 + delta);

    // Check if this pair already exists
    const existing = db
      .prepare(
        `SELECT id FROM preference_pairs WHERE task_type = ? AND chosen_approach = ? LIMIT 1`,
      )
      .get(row.task_description, win.file_path);
    if (existing) continue;

    storePreferencePair(db, {
      taskType: row.task_description,
      chosen: `${win.file_path} (score=${win.static_score.toFixed(3)})`,
      chosenScore: win.static_score,
      rejected: `${loss.file_path} (score=${loss.static_score.toFixed(3)})`,
      rejectedScore: loss.static_score,
      critique: `Auto-generated from critique history. Violations in rejected: ${lossViolations.slice(0, 3).join('; ') || 'none recorded'}. Score delta: +${delta.toFixed(3)}.`,
      confidence,
      source: 'auto_critique_history',
    });
    generated++;
  }
  return generated;
}
