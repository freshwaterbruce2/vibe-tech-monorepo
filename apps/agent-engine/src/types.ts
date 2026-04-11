export type MemoryKind = 'episodic' | 'semantic' | 'policy';
export type AgentRole =
  | 'planner'
  | 'coder'
  | 'reviewer'
  | 'gatekeeper'
  | 'memory-curator'
  | 'self-improver'
  | 'supervisor';

export interface TaskSpec {
  id: string;
  title: string;
  objective: string;
  constraints: string[];
  acceptanceCriteria: string[];
  affectedProjects?: string[];
  filesHint?: string[];
  dryRun?: boolean;
}

export interface ToolTrace {
  tool: string;
  command: string;
  success: boolean;
  durationMs: number;
  outputPreview: string;
}

export interface ReviewerFinding {
  severity: 'critical' | 'warning' | 'info';
  summary: string;
  file?: string;
}

export interface EvalSuiteResult {
  suite: string;
  passed: boolean;
  score: number;
  threshold: number;
  durationMs: number;
  details: string[];
  rawOutput?: string;
}

export type BehavioralToolName =
  | 'web-search'
  | 'glob'
  | 'grep'
  | 'read-existing'
  | 'feature-spec'
  | 'ask-user';

export type BehavioralAssertion =
  | {
      type: 'tool-required' | 'tool-optional';
      tool: BehavioralToolName;
      critical?: boolean;
    }
  | {
      type: 'sources-required';
      minimum: number;
      critical?: boolean;
    }
  | {
      type: 'source-domain-required';
      domains: string[];
      critical?: boolean;
    }
  | {
      type: 'response-must-include' | 'response-must-not-include';
      values: string[];
      critical?: boolean;
    }
  | {
      type: 'no-fabricated-urls';
      critical?: boolean;
    }
  | {
      type: 'duplicate-check-required';
      checks: BehavioralToolName[];
      critical?: boolean;
    }
  | {
      type: 'user-confirmation-required';
      critical?: boolean;
    };

export interface BehavioralEvalCase {
  id: string;
  category: string;
  name: string;
  input: string;
  assertions: BehavioralAssertion[];
}

export interface BehavioralSuiteDefinition {
  id: string;
  name: string;
  threshold: number;
  categories: string[];
  cases: BehavioralEvalCase[];
}

export interface BehavioralSuiteCollection {
  suites: BehavioralSuiteDefinition[];
}

export interface BehavioralRolePayload {
  summary: string;
  requestedTools?: BehavioralToolName[];
  sources?: string[];
  duplicateChecks?: BehavioralToolName[];
  askUser?: boolean;
  response?: string;
  findings?: string[];
  decision?: 'pass' | 'fail' | 'needs_review';
}

export interface BehavioralExecutionTrace {
  caseId: string;
  provider: string;
  requestedTools: BehavioralToolName[];
  duplicateChecks: BehavioralToolName[];
  sources: string[];
  askUser: boolean;
  response: string;
  roleTransitions: RoleTransition[];
}

export interface BehavioralAssertionResult {
  assertion: BehavioralAssertion;
  passed: boolean;
  critical: boolean;
  detail: string;
}

export interface BehavioralCaseResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  score: number;
  criticalFailure: boolean;
  assertionResults: BehavioralAssertionResult[];
  trace: BehavioralExecutionTrace;
}

export interface BenchmarkMetricSet {
  taskCompletionRate: number;
  regressionFreePatchRate: number;
  safetyViolationRate: number;
  costPerSuccess: number;
  medianWallClockMs: number;
}

export interface BenchmarkReport {
  name: string;
  score: number;
  metrics: BenchmarkMetricSet;
  suites: EvalSuiteResult[];
  recommendations: string[];
}

export interface CandidateRevision {
  id: string;
  createdAt: string;
  reason: string;
  expectedImprovement: string;
  benchmarkScope: string[];
  rollbackRef: string;
  branchName: string;
  worktreePath: string;
  filesTouched: string[];
  diffSummary: string;
  status: 'pending' | 'accepted' | 'rejected' | 'rolled_back' | 'needs_review';
  decisionReason?: string;
  rollback?: {
    pointerRef: string;
    pointerPath: string;
    status: 'ready' | 'applied' | 'not_needed';
    appliedAt?: string;
    reason?: string;
  };
}

export interface PromotionDecision {
  candidateId: string;
  decision: CandidateRevision['status'];
  reasons: string[];
  benchmarkScore: number;
  suites: EvalSuiteResult[];
  behavioralScore?: number;
  behavioralFailedCaseIds?: string[];
}

export interface PolicyBundle {
  name: string;
  runtimeProvider: 'moonshot';
  roles: Record<string, string>;
  allowedSelfModificationPaths: string[];
  forbiddenGlobs: string[];
  forbiddenCommands: string[];
  packageInstallAllowList: string[];
  promotionThresholds: {
    benchmarkScore: number;
    repoEvalScore: number;
    maxSafetyViolationRate: number;
  };
}

export interface MemoryRecord {
  kind: MemoryKind;
  title: string;
  text: string;
  createdAt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface StoredMemoryRecord extends MemoryRecord {
  id: string;
  createdAt: string;
}

export interface MemorySearchOptions {
  kind?: MemoryKind;
  limit?: number;
  tag?: string;
}

export interface RoleTransition {
  role: AgentRole;
  startedAt: string;
  completedAt: string;
  summary: string;
  output: string;
}

export interface RunTrace {
  id: string;
  task: TaskSpec;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'succeeded' | 'failed';
  tools: ToolTrace[];
  filesTouched: string[];
  reviewerFindings: ReviewerFinding[];
  evalResults: EvalSuiteResult[];
  roleTransitions: RoleTransition[];
  benchmark?: BenchmarkReport;
  candidateId?: string;
  summary: string;
}

export interface ProviderPrompt {
  system: string;
  user: string;
}

export interface ProviderGenerateResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  generateText(prompt: ProviderPrompt): Promise<ProviderGenerateResult>;
}

export type BehavioralProviderMode = 'auto' | 'moonshot' | 'scripted';

export interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  success: boolean;
  durationMs: number;
}
