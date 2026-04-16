import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type { MCTSNode, SuccessPattern, PlanResult, RankedCandidate, LATSOptions, ApproachSource } from './types.js';
import { loadSuccessPatterns, getHistoricalSuccessRate, getTreeVisitCount, insertNode } from './db.js';
import { tokenise, computeScore, patternSimilarity } from './value-function.js';
import { getAvgQualityForAgent } from './agent-q.js';

const FIXED_APPROACHES: Array<{ source: ApproachSource; approach: string }> = [
  {
    source: 'search_first',
    approach:
      'Search-first: Before writing any code, use Grep/Glob to find all existing implementations ' +
      'of this pattern. Read the top 3 matches. Modify existing code instead of creating new. ' +
      'Only create new files if nothing similar exists.',
  },
  {
    source: 'iterative',
    approach:
      'Iterative: Make the smallest possible change that could work. ' +
      'Implement one piece, verify it compiles/passes, then expand. ' +
      'Roll back immediately if an intermediate state breaks other tests.',
  },
  {
    source: 'thorough',
    approach:
      'Thorough: Map all affected files before touching any. ' +
      'Read each file completely. Write tests first (TDD). ' +
      'Implement with full type safety. Run lint + typecheck after each file.',
  },
];

/**
 * Run a LATS planning session for a task.
 *
 * 1. Load success patterns from the learning DB.
 * 2. Find the best pattern match (if any).
 * 3. Generate N candidates: best pattern + fixed approaches.
 * 4. Score each with the value function (similarity + confidence + history + UCB1).
 * 5. Return ranked candidates — top candidate is `recommended`.
 * 6. Persist all nodes to the DB for future backpropagation.
 */
export function plan(db: Database.Database, taskDescription: string, opts: LATSOptions = {}): PlanResult {
  const start = Date.now();
  const treeId = randomUUID();
  const candidateCount = opts.candidateCount ?? 3;
  const minConfidence = opts.minPatternConfidence ?? 0.7;
  const explorationConstant = opts.explorationConstant ?? Math.SQRT2;

  const taskTokens = tokenise(taskDescription);
  const patterns = loadSuccessPatterns(db, minConfidence);
  const taskKeywords = [...taskTokens];
  const historicalRate = getHistoricalSuccessRate(db, taskKeywords.slice(0, 5));
  const historicalQuality = getAvgQualityForAgent(db, taskKeywords.slice(0, 5)); // Phase 2
  const totalVisits = getTreeVisitCount(db, treeId); // 0 on first visit

  // --- Expand: build candidate pool ---
  const candidates: Array<{
    source: ApproachSource;
    approach: string;
    pattern: SuccessPattern | null;
    patternId: number | null;
    patternDescription: string | null;
  }> = [];

  // Best N pattern matches (sorted by similarity * confidence)
  const scoredPatterns = patterns
    .map((p) => ({ pattern: p, score: patternSimilarity(taskTokens, p) * p.confidenceScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, candidateCount - FIXED_APPROACHES.length));

  for (const { pattern } of scoredPatterns) {
    if (pattern.confidenceScore >= minConfidence) {
      candidates.push({
        source: 'pattern_match',
        approach: `Pattern "${pattern.patternType}": ${pattern.description}`,
        pattern,
        patternId: pattern.id,
        patternDescription: pattern.description,
      });
    }
  }

  // Fill remaining slots with fixed approaches
  for (const fixed of FIXED_APPROACHES) {
    if (candidates.length >= candidateCount) break;
    candidates.push({ ...fixed, pattern: null, patternId: null, patternDescription: null });
  }

  // --- Evaluate: score each candidate ---
  const ranked: RankedCandidate[] = candidates.map((c) => {
    const nodeId = randomUUID();
    const breakdown = computeScore({
      taskTokens,
      pattern: c.pattern,
      approachSource: c.source,
      historicalSuccessRate: historicalRate,
      historicalQualityScore: historicalQuality, // Phase 2
      totalTreeVisits: totalVisits,
      nodeVisits: 0,
      explorationConstant,
    });

    const node: MCTSNode = {
      id: nodeId,
      treeId,
      parentId: null,
      taskDescription,
      approach: c.approach,
      approachSource: c.source,
      patternId: c.patternId,
      valueScore: breakdown.final,
      visitCount: 0,
      totalValue: 0,
      actualSuccess: null,
      reflection: null,
      agentId: null,
      projectName: null,
      createdAt: new Date().toISOString(),
      executedAt: null,
    };

    insertNode(db, node);

    return {
      nodeId,
      approach: c.approach,
      approachSource: c.source,
      score: breakdown.final,
      scoreBreakdown: breakdown,
      patternId: c.patternId,
      patternDescription: c.patternDescription,
    };
  });

  // --- Select: sort by score descending ---
  ranked.sort((a, b) => b.score - a.score);

  return {
    treeId,
    taskDescription,
    candidates: ranked,
    recommended: ranked[0]!,
    planningTimeMs: Date.now() - start,
  };
}

/** Format a PlanResult as human-readable text for agent context injection */
export function formatPlanForAgent(result: PlanResult): string {
  const lines: string[] = [
    `## LATS Plan — ${result.taskDescription.substring(0, 80)}`,
    `Tree: ${result.treeId} | Planning took ${result.planningTimeMs}ms`,
    '',
    `**RECOMMENDED APPROACH** (score: ${result.recommended.score.toFixed(3)})`,
    `Source: ${result.recommended.approachSource}`,
    `Node ID: ${result.recommended.nodeId}  ← record this for backpropagation`,
    '',
    result.recommended.approach,
    '',
    '### All Candidates (ranked):',
  ];

  for (let i = 0; i < result.candidates.length; i++) {
    const c = result.candidates[i]!;
    const bd = c.scoreBreakdown;
    lines.push(
      `${i + 1}. [${c.approachSource}] score=${c.score.toFixed(3)} ` +
      `(sim=${bd.patternSimilarity.toFixed(2)} conf=${bd.confidenceScore.toFixed(2)} ` +
      `hist=${bd.historicalSuccessRate.toFixed(2)} qual=${bd.historicalQualityScore.toFixed(2)})`,
    );
    lines.push(`   node: ${c.nodeId}`);
    lines.push(`   ${c.approach.substring(0, 120)}...`);
  }

  lines.push('');
  lines.push(
    `**After executing**: call \`lats backpropagate --node ${result.recommended.nodeId} --success true|false\``,
  );

  return lines.join('\n');
}
