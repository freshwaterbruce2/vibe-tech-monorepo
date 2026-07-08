/**
 * browser_action executor tests — registry wiring, task-id resolution (the
 * BackgroundAgentSystem-injected backgroundTaskId wins over the planner task
 * id), permission-refusal handling (non-retryable refusals mark the step
 * skipped), and structured pass-through of BrowserActionResults (AC #10).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createActionRegistry,
  executeAction,
  executeBrowserAction,
} from '../../../../services/ai/execution/actions';
import type { ActionContext } from '../../../../services/ai/execution/types';
import type { BrowserSessionService } from '../../../../services/browser/BrowserSessionService';
import { setBrowserSessionServiceForTests } from '../../../../services/browser/BrowserSessionService';
import type { BrowserActionResult } from '../../../../services/browser/types';

interface StubOptions {
  ensure?: { ok: boolean; code?: string; message?: string };
  result?: BrowserActionResult;
}

function stubService(options: StubOptions = {}) {
  const ensure = options.ensure ?? { ok: true };
  const service = {
    ensureSession: vi.fn(async () =>
      ensure.ok
        ? { ok: true, session: { taskId: 't' } }
        : { ok: false, error: { code: ensure.code, message: ensure.message ?? 'refused' } }
    ),
    performAction: vi.fn(
      async (): Promise<BrowserActionResult> =>
        options.result ?? { ok: true, action: 'navigate', text: 'done' }
    ),
  };
  setBrowserSessionServiceForTests(service as unknown as BrowserSessionService);
  return service;
}

function makeContext(overrides: Partial<ActionContext['taskState']> = {}): ActionContext {
  return {
    taskState: {
      task: null,
      userRequest: 'verify the login page renders',
      workspaceRoot: '/ws',
      ...overrides,
    },
  } as ActionContext;
}

afterEach(() => {
  setBrowserSessionServiceForTests(null);
});

describe('registry wiring', () => {
  it('registers browser_action in the action registry', () => {
    expect(createActionRegistry().get('browser_action')).toBe(executeBrowserAction);
  });

  it('executeAction dispatches through the registry', async () => {
    const service = stubService();
    const result = await executeAction(
      'browser_action',
      { browserAction: 'snapshot', backgroundTaskId: 'bg-1' },
      makeContext(),
      createActionRegistry()
    );
    expect(result.success).toBe(true);
    expect(service.performAction).toHaveBeenCalledTimes(1);
  });

  it('executeAction throws on an unknown action type', async () => {
    await expect(
      executeAction(
        'definitely_not_registered' as Parameters<typeof executeAction>[0],
        {},
        makeContext(),
        createActionRegistry()
      )
    ).rejects.toThrow(/Unknown action type/);
  });
});

describe('executeBrowserAction', () => {
  it('keys session + action on the injected backgroundTaskId', async () => {
    const service = stubService();
    const params = { browserAction: 'navigate', url: 'http://x/', backgroundTaskId: 'bg-7' };
    const result = await executeBrowserAction(params, makeContext());

    expect(result.success).toBe(true);
    expect(service.ensureSession).toHaveBeenCalledWith('bg-7', 'verify the login page renders');
    expect(service.performAction).toHaveBeenCalledWith('bg-7', params);
    expect(result.message).toContain('navigate');
  });

  it('falls back to the planner task id, then to unknown-task', async () => {
    const service = stubService();
    await executeBrowserAction(
      { browserAction: 'snapshot' },
      makeContext({ task: { id: 'plan-3' } as ActionContext['taskState']['task'] })
    );
    expect(service.ensureSession).toHaveBeenCalledWith('plan-3', expect.any(String));

    await executeBrowserAction({ browserAction: 'snapshot' }, makeContext());
    expect(service.ensureSession).toHaveBeenLastCalledWith('unknown-task', expect.any(String));
  });

  it('uses a default intent when the task has no user request', async () => {
    const service = stubService();
    await executeBrowserAction({ browserAction: 'snapshot' }, makeContext({ userRequest: '' }));
    expect(service.ensureSession).toHaveBeenCalledWith(
      'unknown-task',
      'Verify UI changes in a real browser'
    );
  });

  it('marks permission denials as skipped (no retry loop re-prompting the user)', async () => {
    stubService({ ensure: { ok: false, code: 'permission_denied', message: 'User denied' } });
    const result = await executeBrowserAction({ browserAction: 'snapshot' }, makeContext());
    expect(result).toMatchObject({ success: false, skipped: true });
    expect(result.message).toContain('permission_denied');
  });

  it('marks unsupported_environment refusals as skipped too', async () => {
    stubService({ ensure: { ok: false, code: 'unsupported_environment' } });
    const result = await executeBrowserAction({ browserAction: 'snapshot' }, makeContext());
    expect(result.skipped).toBe(true);
  });

  it('leaves transient refusals retryable', async () => {
    stubService({ ensure: { ok: false, code: 'server_error', message: 'spawn failed' } });
    const result = await executeBrowserAction({ browserAction: 'snapshot' }, makeContext());
    expect(result).toMatchObject({ success: false, skipped: false });
  });

  it('passes structured browser failures through as step data', async () => {
    stubService({
      result: {
        ok: false,
        action: 'click',
        error: { code: 'server_error', message: 'element not found' },
      },
    });
    const result = await executeBrowserAction(
      { browserAction: 'click', element: 'x', ref: 'e1' },
      makeContext()
    );
    expect(result.success).toBe(false);
    expect(result.data).toMatchObject({ error: { code: 'server_error' } });
    expect(result.message).toContain('element not found');
  });
});
