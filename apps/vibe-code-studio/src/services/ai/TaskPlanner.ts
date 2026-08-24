/**
 * TaskPlanner Service (Refactored)
 *
 * Responsible for breaking down user requests into executable steps using AI.
 * This is the core of Agent Mode's intelligence.
 *
 * This is a facade that delegates to modular components:
 * - ProjectAnalyzer: Project analysis before planning
 * - PromptBuilder: AI prompt construction
 * - ResponseParser: Parse AI responses into tasks
 * - ConfidenceCalculator: Step confidence and fallbacks
 */
import { logger } from '../../services/Logger';
import {
  AGENT_PLAN_JSON_SCHEMA,
  decodeStructuredAgentPlan,
  SUBMIT_AGENT_PLAN_TOOL,
  type StructuredAgentPlan,
} from '../agent-runtime/contracts/AgentPlan';
import type {
  AgentStep,
  AgentTask,
  AgentTaskMetadata,
  EnhancedAgentStep,
  PlanningInsights,
  TaskPlanRequest,
  TaskPlanResponse,
} from '../../types';
import { ProjectStructureDetector } from '../../utils/ProjectStructureDetector';
import type { FileSystemService } from '../FileSystemService';

import type { PlanningContext } from './planning/types';
// Import from modular planning system
import {
  analyzeProjectBeforePlanning,
  buildPlanningPrompt,
  calculateStepConfidence,
  estimateSuccessRate,
  estimateTime,
  extractWarnings,
  generateFallbackPlans,
  type StepConfidence,
  validateTask,
} from './planning';
import { createTaskFromStructuredPlan } from './planning/ResponseParser';
import {
  bindFinalAttemptInspectionRequirements,
  bindFinalAttemptMutationTarget,
  bindFinalAttemptRuntimeParams,
  validateExplicitInspectionIntent,
  validateExplicitMutationIntent,
} from './planning/PlanIntentValidator';
import { validatePlanInspectionTargets } from './planning/PlanTargetValidator';
import { loadAgentsStandardsSection } from './standards/AgentsMdLoader';
import { loadStandardsSettings } from './standards/standardsSettings';
import { StrategyMemory } from './StrategyMemory';
import type { UnifiedAIService } from './UnifiedAIService';

interface StructuredPlanResult {
  plan: StructuredAgentPlan;
  task: AgentTask;
  metadata: AgentTaskMetadata;
}

type PlanningProviderResponse = Awaited<ReturnType<UnifiedAIService['sendContextualMessage']>>;

type PlanAttemptOutcome =
  | { ok: true; result: StructuredPlanResult; totalTokens: number }
  | { ok: false; error: Error; metadata: AgentTaskMetadata; totalTokens: number };

function bindFinalAttemptPlan(
  plan: StructuredAgentPlan,
  userRequest: string,
  attempt: number
): StructuredAgentPlan {
  if (attempt !== 2) return plan;
  const runtimeBound = bindFinalAttemptRuntimeParams(plan);
  const inspectionBound = bindFinalAttemptInspectionRequirements(runtimeBound, userRequest);
  return bindFinalAttemptMutationTarget(inspectionBound, userRequest);
}

export class AgentPlanningError extends Error {
  constructor(
    message: string,
    public readonly metadata?: AgentTaskMetadata
  ) {
    super(message);
    this.name = 'AgentPlanningError';
  }
}

export const AGENT_PLANNING_TIMEOUT_MS = 180_000;

export class AgentPlanningTimeoutError extends AgentPlanningError {
  constructor(metadata?: AgentTaskMetadata) {
    super(
      'Agent planning timed out after 180 seconds. Check the AI provider connection or try a smaller task.',
      metadata
    );
    this.name = 'AgentPlanningTimeoutError';
  }
}

export class AgentPlanningCancelledError extends AgentPlanningError {
  constructor(metadata?: AgentTaskMetadata) {
    super('Agent planning was cancelled before execution started.', metadata);
    this.name = 'AgentPlanningCancelledError';
  }
}

class PlanningAbortScope {
  private readonly controller = new AbortController();
  private readonly timeout: ReturnType<typeof setTimeout>;
  private readonly aborted: Promise<never>;
  private abortKind: 'timeout' | 'cancelled' = 'cancelled';
  private metadata?: AgentTaskMetadata;
  private readonly cancelFromCaller = () => this.abort('cancelled');

  constructor(private readonly callerSignal?: AbortSignal) {
    this.aborted = new Promise((_, reject) => {
      this.controller.signal.addEventListener('abort', () => reject(this.error()), { once: true });
    });
    this.timeout = setTimeout(() => this.abort('timeout'), AGENT_PLANNING_TIMEOUT_MS);
    callerSignal?.addEventListener('abort', this.cancelFromCaller, { once: true });
    if (callerSignal?.aborted) this.abort('cancelled');
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  async race<T>(operation: Promise<T>): Promise<T> {
    return Promise.race([operation, this.aborted]);
  }

  updateMetadata(metadata?: AgentTaskMetadata): void {
    if (metadata) this.metadata = metadata;
  }

  throwIfAborted(): void {
    if (this.signal.aborted) throw this.error();
  }

  dispose(): void {
    clearTimeout(this.timeout);
    this.callerSignal?.removeEventListener('abort', this.cancelFromCaller);
  }

  private abort(kind: 'timeout' | 'cancelled'): void {
    if (this.signal.aborted) return;
    this.abortKind = kind;
    this.controller.abort();
  }

  private error(): AgentPlanningError {
    return this.abortKind === 'timeout'
      ? new AgentPlanningTimeoutError(this.metadata)
      : new AgentPlanningCancelledError(this.metadata);
  }
}

const sanitizeMetadataField = (value: unknown, maxLength = 256): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const sanitized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return sanitized ? sanitized.slice(0, maxLength) : undefined;
};

const sanitizedIssue = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizeMetadataField(message, 320) ?? 'Unknown planning validation failure';
};

export class TaskPlanner {
  private structureDetector: ProjectStructureDetector | null = null;
  private strategyMemory: StrategyMemory;

  constructor(
    private aiService: UnifiedAIService,
    private fileSystemService?: FileSystemService
  ) {
    if (fileSystemService) {
      this.structureDetector = new ProjectStructureDetector(fileSystemService);
    }
    this.strategyMemory = new StrategyMemory();
  }

  /**
   * Plans a task by breaking down the user request into executable steps
   */
  async planTask(request: TaskPlanRequest): Promise<TaskPlanResponse> {
    const abortScope = new PlanningAbortScope(request.signal);
    try {
      return await abortScope.race(
        this.planTaskWithinDeadline({ ...request, signal: abortScope.signal }, abortScope)
      );
    } finally {
      abortScope.dispose();
    }
  }

  private async planTaskWithinDeadline(
    request: TaskPlanRequest,
    abortScope: PlanningAbortScope
  ): Promise<TaskPlanResponse> {
    const { userRequest, context, options } = request;
    abortScope.throwIfAborted();

    // Phase 1: Analyze project BEFORE planning
    logger.debug('[TaskPlanner] 🔍 Phase 1: Analyzing project before planning...');
    const projectAnalysis = await analyzeProjectBeforePlanning(
      context.workspaceRoot,
      this.fileSystemService
    );
    abortScope.throwIfAborted();

    const projectStructure = await this.detectProjectStructure(context.workspaceRoot);
    abortScope.throwIfAborted();

    // AGENTS.md standards (spec 03) — never throws, '' when absent or when
    // the "Read AGENTS.md files" settings toggle is off (AC #10).
    const agentStandards =
      this.fileSystemService && (await loadStandardsSettings()).agentsMd
        ? await loadAgentsStandardsSection(
            { readFile: path => this.fileSystemService!.readFile(path) },
            context.workspaceRoot,
            context.currentFile
          )
        : '';
    abortScope.throwIfAborted();

    // Build planning context
    const planningContext: PlanningContext = {
      userRequest,
      workspaceRoot: context.workspaceRoot,
      openFiles: context.openFiles ?? [],
      currentFile: context.currentFile,
      recentFiles: context.recentFiles ?? [],
      projectStructure: projectStructure ?? undefined,
      projectAnalysis,
      agentStandards,
      maxSteps: options?.maxSteps ?? 10,
      allowDestructive: options?.allowDestructiveActions ?? true,
    };

    const planningPrompt = buildPlanningPrompt(planningContext);

    const planResult = await this.requestStructuredPlan(planningPrompt, request, abortScope);
    const { plan: structuredPlan, task, metadata } = planResult;
    task.metadata = metadata;

    // Extract reasoning and warnings
    const reasoning = structuredPlan.reasoning;
    const warnings = extractWarnings(JSON.stringify(structuredPlan), task);

    return {
      task,
      reasoning,
      estimatedTime: estimateTime(task.steps.length),
      warnings,
    };
  }

  private async requestStructuredPlan(
    planningPrompt: string,
    request: TaskPlanRequest,
    abortScope: PlanningAbortScope
  ): Promise<StructuredPlanResult> {
    let lastError: Error | undefined;
    let lastMetadata: AgentTaskMetadata | undefined;
    let totalTokens = 0;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      abortScope.throwIfAborted();
      logger.debug(`[TaskPlanner] Requesting structured plan (attempt ${attempt}/2)`);
      const outcome = await this.runPlanAttempt(
        planningPrompt,
        request,
        attempt,
        totalTokens,
        lastError,
        lastMetadata
      );
      totalTokens = outcome.totalTokens;
      abortScope.updateMetadata(outcome.ok ? outcome.result.metadata : outcome.metadata);
      abortScope.throwIfAborted();
      if (outcome.ok) return outcome.result;
      lastError = outcome.error;
      lastMetadata = outcome.metadata;
      logger.warn(
        `[TaskPlanner] Structured plan attempt ${attempt} rejected: ${lastError.message}`
      );
    }
    throw new AgentPlanningError(
      `Agent planning failed after 2 structured-output attempts: ${sanitizedIssue(lastError)}`,
      lastMetadata
    );
  }

  private async runPlanAttempt(
    planningPrompt: string,
    request: TaskPlanRequest,
    attempt: number,
    totalTokens: number,
    previousError?: Error,
    previousMetadata?: AgentTaskMetadata
  ): Promise<PlanAttemptOutcome> {
    let response: PlanningProviderResponse;
    try {
      response = await this.aiService.sendContextualMessage(
        this.buildStructuredRequest(planningPrompt, request, attempt, previousError)
      );
    } catch (error) {
      const failure = this.buildRequestFailureMetadata(attempt, totalTokens, error);
      this.copyProviderMetadata(previousMetadata, failure);
      return { ok: false, error: this.asError(error), metadata: failure, totalTokens };
    }
    const nextTotal = totalTokens + (response.usage?.totalTokens ?? 0);
    return this.decodePlanAttempt(response, request, attempt, nextTotal);
  }

  private async decodePlanAttempt(
    response: PlanningProviderResponse,
    request: TaskPlanRequest,
    attempt: number,
    totalTokens: number
  ): Promise<PlanAttemptOutcome> {
    const submittedPlan = response.toolCalls?.find(
      toolCall => toolCall.function.name === SUBMIT_AGENT_PLAN_TOOL.function.name
    );
    const responseShape = submittedPlan
      ? ('submit_agent_plan_tool_call' as const)
      : ('json_schema_content' as const);
    const metadata = this.buildPlanningMetadata(
      response,
      responseShape,
      attempt,
      totalTokens,
      false
    );
    try {
      const decodedPlan = decodeStructuredAgentPlan(
        submittedPlan?.function.arguments ?? response.content
      );
      const plan = bindFinalAttemptPlan(decodedPlan, request.userRequest, attempt);
      // Keep executable-action validation inside the structured retry boundary.
      // Convert the decoded contract directly; do not route it through free-form extraction.
      validateExplicitMutationIntent(plan, request.userRequest);
      validateExplicitInspectionIntent(plan, request.userRequest);
      await validatePlanInspectionTargets(
        plan,
        request.context.workspaceRoot,
        this.fileSystemService
      );
      const task = createTaskFromStructuredPlan(plan, request.userRequest, request.options);
      metadata.validationSummary = {
        schemaVersion: 1,
        valid: true,
        attemptCount: attempt,
        stepCount: plan.steps.length,
        actionTypes: [...new Set(plan.steps.map(step => step.action.type))],
      };
      return { ok: true, result: { plan, task, metadata }, totalTokens };
    } catch (error) {
      metadata.validationSummary = {
        schemaVersion: 1,
        valid: false,
        attemptCount: attempt,
        issues: [sanitizedIssue(error)],
      };
      return { ok: false, error: this.asError(error), metadata, totalTokens };
    }
  }

  private buildStructuredRequest(
    planningPrompt: string,
    request: TaskPlanRequest,
    attempt: number,
    previousError?: Error
  ) {
    const retryNote =
      attempt === 1
        ? ''
        : `\n\nYour previous response violated agent_plan_v1: ${sanitizedIssue(previousError)}. ` +
          'Return a fresh schema-valid plan. If the issue names a required mutation path, copy ' +
          'that exact path into action.params.filePath on the write_file, edit_file, or ' +
          'generate_code mutation step. A targeted final generate_code step satisfies synthesis; ' +
          'do not replace it with a filePath-less synthesis action. If the issue names required ' +
          'inspection evidence, add matching read_file, analyze_code, or search_codebase steps.';
    const protocol =
      attempt === 1
        ? {
            responseFormat: {
              type: 'json_schema' as const,
              jsonSchema: {
                name: 'agent_plan_v1',
                strict: true as const,
                schema: AGENT_PLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
              },
            },
          }
        : { tools: [SUBMIT_AGENT_PLAN_TOOL], toolChoice: 'required' as const };
    return {
      ...this.buildAiContextRequest(`${planningPrompt}${retryNote}`, request),
      ...protocol,
      providerPreferences: { requireParameters: true },
    };
  }

  private copyProviderMetadata(
    source: AgentTaskMetadata | undefined,
    target: AgentTaskMetadata
  ): void {
    if (source?.provider) target.provider = source.provider;
    if (!target.model && source?.model) target.model = source.model;
    if (!target.requestedModel && source?.requestedModel) {
      target.requestedModel = source.requestedModel;
    }
    if (!target.resolvedModel && source?.resolvedModel) target.resolvedModel = source.resolvedModel;
    if (source?.requestId) target.requestId = source.requestId;
    if (source?.finishReason) target.finishReason = source.finishReason;
  }

  private asError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  private buildPlanningMetadata(
    response: PlanningProviderResponse,
    responseShape: NonNullable<AgentTaskMetadata['responseShape']>,
    attemptCount: number,
    tokensUsed: number,
    valid: boolean
  ): AgentTaskMetadata {
    const metadata: AgentTaskMetadata = {
      planningProtocol: 'agent_plan_v1',
      responseShape,
      tokensUsed,
      validationSummary: { schemaVersion: 1, valid, attemptCount },
    };
    const provider = sanitizeMetadataField(response.provider);
    const requestedModel = this.selectedModel();
    const resolvedModel = sanitizeMetadataField(response.model);
    const model = resolvedModel ?? requestedModel;
    const requestId = sanitizeMetadataField(response.requestId);
    const finishReason = sanitizeMetadataField(response.finishReason);
    if (provider) metadata.provider = provider;
    if (model) metadata.model = model;
    if (requestedModel) metadata.requestedModel = requestedModel;
    if (resolvedModel) metadata.resolvedModel = resolvedModel;
    if (requestId) metadata.requestId = requestId;
    if (finishReason) metadata.finishReason = finishReason;
    return metadata;
  }

  private buildRequestFailureMetadata(
    attemptCount: number,
    tokensUsed: number,
    error: unknown
  ): AgentTaskMetadata {
    const metadata: AgentTaskMetadata = {
      planningProtocol: 'agent_plan_v1',
      responseShape: attemptCount === 1 ? 'json_schema_content' : 'submit_agent_plan_tool_call',
      tokensUsed,
      validationSummary: {
        schemaVersion: 1,
        valid: false,
        attemptCount,
        issues: [sanitizedIssue(error)],
      },
    };
    const model = this.selectedModel();
    if (model) {
      metadata.model = model;
      metadata.requestedModel = model;
    }
    return metadata;
  }

  private selectedModel(): string | undefined {
    const service = this.aiService as UnifiedAIService & { getModel?: () => string };
    return typeof service.getModel === 'function'
      ? sanitizeMetadataField(service.getModel())
      : undefined;
  }

  /** Detects project structure, tolerating web-mode/detector failures. */
  private async detectProjectStructure(workspaceRoot: string) {
    if (!this.structureDetector || !workspaceRoot) {
      return null;
    }
    try {
      const structure = await this.structureDetector.detectStructure(workspaceRoot);
      logger.debug(
        '[TaskPlanner] Detected project structure:',
        ProjectStructureDetector.formatSummary(structure)
      );
      return structure;
    } catch (error) {
      const isWebMode = !window.electron?.isElectron;
      if (isWebMode) {
        logger.warn('[TaskPlanner] Project structure detection failed in web mode.');
      } else {
        logger.error('[TaskPlanner] Failed to detect project structure:', error);
      }
      return null;
    }
  }

  /** Wraps the planning prompt in the AIContextRequest shape the AI service expects. */
  private buildAiContextRequest(planningPrompt: string, request: TaskPlanRequest) {
    const { context, currentFileObject } = request;
    return {
      userQuery: planningPrompt,
      workspaceContext: {
        rootPath: context.workspaceRoot,
        totalFiles: 0,
        languages: ['TypeScript', 'JavaScript'],
        testFiles: 0,
        projectStructure: {},
        dependencies: {},
        exports: {},
        symbols: {},
        lastIndexed: new Date(),
        summary: 'Vibe Code Studio workspace',
      },
      currentFile:
        currentFileObject ??
        (context.currentFile
          ? {
              path: context.currentFile,
              language: 'typescript',
              content: '',
            }
          : undefined),
      fileContent: currentFileObject?.content,
      relatedFiles: [],
      conversationHistory: [],
      signal: request.signal,
    };
  }

  /**
   * Plan task with confidence scores and fallbacks (Phase 6)
   */
  async planTaskWithConfidence(
    request: TaskPlanRequest,
    memory: StrategyMemory
  ): Promise<TaskPlanResponse & { insights: PlanningInsights }> {
    // Generate base plan
    const basePlan = await this.planTask(request);

    // Enhance each step with confidence
    let totalConfidence = 0;
    let highRiskCount = 0;
    let memoryBackedCount = 0;
    let fallbackCount = 0;

    for (const step of basePlan.task.steps) {
      // Calculate confidence
      const confidence = await calculateStepConfidence(step, memory);
      (step as EnhancedAgentStep).confidence = confidence;
      totalConfidence += confidence.score;

      if (confidence.riskLevel === 'high') {
        highRiskCount++;
      }
      if (confidence.memoryBacked) {
        memoryBackedCount++;
      }

      // Generate fallbacks for risky steps
      const fallbacks = await generateFallbackPlans(step, confidence);
      if (fallbacks.length > 0) {
        (step as EnhancedAgentStep).fallbackPlans = fallbacks;
        fallbackCount += fallbacks.length;
      }
    }

    const stepCount = basePlan.task.steps.length;
    const insights: PlanningInsights = {
      overallConfidence: totalConfidence / stepCount,
      highRiskSteps: highRiskCount,
      memoryBackedSteps: memoryBackedCount,
      fallbacksGenerated: fallbackCount,
      estimatedSuccessRate: estimateSuccessRate(
        totalConfidence / stepCount,
        memoryBackedCount / stepCount
      ),
    };

    return {
      ...basePlan,
      insights,
    };
  }

  /**
   * Plan task with enhanced confidence (convenience wrapper)
   */
  async planTaskEnhanced(
    request: TaskPlanRequest
  ): Promise<TaskPlanResponse & { insights: PlanningInsights }> {
    logger.debug('[TaskPlanner] 🎯 Using Phase 6 enhanced planning with confidence scores...');
    return this.planTaskWithConfidence(request, this.strategyMemory);
  }

  /**
   * Validates task before execution
   */
  validateTask(task: AgentTask): { valid: boolean; errors: string[] } {
    return validateTask(task);
  }

  /**
   * Calculate confidence for a single step
   */
  async calculateStepConfidence(step: AgentStep, memory: StrategyMemory) {
    return calculateStepConfidence(step, memory);
  }

  /**
   * Generate fallback plans for a step
   */
  async generateFallbackPlans(step: AgentStep, confidence: StepConfidence) {
    return generateFallbackPlans(step, confidence);
  }
}
