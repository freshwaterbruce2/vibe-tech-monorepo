/** A node in the MCTS planning tree */
export interface MCTSNode {
  id: string;
  treeId: string;
  parentId: string | null;
  taskDescription: string;
  approach: string;
  approachSource: ApproachSource;
  patternId: number | null;
  valueScore: number;
  visitCount: number;
  totalValue: number;
  actualSuccess: boolean | null;
  reflection: string | null;
  agentId: string | null;
  projectName: string | null;
  createdAt: string;
  executedAt: string | null;
}

export type ApproachSource = 'pattern_match' | 'search_first' | 'iterative' | 'thorough' | 'random';

/** A matched pattern from success_patterns table */
export interface SuccessPattern {
  id: number;
  patternType: string;
  description: string;
  frequency: number;
  confidenceScore: number;
  metadata: string | null;
}

/** Result of a LATS planning session */
export interface PlanResult {
  treeId: string;
  taskDescription: string;
  candidates: RankedCandidate[];
  recommended: RankedCandidate;
  planningTimeMs: number;
}

export interface RankedCandidate {
  nodeId: string;
  approach: string;
  approachSource: ApproachSource;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  patternId: number | null;
  patternDescription: string | null;
}

export interface ScoreBreakdown {
  patternSimilarity: number;    // 0-1: keyword match against success_patterns
  confidenceScore: number;      // 0-1: pattern confidence from DB
  historicalSuccessRate: number; // 0-1: success rate for similar tasks
  ucb1Bonus: number;            // exploration bonus (0 on first visit)
  final: number;                // weighted combination
}

/** Outcome recorded after an approach is executed */
export interface ExecutionOutcome {
  nodeId: string;
  success: boolean;
  agentId?: string;
  projectName?: string;
  reflection?: string; // self-critique text if failed
}

/** Options for the LATS planner */
export interface LATSOptions {
  dbPath?: string;
  candidateCount?: number;       // default 3
  explorationConstant?: number;  // UCB1 C parameter, default 1.414
  minPatternConfidence?: number; // minimum confidence_score to use a pattern, default 0.7
}
