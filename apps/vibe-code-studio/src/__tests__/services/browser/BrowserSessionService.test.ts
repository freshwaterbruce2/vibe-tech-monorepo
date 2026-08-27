/**
 * BrowserSessionService tests — the permission gate (no MCP spawn before a
 * resolved approval, AC #1), single-task session scoping + expiry (AC #12),
 * mid-session revoke (AC #9), structured failure surfacing (AC #10), the
 * action audit log (AC #11), and screenshot → spec-09 artifact registration
 * (AC #6).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initArtifactCapture,
  resetArtifactCaptureForTests,
} from '../../../services/artifacts/artifactCapture';
import {
  BrowserSessionService,
  getBrowserSessionService,
  setBrowserSessionServiceForTests,
} from '../../../services/browser/BrowserSessionService';
import type { McpBrowserClient, McpToolResultLike } from '../../../services/browser/types';
import { useArtifactsStore } from '../../../stores/artifactsStore';
import { useBrowserSessionStore } from '../../../stores/browserSessionStore';

type FakeMcp = McpBrowserClient & {
  connectServer: ReturnType<typeof vi.fn>;
  disconnectServer: ReturnType<typeof vi.fn>;
  invokeTool: ReturnType<typeof vi.fn>;
};

function makeMcp(overrides: Partial<McpBrowserClient> = {}): FakeMcp {
  let connected = false;
  return {
    isAvailable: () => true,
    isConnected: () => connected,
    connectServer: vi.fn(async () => {
      connected = true;
    }),
    disconnectServer: vi.fn(async () => {
      connected = false;
    }),
    invokeTool: vi.fn(async (): Promise<McpToolResultLike> => ({ content: [] })),
    ...overrides,
  } as FakeMcp;
}

function makeService(
  mcp: McpBrowserClient,
  extra: Partial<ConstructorParameters<typeof BrowserSessionService>[0]> = {}
): BrowserSessionService {
  return new BrowserSessionService({
    mcp,
    recordScreenshot: vi.fn(async () => ({ id: 'artifact-x' })),
    ...extra,
  });
}

/** Approve the pending prompt as soon as it appears */
async function ensureApproved(service: BrowserSessionService, taskId: string, intent = 'verify') {
  const pending = service.ensureSession(taskId, intent);
  await service.approvePendingRequest();
  return pending;
}

beforeEach(() => {
  useBrowserSessionStore.setState({ pendingRequest: null, activeSession: null });
});

afterEach(() => {
  setBrowserSessionServiceForTests(null);
  resetArtifactCaptureForTests();
  vi.useRealTimers();
});

describe('permission gate (AC #1/#12)', () => {
  it('refuses in web mode without ever touching the MCP server', async () => {
    const mcp = makeMcp({ isAvailable: () => false });
    const service = makeService(mcp);
    const result = await service.ensureSession('task-1', 'verify');
    expect(result).toMatchObject({ ok: false, error: { code: 'unsupported_environment' } });
    expect(mcp.connectServer).not.toHaveBeenCalled();
  });

  it('does not connect while approval is pending and surfaces the prompt to the UI', async () => {
    const mcp = makeMcp();
    const service = makeService(mcp);
    void service.ensureSession('task-1', 'open the settings page');

    expect(mcp.connectServer).not.toHaveBeenCalled();
    expect(service.getPendingRequest()).toMatchObject({
      taskId: 'task-1',
      intent: 'open the settings page',
    });
    expect(useBrowserSessionStore.getState().pendingRequest?.taskId).toBe('task-1');
    service.denyPendingRequest();
  });

  it('deny resolves all waiters with permission_denied and never connects', async () => {
    const mcp = makeMcp();
    const service = makeService(mcp);
    const first = service.ensureSession('task-1', 'verify');
    const second = service.ensureSession('task-1', 'verify'); // same task piggybacks
    service.denyPendingRequest();

    for (const result of [await first, await second]) {
      expect(result).toMatchObject({ ok: false, error: { code: 'permission_denied' } });
    }
    expect(mcp.connectServer).not.toHaveBeenCalled();
    expect(useBrowserSessionStore.getState().pendingRequest).toBeNull();
  });

  it('approve connects the MCP server once and activates a task-scoped session', async () => {
    const mcp = makeMcp();
    const service = makeService(mcp);
    const result = await ensureApproved(service, 'task-1');

    expect(result).toMatchObject({ ok: true, session: { taskId: 'task-1', status: 'active' } });
    expect(mcp.connectServer).toHaveBeenCalledTimes(1);
    expect(useBrowserSessionStore.getState().activeSession?.taskId).toBe('task-1');

    // Re-ensure for the same task resolves immediately without a new prompt
    const again = await service.ensureSession('task-1', 'verify');
    expect(again.ok).toBe(true);
    expect(service.getPendingRequest()).toBeNull();
  });

  it('refuses a concurrent request from a different task while one is pending', async () => {
    const service = makeService(makeMcp());
    void service.ensureSession('task-1', 'verify');
    const other = await service.ensureSession('task-2', 'verify');
    expect(other).toMatchObject({ ok: false, error: { code: 'permission_denied' } });
    service.denyPendingRequest();
  });

  it('times out an unanswered prompt as a denial', async () => {
    vi.useFakeTimers();
    const service = makeService(makeMcp(), { permissionTimeoutMs: 1000 });
    const pending = service.ensureSession('task-1', 'verify');
    vi.advanceTimersByTime(1001);
    const result = await pending;
    expect(result).toMatchObject({ ok: false, error: { code: 'permission_denied' } });
    expect((result as { error: { message: string } }).error.message).toMatch(/timed out/);
  });

  it('surfaces an MCP server start failure as a structured refusal', async () => {
    const mcp = makeMcp();
    mcp.connectServer.mockRejectedValue(new Error('spawn failed'));
    const service = makeService(mcp);
    const result = await ensureApproved(service, 'task-1');
    expect(result).toMatchObject({ ok: false, error: { code: 'server_error' } });
    expect(service.getActiveSession()).toBeNull();
  });

  it('a new approval replaces a still-active session from another task', async () => {
    const mcp = makeMcp();
    const service = makeService(mcp);
    await ensureApproved(service, 'task-1');
    const second = await ensureApproved(service, 'task-2');
    expect(second).toMatchObject({ ok: true, session: { taskId: 'task-2' } });
    expect(mcp.disconnectServer).toHaveBeenCalled();
    expect(service.getActiveSession()?.taskId).toBe('task-2');
  });

  it('approve without a pending request is a no-op', async () => {
    const service = makeService(makeMcp());
    await expect(service.approvePendingRequest()).resolves.toBeUndefined();
    expect(service.getActiveSession()).toBeNull();
  });
});

describe('performAction', () => {
  it('refuses without an approved session (AC #1) and never invokes a tool', async () => {
    const mcp = makeMcp();
    const service = makeService(mcp);
    const result = await service.performAction('task-1', {
      browserAction: 'navigate',
      url: 'http://x/',
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'no_session' } });
    expect(mcp.invokeTool).not.toHaveBeenCalled();
  });

  it("refuses actions from a task that doesn't own the session", async () => {
    const service = makeService(makeMcp());
    await ensureApproved(service, 'task-1');
    const result = await service.performAction('task-2', {
      browserAction: 'navigate',
      url: 'http://x/',
    });
    expect(result.error?.code).toBe('no_session');
  });

  it('rejects non-allowlisted params as not_allowed (AC #3)', async () => {
    const service = makeService(makeMcp());
    await ensureApproved(service, 'task-1');
    const result = await service.performAction('task-1', { browserAction: 'evaluate' });
    expect(result).toMatchObject({ ok: false, action: 'unknown', error: { code: 'not_allowed' } });
  });

  it('routes an allowlisted action through the MCP and logs it (AC #11)', async () => {
    const mcp = makeMcp();
    mcp.invokeTool.mockResolvedValue({ content: [{ type: 'text', text: 'done' }] });
    const service = makeService(mcp);
    await ensureApproved(service, 'task-1');

    const result = await service.performAction('task-1', {
      browserAction: 'navigate',
      url: 'http://localhost:5173/',
    });

    expect(result).toMatchObject({ ok: true, action: 'navigate', text: 'done' });
    expect(mcp.invokeTool).toHaveBeenCalledWith('playwright', 'browser_navigate', {
      url: 'http://localhost:5173/',
    });
    const log = useBrowserSessionStore.getState().activeSession?.actionLog ?? [];
    expect(log).toHaveLength(1);
    expect(log[0]).toContain('Navigate to http://localhost:5173/');
    expect(log[0]).toContain('ok');
  });

  it('turns a thrown MCP error into a structured server_error and logs the failure', async () => {
    const mcp = makeMcp();
    mcp.invokeTool.mockRejectedValue(new Error('transport closed'));
    const service = makeService(mcp);
    await ensureApproved(service, 'task-1');

    const result = await service.performAction('task-1', { browserAction: 'snapshot' });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'server_error', message: 'transport closed' },
    });
    const log = useBrowserSessionStore.getState().activeSession?.actionLog ?? [];
    expect(log[0]).toContain('failed: transport closed');
  });

  it('registers screenshots as spec-09 artifacts and attaches the id (AC #6)', async () => {
    const mcp = makeMcp();
    mcp.invokeTool.mockResolvedValue({ content: [{ type: 'image', data: 'AAAA' }] });
    const recordScreenshot = vi.fn(async () => ({ id: 'artifact-42' }));
    const service = makeService(mcp, { recordScreenshot });
    await ensureApproved(service, 'task-1', 'verify the dashboard');

    const result = await service.performAction('task-1', { browserAction: 'screenshot' });
    expect(result.ok).toBe(true);
    expect(result.artifactId).toBe('artifact-42');
    expect(recordScreenshot).toHaveBeenCalledWith(
      'task-1',
      'Screenshot — verify the dashboard',
      expect.objectContaining({
        imageDataUrl: 'data:image/png;base64,AAAA',
        description: 'verify the dashboard',
      })
    );
  });

  it('keeps the action ok when artifact recording fails (best-effort)', async () => {
    const mcp = makeMcp();
    mcp.invokeTool.mockResolvedValue({ content: [{ type: 'image', data: 'AAAA' }] });
    const service = makeService(mcp, {
      recordScreenshot: vi.fn(async () => {
        throw new Error('store offline');
      }),
    });
    await ensureApproved(service, 'task-1');

    const result = await service.performAction('task-1', { browserAction: 'screenshot' });
    expect(result.ok).toBe(true);
    expect(result.artifactId).toBeUndefined();
  });

  it('records real artifacts through the default recorder when capture is initialized', async () => {
    delete (window as Window & { electron?: unknown }).electron;
    localStorage.clear();
    useArtifactsStore.setState({ artifacts: [], panelOpen: false, selectedId: null });
    await initArtifactCapture({ on: () => undefined, off: () => undefined });

    const mcp = makeMcp();
    mcp.invokeTool.mockResolvedValue({ content: [{ type: 'image', data: 'AAAA' }] });
    const service = new BrowserSessionService({ mcp }); // default recorder
    const pending = service.ensureSession('task-1', 'verify');
    await service.approvePendingRequest();
    await pending;

    const result = await service.performAction('task-1', { browserAction: 'screenshot' });
    expect(result.artifactId).toBeDefined();
    const artifacts = useArtifactsStore.getState().artifacts;
    expect(artifacts[0]).toMatchObject({ taskId: 'task-1', kind: 'screenshot' });
  });
});

describe('session end (AC #9/#12)', () => {
  it('revoke immediately ends the session and disconnects the server', async () => {
    const mcp = makeMcp();
    const service = makeService(mcp);
    await ensureApproved(service, 'task-1');

    service.revokeActiveSession();
    expect(service.getActiveSession()).toBeNull();
    expect(useBrowserSessionStore.getState().activeSession).toBeNull();
    expect(mcp.disconnectServer).toHaveBeenCalledTimes(1);

    const blocked = await service.performAction('task-1', { browserAction: 'snapshot' });
    expect(blocked.error?.code).toBe('no_session');
  });

  it('revoke without an active session is a no-op', () => {
    const mcp = makeMcp();
    const service = makeService(mcp);
    service.revokeActiveSession();
    expect(mcp.disconnectServer).not.toHaveBeenCalled();
  });

  it('a disconnect failure during revoke is swallowed (best-effort cleanup)', async () => {
    const mcp = makeMcp();
    mcp.disconnectServer.mockRejectedValue(new Error('already dead'));
    const service = makeService(mcp);
    await ensureApproved(service, 'task-1');
    expect(() => service.revokeActiveSession()).not.toThrow();
    await Promise.resolve(); // let the rejected disconnect settle through the catch
  });

  it('ends the session when its originating task settles (bindTaskEvents)', async () => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const events = {
      on: (event: string, listener: (...args: unknown[]) => void) => {
        const set = listeners.get(event) ?? new Set();
        set.add(listener);
        listeners.set(event, set);
      },
      off: (event: string, listener: (...args: unknown[]) => void) => {
        listeners.get(event)?.delete(listener);
      },
      emit: (event: string, ...args: unknown[]) => {
        for (const listener of listeners.get(event) ?? []) listener(...args);
      },
    };
    const service = makeService(makeMcp());
    service.bindTaskEvents(events);
    service.bindTaskEvents(events); // idempotent
    await ensureApproved(service, 'task-1');

    events.emit('completed', {}); // no id — ignored
    expect(service.getActiveSession()).not.toBeNull();
    events.emit('completed', { id: 'other-task' });
    expect(service.getActiveSession()).not.toBeNull();
    events.emit('completed', { id: 'task-1' });
    expect(service.getActiveSession()).toBeNull();

    // Re-binding to a new source detaches the old listeners
    await ensureApproved(service, 'task-2');
    service.bindTaskEvents({ on: () => undefined, off: () => undefined });
    events.emit('failed', { id: 'task-2' });
    expect(service.getActiveSession()?.taskId).toBe('task-2');
  });

  it('endSessionsForTask ignores other tasks', async () => {
    const service = makeService(makeMcp());
    await ensureApproved(service, 'task-1');
    service.endSessionsForTask('task-9', 'task_settled');
    expect(service.getActiveSession()?.taskId).toBe('task-1');
  });
});

describe('singleton seam', () => {
  it('memoizes the default service (real MCPService client) and honors the test override', () => {
    const service = getBrowserSessionService();
    expect(service).toBeInstanceOf(BrowserSessionService);
    expect(getBrowserSessionService()).toBe(service);
    // Nothing spawned by construction: no session, no pending prompt
    expect(service.getActiveSession()).toBeNull();
    expect(service.getPendingRequest()).toBeNull();

    const fake = makeService(makeMcp());
    setBrowserSessionServiceForTests(fake);
    expect(getBrowserSessionService()).toBe(fake);
  });
});
