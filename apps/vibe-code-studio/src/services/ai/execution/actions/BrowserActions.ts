/**
 * Browser Action Executor — spec 11 Phase 1 (/browser capability)
 *
 * Routes agent `browser_action` steps through the permission-gated
 * BrowserSessionService (playwright MCP). The first action of a task
 * triggers the user permission prompt; every result — including denials
 * and browser failures — returns as structured StepResult data the agent
 * can react to (spec AC #1/#10).
 */
import { getBrowserSessionService } from '../../../browser/BrowserSessionService';
import type { ActionContext, StepResult } from '../types';

/** Refusal codes where a retry would just re-prompt or re-fail identically */
const NON_RETRYABLE_CODES = new Set(['permission_denied', 'unsupported_environment']);

/**
 * Execute a single allowlisted browser action
 * (navigate / click / type / snapshot / read_console / screenshot)
 */
export async function executeBrowserAction(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  const service = getBrowserSessionService();
  // BackgroundAgentSystem injects its task id at the step boundary so
  // sessions + screenshot artifacts group under the task the user sees.
  const taskId =
    typeof params['backgroundTaskId'] === 'string'
      ? params['backgroundTaskId']
      : (context.taskState.task?.id ?? 'unknown-task');
  const intent = context.taskState.userRequest || 'Verify UI changes in a real browser';

  const ensured = await service.ensureSession(taskId, intent);
  if (!ensured.ok) {
    return {
      success: false,
      skipped: NON_RETRYABLE_CODES.has(ensured.error.code),
      data: { error: ensured.error },
      message: `Browser session unavailable (${ensured.error.code}): ${ensured.error.message}`,
    };
  }

  const result = await service.performAction(taskId, params);
  return {
    success: result.ok,
    data: result,
    message: result.ok
      ? `Browser action ${result.action} completed`
      : `Browser action ${result.action} failed (${result.error?.code}): ${result.error?.message}`,
  };
}
