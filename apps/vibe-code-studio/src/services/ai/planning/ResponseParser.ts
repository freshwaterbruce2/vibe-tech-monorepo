/**
 * Response Parser Module
 *
 * Parses AI responses into structured task plans.
 * Handles various response formats and fallbacks.
 */
import { logger } from '../../../services/Logger';
import type { StructuredAgentPlan } from '../../agent-runtime/contracts/AgentPlan';

import type { ActionType, AgentStep, AgentTask, StepAction, TaskPlanRequest } from './types';

/** Valid action types */
const VALID_ACTION_TYPES: ActionType[] = [
  'read_file',
  'write_file',
  'edit_file',
  'delete_file',
  'create_directory',
  'run_command',
  'search_codebase',
  'analyze_code',
  'refactor_code',
  'generate_code',
  'run_tests',
  'git_commit',
  'review_project',
  'browser_action',
  'custom',
];

/** Actions that should require approval */
const DESTRUCTIVE_ACTIONS: ActionType[] = [
  'delete_file',
  'write_file',
  'edit_file',
  'create_directory',
  'run_command',
  'git_commit',
];
const SAFE_NX_PROJECT_NAME = /^@?[a-zA-Z0-9][a-zA-Z0-9._-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)?$/;
const SAFE_NX_VALIDATION_TARGETS = new Set(['typecheck', 'lint', 'test', 'build']);
const INSPECTION_ACTION_TYPES = new Set(['read_file', 'analyze_code', 'search_codebase']);
const DISPLAY_SYNTHESIS_INTENT =
  /\b(?:synthesis|synthesi[sz]e|summar(?:y|ize|ise)|review|report|findings?|assessment)\b/i;

/**
 * Parses AI response into structured AgentTask
 */
export function parseTaskPlan(
  aiResponse: string,
  userRequest: string,
  options?: TaskPlanRequest['options']
): AgentTask {
  try {
    // Validate aiResponse exists
    if (!aiResponse || typeof aiResponse !== 'string') {
      logger.error('Invalid AI response:', aiResponse);
      throw new Error('AI response is empty or invalid');
    }

    logger.debug(
      '[ResponseParser] Raw AI response (first 500 chars):',
      aiResponse.substring(0, 500)
    );

    // Extract JSON from response
    const jsonStr = extractJsonFromResponse(aiResponse);

    if (!jsonStr) {
      logger.error('[ResponseParser] Could not extract valid JSON from response');
      throw new Error('Could not extract JSON from AI response');
    }

    logger.debug(
      '[ResponseParser] Attempting to parse JSON (first 300 chars):',
      jsonStr.substring(0, 300)
    );
    const parsed = JSON.parse(jsonStr);
    logger.debug('[ResponseParser] Successfully parsed JSON');

    // Create task
    return buildTaskFromParsed(parsed, userRequest, options);
  } catch (error) {
    logger.error('Failed to parse task plan:', error);

    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Planning response was not executable: ${detail}`);
  }
}

/**
 * Extracts JSON from various AI response formats
 */
function extractJsonFromResponse(aiResponse: string): string | null {
  let jsonStr = aiResponse;

  // Try 1: Extract from markdown code blocks
  const codeBlockMatch = aiResponse.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch?.[1]) {
    logger.debug('[ResponseParser] Found JSON in markdown code block');
    return codeBlockMatch[1].trim();
  }

  // Try 2: Find JSON object with taskId
  const jsonObjectMatch = aiResponse.match(/\{[\s\S]*"taskId"[\s\S]*\}/);
  if (jsonObjectMatch) {
    logger.debug('[ResponseParser] Found JSON object in text');
    return jsonObjectMatch[0].trim();
  }

  // Try 3: Look for any valid JSON structure by brace positions
  const startIndex = aiResponse.indexOf('{');
  const endIndex = aiResponse.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    logger.debug('[ResponseParser] Extracting JSON by brace positions');
    jsonStr = aiResponse.substring(startIndex, endIndex + 1).trim();

    if (jsonStr.startsWith('{')) {
      return jsonStr;
    }
  }

  return null;
}

/**
 * Builds AgentTask from parsed JSON
 */
type ParsedTaskJson = {
  title?: string;
  description?: string;
  steps: Array<{
    order?: number;
    title: string;
    description: string;
    action: { type: string; params?: Record<string, unknown> };
    requiresApproval?: boolean;
    maxRetries?: number;
  }>;
};

function validateParsedTask(parsed: unknown): asserts parsed is ParsedTaskJson {
  if (!parsed || typeof parsed !== 'object') throw new Error('plan must be a JSON object');
  const candidate = parsed as Partial<ParsedTaskJson>;
  if (!Array.isArray(candidate.steps) || candidate.steps.length === 0) {
    throw new Error('plan must contain at least one step');
  }
  candidate.steps.forEach((step, index) => {
    if (!step || typeof step !== 'object') throw new Error(`step ${index + 1} is invalid`);
    if (typeof step.title !== 'string' || !step.title.trim())
      throw new Error(`step ${index + 1} is missing title`);
    if (typeof step.description !== 'string' || !step.description.trim())
      throw new Error(`step ${index + 1} is missing description`);
    if (!step.action || typeof step.action.type !== 'string')
      throw new Error(`step ${index + 1} is missing action`);
  });
}

function buildTaskFromParsed(
  parsed: ParsedTaskJson,
  userRequest: string,
  options?: TaskPlanRequest['options']
): AgentTask {
  validateParsedTask(parsed);
  // Create task ID
  const taskId = `task_${crypto.randomUUID()}`;

  // Build steps
  const steps: AgentStep[] = parsed.steps.map((step, index: number) => {
    const action = validateAction(step.action);
    const normalizedAction = shouldUseDisplaySynthesis(parsed.steps, index, step, action)
      ? {
          ...action,
          params: { ...action.params, displayOnly: true },
        }
      : action;
    // Always check shouldRequireApproval - it overrides AI's decision for destructive actions
    const systemRequiresApproval = shouldRequireApproval(normalizedAction, options);

    return {
      id: `${taskId}_step_${index + 1}`,
      taskId,
      order: index + 1,
      title: step.title,
      description: step.description,
      action: normalizedAction,
      status: 'pending' as const,
      // System safety fills in when the AI omits an explicit approval choice
      requiresApproval: systemRequiresApproval || step.requiresApproval === true,
      retryCount: 0,
      maxRetries: step.maxRetries ?? 3,
    };
  });

  // Create task
  return {
    id: taskId,
    title: parsed.title ?? generateTitle(userRequest),
    description: parsed.description ?? userRequest,
    userRequest,
    steps,
    // Planning has completed schema validation, but execution has not started.
    // TaskLifecycle owns the executing/awaiting-approval transitions.
    status: 'planning',
    createdAt: new Date(),
  };
}

function shouldUseDisplaySynthesis(
  steps: ParsedTaskJson['steps'],
  index: number,
  step: ParsedTaskJson['steps'][number],
  action: StepAction
): boolean {
  if (index !== steps.length - 1 || action.type !== 'generate_code') return false;
  if (typeof action.params['filePath'] === 'string') return false;
  const inspectionCount = steps
    .slice(0, index)
    .filter(candidate => INSPECTION_ACTION_TYPES.has(candidate.action.type)).length;
  if (inspectionCount < 2) return false;
  const description =
    typeof action.params['description'] === 'string' ? action.params['description'] : '';
  return DISPLAY_SYNTHESIS_INTENT.test(`${step.title}\n${step.description}\n${description}`);
}

/** Converts an already-decoded agent_plan_v1 value without free-form extraction. */
export function createTaskFromStructuredPlan(
  plan: StructuredAgentPlan,
  userRequest: string,
  options?: TaskPlanRequest['options']
): AgentTask {
  return buildTaskFromParsed(plan, userRequest, options);
}

/**
 * Validates and sanitizes action parameters
 */
function requireNonEmptyString(
  actionType: string,
  params: Record<string, unknown>,
  name: string
): string {
  const value = params[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${actionType} requires a non-empty ${name}`);
  }
  return value.trim();
}

function validateRunTestsParams(params: Record<string, unknown>): void {
  const projectName = requireNonEmptyString('run_tests', params, 'projectName');
  if (!SAFE_NX_PROJECT_NAME.test(projectName)) {
    throw new Error('run_tests requires a safe Nx projectName');
  }
  const targets = params['targets'];
  const candidates =
    targets === undefined ? ['test'] : Array.isArray(targets) ? targets : [targets];
  const valid =
    candidates.length > 0 &&
    candidates.length <= 5 &&
    candidates.every(
      target => typeof target === 'string' && SAFE_NX_VALIDATION_TARGETS.has(target.trim())
    );
  if (!valid) throw new Error('run_tests targets must use typecheck, lint, test, or build');
}

function validateSearchQuery(params: Record<string, unknown>): void {
  const value = params['searchQuery'];
  const validString = typeof value === 'string' && value.trim().length > 0;
  const validList =
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(query => typeof query === 'string' && query.trim().length > 0);
  if (!validString && !validList) {
    throw new Error('search_codebase requires a non-empty searchQuery string or string array');
  }
}

export function validateAction(action: {
  type: string;
  params?: Record<string, unknown>;
}): StepAction {
  if (!VALID_ACTION_TYPES.includes(action.type as ActionType)) {
    throw new Error(`Invalid action type: ${action.type}`);
  }

  const params = action.params ?? {};
  const requireString = (name: string) => requireNonEmptyString(action.type, params, name);
  if (['read_file', 'delete_file'].includes(action.type)) requireString('filePath');
  if (['write_file', 'edit_file'].includes(action.type)) {
    requireString('filePath');
    if (typeof params['content'] !== 'string' && typeof params['newContent'] !== 'string') {
      throw new Error(`${action.type} requires content or newContent`);
    }
  }
  if (action.type === 'generate_code') {
    requireString('description');
    if (params['filePath'] !== undefined) requireString('filePath');
  }
  if (action.type === 'run_command') requireString('command');
  if (action.type === 'run_tests') validateRunTestsParams(params);
  if (action.type === 'search_codebase') validateSearchQuery(params);

  return {
    type: action.type as ActionType,
    params,
  };
}

/**
 * Determines if an action should require approval
 */
export function shouldRequireApproval(
  action: StepAction,
  options?: TaskPlanRequest['options']
): boolean {
  // Always require approval for destructive actions
  if (DESTRUCTIVE_ACTIONS.includes(action.type)) {
    return true;
  }
  if (action.type === 'generate_code' && typeof action.params['filePath'] === 'string') {
    return true;
  }

  // If option requires approval for all, return true
  if (options?.requireApprovalForAll) {
    return true;
  }

  return false;
}

/**
 * Generates a title from user request
 */
export function generateTitle(userRequest: string): string {
  const firstSentence = userRequest.split(/[.!?]/)[0];
  if (!firstSentence) {
    return userRequest.substring(0, 50);
  }
  return firstSentence.length > 50 ? `${firstSentence.substring(0, 47)}...` : firstSentence;
}

/**
 * Extracts reasoning from AI response
 */
export function extractReasoning(aiResponse: string): string {
  if (!aiResponse || typeof aiResponse !== 'string') {
    return 'Task decomposed into executable steps';
  }

  try {
    const jsonMatch =
      aiResponse.match(/```json\n([\s\S]*?)\n```/) ?? aiResponse.match(/```\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;

    if (!jsonStr) {
      return 'Task decomposed into executable steps';
    }

    const parsed = JSON.parse(jsonStr);
    return parsed.reasoning ?? 'No reasoning provided';
  } catch {
    // Extract reasoning from text if JSON parsing fails
    const reasoningMatch = aiResponse.match(/reasoning[":]+\s*([^,\n}]+)/i);
    return reasoningMatch?.[1]?.trim() ?? 'Task decomposed into executable steps';
  }
}

/**
 * Extracts warnings from AI response and validates task safety
 */
export function extractWarnings(aiResponse: string, task: AgentTask): string[] {
  const warnings: string[] = [];

  try {
    const jsonMatch =
      aiResponse.match(/```json\n([\s\S]*?)\n```/) ?? aiResponse.match(/```\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;

    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      if (parsed.warnings && Array.isArray(parsed.warnings)) {
        warnings.push(...parsed.warnings);
      }
    }
  } catch {
    // Ignore parsing errors
  }

  // Add automatic warnings based on actions
  const hasDeleteActions = task.steps.some(step => step.action.type === 'delete_file');
  if (hasDeleteActions) {
    warnings.push('This task includes file deletions - changes may not be reversible');
  }

  const hasGitCommit = task.steps.some(step => step.action.type === 'git_commit');
  if (hasGitCommit) {
    warnings.push('This task will create git commits');
  }

  const hasCommands = task.steps.some(step => step.action.type === 'run_command');
  if (hasCommands) {
    warnings.push('This task will execute terminal commands');
  }

  if (task.steps.length > 8) {
    warnings.push(
      `This is a complex task with ${task.steps.length} steps - it may take several minutes`
    );
  }

  return warnings;
}

/**
 * Validates a task before execution
 */
export function validateTask(task: AgentTask): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!task.steps || task.steps.length === 0) {
    errors.push('Task has no steps');
  }

  task.steps.forEach((step, index) => {
    if (!step.action?.type) {
      errors.push(`Step ${index + 1} has no action type`);
    }

    if (!step.title) {
      errors.push(`Step ${index + 1} has no title`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
