/**
 * Logic types (migrated from @vibetech/shared-logic)
 */

export interface LogicPattern {
  id: number;
  logic_rule: string;
  pattern_data: Record<string, unknown>;
  success_rate: number;
  tags: string[];
  created_at: string;
}

/** Mandatory for Gemini 3 (Pro/Flash) tool calls. */
export interface ThoughtBlock {
  thought_signature: string;
  reasoning_details?: string;
  timestamp: number;
}

export interface VectorSearchResult {
  strategy_id: number;
  distance: number;
  score: number;
}
