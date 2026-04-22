export interface LogicPattern {
  id: string | number;
  logic_rule: string;
  tags: string[];
  [key: string]: unknown;
}

export interface BrainScanScore {
  score: number;
}

export interface BrainScanResult {
  patterns: LogicPattern[];
  scores: BrainScanScore[];
  /** Optional legacy shape retained for backward compatibility */
  matches?: unknown;
}
