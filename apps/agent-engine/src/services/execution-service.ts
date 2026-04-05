import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config.js';
import { readTextFile } from '../tools/file-tools.js';
import { gitChangedFiles, gitDiff } from '../tools/git-tools.js';
import { DEFAULT_POLICY_BUNDLE } from '../policy/default-policy.js';
import { evaluateCandidateAgainstPolicy } from '../policy/guardrails.js';
import type {
  AgentRole,
  CandidateRevision,
  EvalSuiteResult,
  LlmProvider,
  ReviewerFinding,
  RoleTransition,
  RunTrace,
  TaskSpec,
  ToolTrace,
} from '../types.js';
import { BenchmarkService } from './benchmark-service.js';
import { CandidateRepository } from './candidate-repository.js';
import { EvaluationService } from './evaluation-service.js';
import { MemoryClient, type AgentLearningContext } from './memory-client.js';
import { PromotionService } from './promotion-service.js';
import { RunTraceRepository } from './run-trace-repository.js';
import { WorktreeService } from './worktree-service.js';

const LEARNING_AGENT_ID = 'agent-engine';
const LEARNING_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const LEARNING_SYNC_STATE_FILE = 'learning-sync-state.json';

interface TaskExecutionContext {
  toolTraces: ToolTrace[];
  filesTouched: string[];
  diff: string;
  fileContents: string;
  gateSuites: EvalSuiteResult[];
  coderSummary: string;
}

interface WorkflowState {
  plan: string;
  code: string;
  review: string;
  reviewFindings: ReviewerFinding[];
  gateSummary: string;
  selfImprovement: string;
  supervisorDecision: string;
}

export interface ExecutionSummary {
  trace: RunTrace;
  candidate?: CandidateRevision;
  promotionDecision?: ReturnType<PromotionService['evaluate']>;
}

export class ExecutionService {
  public constructor(
    private readonly provider: LlmProvider,
    private readonly traceRepository = new RunTraceRepository(),
    private readonly candidateRepository = new CandidateRepository(),
    private readonly benchmarkService = new BenchmarkService(),
    private readonly evaluationService = new EvaluationService('C:\\dev', 'scripted'),
    private readonly memoryClient = new MemoryClient(),
    private readonly worktreeService = new WorktreeService(),
    private readonly promotionService = new PromotionService(),
    private readonly evaluationServiceFactory: (workspaceRoot: string) => EvaluationService = (
      workspaceRoot,
    ) => new EvaluationService(workspaceRoot, 'scripted'),
  ) {}

  public async runTask(task: TaskSpec): Promise<ExecutionSummary> {
    const trace: RunTrace = {
      id: randomUUID(),
      task,
      startedAt: new Date().toISOString(),
      status: 'running',
      tools: [],
      filesTouched: [],
      reviewerFindings: [],
      evalResults: [],
      roleTransitions: [],
      summary: '',
    };

    try {
      // Fire periodic learning sync if stale (>1h since last). Fire-and-forget; do not block.
      void this.maybeTriggerLearningSync();

      const antiPatterns = this.memoryClient.getRecent({ tag: 'anti-pattern', limit: 5 });

      // Pull per-agent learning context (past executions, patterns, mistakes) from memory-mcp.
      // Null-safe: if bridge is unavailable, we fall back to anti-patterns only.
      const learningContext = await this.memoryClient
        .getAgentLearningContext(LEARNING_AGENT_ID, 10)
        .catch(() => null);

      const plan = await this.runRole(
        trace,
        'planner',
        `Task:\n${JSON.stringify(task, null, 2)}\n\nRecent anti-patterns:\n${
          antiPatterns.map((record) => `- ${record.title}: ${record.text}`).join('\n') || '- none'
        }\n\nAgent learning context:\n${this.formatLearningContext(learningContext)}`,
      );

      const executionContext = this.executeTaskLocally(task);
      trace.tools.push(...executionContext.toolTraces);
      trace.filesTouched = executionContext.filesTouched;
      trace.evalResults = executionContext.gateSuites;

      const code = await this.runRole(
        trace,
        'coder',
        `Plan:\n${plan}\n\nLocal execution summary:\n${executionContext.coderSummary}`,
      );

      const reviewFindings =
        executionContext.diff || executionContext.fileContents
          ? await this.reviewChangedCode(executionContext.diff, executionContext.fileContents)
          : [];
      trace.reviewerFindings = reviewFindings;

      const review = await this.runRole(
        trace,
        'reviewer',
        `Coder output:\n${code}\n\nReviewer findings:\n${
          reviewFindings.map((finding) => `[${finding.severity}] ${finding.summary}`).join('\n') ||
          'No findings.'
        }`,
      );

      const gateSummary = await this.runRole(
        trace,
        'gatekeeper',
        this.summarizeSuites(executionContext.gateSuites),
      );

      await this.memoryClient.add({
        kind: 'episodic',
        title: task.title,
        text: `${plan}\n\n${code}\n\n${review}\n\n${gateSummary}`.trim(),
        metadata: {
          taskId: task.id,
          filesTouched: executionContext.filesTouched,
        },
        tags: ['task-run'],
      });

      const memorySummary = await this.runRole(
        trace,
        'memory-curator',
        `Capture successful patterns and risks from this trace.\n\n${this.summarizeSuites(
          executionContext.gateSuites,
        )}`,
      );

      const selfImprovement = await this.runRole(
        trace,
        'self-improver',
        `Task summary:\n${task.title}\n\nReviewer findings:\n${
          reviewFindings.map((finding) => `[${finding.severity}] ${finding.summary}`).join('\n') ||
          'No findings.'
        }\n\nMemory curator output:\n${memorySummary}`,
      );

      const supervisorDecision = await this.runRole(
        trace,
        'supervisor',
        `Gate summary:\n${gateSummary}\n\nSelf-improvement proposal:\n${selfImprovement}`,
      );

      const workflowState: WorkflowState = {
        plan,
        code,
        review,
        reviewFindings,
        gateSummary,
        selfImprovement,
        supervisorDecision,
      };

      trace.summary = this.buildTraceSummary(task, workflowState);
      trace.status = this.hasBlockingFailures(trace) ? 'failed' : 'succeeded';
      trace.completedAt = new Date().toISOString();
      this.traceRepository.save(trace);

      return { trace };
    } catch (error) {
      trace.status = 'failed';
      trace.completedAt = new Date().toISOString();
      trace.summary = error instanceof Error ? error.message : 'Unknown execution failure';
      this.traceRepository.save(trace);
      throw error;
    }
  }

  public async reviewChangedCode(diff: string, fileContents: string): Promise<ReviewerFinding[]> {
    const response = await this.provider.generateText({
      system: this.getRolePrompt('reviewer'),
      user: `## Diff\n${diff || '(no diff available)'}\n\n## File Contents\n${fileContents || '(no files)'}`,
    });

    return response.text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line): ReviewerFinding => {
        const lower = line.toLowerCase();
        const severity = lower.includes('critical')
          ? 'critical'
          : lower.includes('warning')
            ? 'warning'
            : 'info';
        return { severity, summary: line };
      });
  }

  public async createCandidateFromTrace(
    trace: RunTrace,
    filesTouched: string[],
    diffSummary: string,
    reason: string,
  ): Promise<ExecutionSummary> {
    const candidateId = randomUUID();
    const worktree = this.worktreeService.create(candidateId);
    const rollback = this.worktreeService.createRollbackPointer(candidateId, worktree.worktreePath);
    const candidate: CandidateRevision = {
      id: candidateId,
      createdAt: new Date().toISOString(),
      reason,
      expectedImprovement:
        'Improve solve rate and reduce regressions without lowering safety scores.',
      benchmarkScope: ['repo-local', 'behavioral', 'regression-pack'],
      rollbackRef: rollback.pointerRef,
      branchName: worktree.branchName,
      worktreePath: worktree.worktreePath,
      filesTouched,
      diffSummary,
      status: 'pending',
      rollback: {
        pointerRef: rollback.pointerRef,
        pointerPath: rollback.pointerPath,
        status: 'ready',
      },
    };

    this.candidateRepository.save(candidate);

    await this.memoryClient.add({
      kind: 'policy',
      title: `Candidate ${candidate.id}`,
      text: candidate.reason,
      metadata: {
        filesTouched,
        branchName: candidate.branchName,
        rollbackRef: candidate.rollbackRef,
      },
      tags: ['candidate'],
    });

    trace.candidateId = candidate.id;
    this.traceRepository.save(trace);

    return { trace, candidate };
  }

  public async promoteCandidate(candidateId: string): Promise<ExecutionSummary> {
    const candidate = this.candidateRepository.get(candidateId);
    const policyCheck = evaluateCandidateAgainstPolicy(candidate, DEFAULT_POLICY_BUNDLE);

    if (!policyCheck.safe) {
      const rejected = await this.rejectCandidate(
        candidate,
        policyCheck.reasons,
        'Policy violation',
        [],
      );
      return {
        trace: this.buildSyntheticPromotionTrace(rejected, policyCheck.reasons),
        candidate: rejected,
        promotionDecision: {
          candidateId,
          decision: 'rejected',
          reasons: policyCheck.reasons,
          benchmarkScore: 0,
          suites: [],
          behavioralFailedCaseIds: [],
        },
      };
    }

    const worktreeEvaluationService = this.evaluationServiceFactory(candidate.worktreePath);
    const repoSuites = worktreeEvaluationService.runNxProjectSuites('agent-engine');
    const benchmarkSuites = [
      ...repoSuites,
      ...(await worktreeEvaluationService.runBehavioralSuites()),
      ...this.benchmarkService.runRegressionPackSuites(candidate.worktreePath),
    ];
    const external = this.benchmarkService.runExternalLane();
    const benchmark = this.benchmarkService.createReport(
      external ? [...benchmarkSuites, external] : benchmarkSuites,
    );
    const promotionDecision = this.promotionService.evaluate(candidate, benchmark, repoSuites);

    const finalCandidate =
      promotionDecision.decision === 'accepted'
        ? this.acceptCandidate(candidate, benchmark.score)
        : await this.rejectCandidate(
            candidate,
            promotionDecision.reasons,
            'Benchmark regression or gate failure',
            promotionDecision.behavioralFailedCaseIds ?? [],
          );

    const trace = this.buildSyntheticPromotionTrace(
      finalCandidate,
      promotionDecision.reasons,
      benchmarkSuites,
      benchmark,
    );
    return { trace, candidate: finalCandidate, promotionDecision };
  }

  private acceptCandidate(candidate: CandidateRevision, benchmarkScore: number): CandidateRevision {
    return this.candidateRepository.update(candidate.id, (current) => ({
      ...current,
      status: 'accepted',
      decisionReason: `Accepted with benchmark score ${benchmarkScore.toFixed(2)}.`,
      rollback: current.rollback
        ? {
            ...current.rollback,
            status: 'not_needed',
            reason: 'Promotion accepted',
          }
        : undefined,
    }));
  }

  private async rejectCandidate(
    candidate: CandidateRevision,
    reasons: string[],
    rejectionType: string,
    failedCaseIds: string[] = [],
  ): Promise<CandidateRevision> {
    try {
      this.worktreeService.remove(candidate.worktreePath, candidate.branchName);
    } catch (error) {
      reasons = [...reasons, `Rollback worktree cleanup failed: ${(error as Error).message}`];
    }

    const updated = this.candidateRepository.update(candidate.id, (current) => ({
      ...current,
      status: 'rejected',
      decisionReason: reasons.join(' | '),
      rollback: current.rollback
        ? {
            ...current.rollback,
            status: 'applied',
            appliedAt: new Date().toISOString(),
            reason: rejectionType,
          }
        : undefined,
    }));

    await this.memoryClient.logAntiPattern(
      `${rejectionType}: ${candidate.id}`,
      reasons.join('\n'),
      {
        candidateId: candidate.id,
        filesTouched: candidate.filesTouched,
        rollbackRef: candidate.rollbackRef,
        failedCaseIds,
      },
    );

    return updated;
  }

  private buildSyntheticPromotionTrace(
    candidate: CandidateRevision,
    reasons: string[],
    suites: EvalSuiteResult[] = [],
    benchmark = this.benchmarkService.createReport(suites),
  ): RunTrace {
    const now = new Date().toISOString();
    const task: TaskSpec = {
      id: candidate.id,
      title: `Promote candidate ${candidate.id}`,
      objective: candidate.reason,
      constraints: ['Promotion-only flow'],
      acceptanceCriteria: ['Benchmark score clears threshold', 'No policy violations'],
      affectedProjects: ['agent-engine'],
    };

    return {
      id: randomUUID(),
      task,
      startedAt: now,
      completedAt: now,
      status: candidate.status === 'accepted' ? 'succeeded' : 'failed',
      tools: [],
      filesTouched: candidate.filesTouched,
      reviewerFindings: reasons.map((reason) => ({
        severity: 'warning',
        summary: reason,
      })),
      evalResults: suites,
      roleTransitions: [],
      benchmark,
      candidateId: candidate.id,
      summary: reasons.join('\n') || 'Candidate accepted.',
    };
  }

  private executeTaskLocally(task: TaskSpec): TaskExecutionContext {
    const toolTraces: ToolTrace[] = [];
    const filesTouched = task.filesHint?.slice() ?? [];
    let diff = '';
    let fileContents = '';

    if (/review/i.test(task.title) || /review/i.test(task.objective)) {
      const changedFiles = gitChangedFiles('main').filter((file) =>
        /\.(ts|tsx|js|jsx|py|rs|md)$/.test(file),
      );
      const reviewFiles = changedFiles.slice(0, 10);
      filesTouched.push(...reviewFiles);
      diff = gitDiff('main', reviewFiles);
      fileContents = reviewFiles.map((file) => `## ${file}\n${readTextFile(file)}`).join('\n\n');

      toolTraces.push({
        tool: 'gitChangedFiles',
        command: 'git diff --name-only main...HEAD',
        success: true,
        durationMs: 0,
        outputPreview: reviewFiles.join(', '),
      });
      toolTraces.push({
        tool: 'gitDiff',
        command: 'git diff --no-color main...HEAD',
        success: true,
        durationMs: 0,
        outputPreview: diff.slice(0, 300),
      });
    }

    const gateSuites =
      task.affectedProjects?.includes('agent-engine') ||
      /quality gate|health audit|lint|typecheck|test|build/i.test(task.objective)
        ? this.evaluationService.runNxProjectSuites(task.affectedProjects?.[0] ?? 'agent-engine')
        : [];

    for (const suite of gateSuites) {
      toolTraces.push({
        tool: suite.suite,
        command: suite.suite,
        success: suite.passed,
        durationMs: suite.durationMs,
        outputPreview: suite.details.join('\n').slice(0, 300),
      });
    }

    return {
      toolTraces,
      filesTouched: [...new Set(filesTouched)],
      diff,
      fileContents,
      gateSuites,
      coderSummary:
        this.summarizeSuites(gateSuites) ||
        (diff
          ? `Prepared diff review for ${filesTouched.length} file(s).`
          : 'No local execution performed.'),
    };
  }

  private async runRole(trace: RunTrace, role: AgentRole, userInput: string): Promise<string> {
    const startedAt = new Date().toISOString();
    const response = await this.provider.generateText({
      system: this.getRolePrompt(role),
      user: userInput,
    });
    const completedAt = new Date().toISOString();
    const output = response.text.trim() || `${role} completed without additional output.`;

    const transition: RoleTransition = {
      role,
      startedAt,
      completedAt,
      summary: output.split(/\r?\n/)[0] ?? `${role} completed.`,
      output,
    };
    trace.roleTransitions.push(transition);

    return output;
  }

  private summarizeSuites(results: EvalSuiteResult[]): string {
    if (results.length === 0) {
      return 'No gate suites executed.';
    }

    return results
      .map(
        (suite) =>
          `${suite.suite}: ${suite.passed ? 'PASS' : 'FAIL'} (score=${suite.score.toFixed(2)}, threshold=${suite.threshold.toFixed(2)})`,
      )
      .join('\n');
  }

  private buildTraceSummary(task: TaskSpec, workflowState: WorkflowState): string {
    return [
      `Task: ${task.title}`,
      `Plan: ${workflowState.plan}`,
      `Execution: ${workflowState.code}`,
      `Review: ${workflowState.review}`,
      `Gatekeeper: ${workflowState.gateSummary}`,
      `Self-improver: ${workflowState.selfImprovement}`,
      `Supervisor: ${workflowState.supervisorDecision}`,
    ].join('\n\n');
  }

  /**
   * Trigger a learning sync if the last sync was more than LEARNING_SYNC_INTERVAL_MS ago.
   * Fire-and-forget: never throws, never blocks. Persists last-sync epoch to disk.
   */
  private async maybeTriggerLearningSync(): Promise<void> {
    try {
      const statePath = join(PATHS.memoryDir, LEARNING_SYNC_STATE_FILE);
      mkdirSync(PATHS.memoryDir, { recursive: true });

      let lastSyncMs = 0;
      if (existsSync(statePath)) {
        try {
          const raw = JSON.parse(readFileSync(statePath, 'utf-8')) as { lastSyncMs?: number };
          lastSyncMs = typeof raw.lastSyncMs === 'number' ? raw.lastSyncMs : 0;
        } catch {
          lastSyncMs = 0;
        }
      }

      const now = Date.now();
      if (now - lastSyncMs < LEARNING_SYNC_INTERVAL_MS) {
        return;
      }

      const result = await this.memoryClient.syncFromLearning(lastSyncMs || undefined);
      if (result) {
        writeFileSync(
          statePath,
          JSON.stringify({ lastSyncMs: now, lastResult: result }, null, 2),
          'utf-8',
        );
      }
    } catch {
      // never let sync failures affect task execution
    }
  }

  private formatLearningContext(ctx: AgentLearningContext | null): string {
    if (!ctx) {
      return '- unavailable';
    }
    const lines: string[] = [];
    lines.push(
      `Stats: ${ctx.stats.totalExecutions} runs, ${(ctx.stats.successRate * 100).toFixed(0)}% success, avg ${Math.round(ctx.stats.avgExecutionTime)}ms`,
    );
    if (ctx.knownMistakes.length > 0) {
      lines.push('Known mistakes to avoid:');
      for (const m of ctx.knownMistakes.slice(0, 5)) {
        lines.push(`  - [${m.severity}] ${m.type}: ${m.description}`);
      }
    }
    if (ctx.knownPatterns.length > 0) {
      lines.push('Known success patterns:');
      for (const p of ctx.knownPatterns.slice(0, 5)) {
        lines.push(`  - ${p.type} (conf=${p.confidence.toFixed(2)}): ${p.description}`);
      }
    }
    if (ctx.recentExecutions.length > 0) {
      lines.push('Recent executions:');
      for (const e of ctx.recentExecutions.slice(0, 5)) {
        lines.push(`  - ${e.success ? 'OK' : 'FAIL'} ${e.taskType}: ${e.description}`);
      }
    }
    return lines.join('\n') || '- empty';
  }

  private hasBlockingFailures(trace: RunTrace): boolean {
    return (
      trace.evalResults.some((suite) => !suite.passed) ||
      trace.reviewerFindings.some((finding) => finding.severity === 'critical')
    );
  }

  private getRolePrompt(role: keyof typeof DEFAULT_POLICY_BUNDLE.roles): string {
    const prompt = DEFAULT_POLICY_BUNDLE.roles[role];
    if (!prompt) {
      throw new Error(`Missing role prompt for ${role}`);
    }
    return prompt;
  }
}
