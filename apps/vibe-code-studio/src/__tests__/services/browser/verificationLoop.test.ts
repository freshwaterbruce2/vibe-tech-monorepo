/**
 * verificationLoop tests — the spec-11 Phase-2 autonomous pass: skip paths
 * (no UI change / no workspace / no dev command / permission denied), the
 * gated happy path (dev server → navigate → screenshot → console), console
 * error surfacing with the notes cap, guaranteed teardown (server stop +
 * session end) on every post-approval path, and the artifactCapture hook
 * wiring with its completed-tasks-only guard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setWalkthroughVerificationHook } from '../../../services/artifacts/artifactCapture';
import { encodeDiffContent } from '../../../services/artifacts/artifactContent';
import type { Artifact, WalkthroughVerificationContext } from '../../../services/artifacts/types';
import type { BrowserSessionService } from '../../../services/browser/BrowserSessionService';
import { setBrowserSessionServiceForTests } from '../../../services/browser/BrowserSessionService';
import { DevServerOrchestrator } from '../../../services/browser/devServerOrchestrator';
import type { BrowserActionResult } from '../../../services/browser/types';
import type { VerificationDeps } from '../../../services/browser/verification.types';
import {
  MAX_CONSOLE_ERROR_NOTES,
  buildDefaultVerificationDeps,
  initBrowserVerificationLoop,
  joinUrl,
  runVerificationPass,
} from '../../../services/browser/verificationLoop';
import { useEditorStore } from '../../../stores/useEditorStore';

vi.mock('../../../services/artifacts/artifactCapture', () => ({
  setWalkthroughVerificationHook: vi.fn(),
  recordScreenshotArtifact: vi.fn(async () => ({ id: 'artifact-x' })),
}));

function uiDiff(paths: string[] = ['src/pages/Settings.tsx']): Artifact {
  return {
    id: 'd-1',
    taskId: 'task-1',
    kind: 'diff',
    title: 'UI diff',
    content: encodeDiffContent(
      paths.map(path => ({
        path,
        originalContent: 'a',
        newContent: 'b',
        changeType: 'modify' as const,
      }))
    ),
    createdAt: new Date(1000).toISOString(),
    updatedAt: new Date(1000).toISOString(),
    status: 'final',
  };
}

function context(overrides: Partial<WalkthroughVerificationContext> = {}) {
  return { taskId: 'task-1', outcome: 'completed' as const, diffs: [uiDiff()], ...overrides };
}

type ActionResults = Partial<Record<string, BrowserActionResult>>;

function makeDeps(overrides: Partial<VerificationDeps> = {}, actions: ActionResults = {}) {
  const server = { start: vi.fn(), stop: vi.fn() };
  server.start.mockResolvedValue({ ok: true, url: 'http://localhost:5173/' });
  const session = {
    ensureSession: vi.fn().mockResolvedValue({ ok: true, session: { id: 's-1' } }),
    performAction: vi.fn(async (_taskId: string, params: unknown): Promise<BrowserActionResult> => {
      const { browserAction } = params as { browserAction: string };
      return (
        actions[browserAction] ?? {
          ok: true,
          action: browserAction as BrowserActionResult['action'],
          consoleMessages: [],
        }
      );
    }),
    endSessionsForTask: vi.fn(),
  };
  const deps: VerificationDeps = {
    session,
    getWorkspaceRoot: () => 'V:\\ws',
    resolveCommand: vi.fn().mockResolvedValue('pnpm dev'),
    createServer: () => server,
    ...overrides,
  };
  return { deps, session, server };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  setBrowserSessionServiceForTests(null);
});

describe('joinUrl', () => {
  it('joins the detected base URL with the derived route', () => {
    expect(joinUrl('http://localhost:5173/', '/settings')).toBe('http://localhost:5173/settings');
    expect(joinUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/');
  });

  it('falls back to plain concatenation for unparseable bases', () => {
    expect(joinUrl('not a url', '/settings')).toBe('not a url/settings');
    expect(joinUrl('not a url/', 'settings')).toBe('not a url/settings');
  });
});

describe('runVerificationPass — skip paths (degrade cleanly, never throw)', () => {
  it('skips when the change-set touched no UI files, without touching the session', async () => {
    const { deps, session } = makeDeps();
    const notes = await runVerificationPass(context({ diffs: [uiDiff(['README.md'])] }), deps);
    expect(notes[0]).toContain('Browser verification skipped');
    expect(notes[0]).toContain('no UI-affecting files');
    expect(session.ensureSession).not.toHaveBeenCalled();
  });

  it('skips when no workspace folder is open', async () => {
    const { deps } = makeDeps({ getWorkspaceRoot: () => null });
    const notes = await runVerificationPass(context(), deps);
    expect(notes[0]).toContain('no workspace folder is open');
  });

  it('skips when the workspace has no dev/start script', async () => {
    const { deps, session } = makeDeps({ resolveCommand: vi.fn().mockResolvedValue(null) });
    const notes = await runVerificationPass(context(), deps);
    expect(notes[0]).toContain('no dev/start script');
    expect(session.ensureSession).not.toHaveBeenCalled();
  });

  it('skips when the permission gate denies, never starting the dev server', async () => {
    const { deps, session, server } = makeDeps();
    session.ensureSession.mockResolvedValue({
      ok: false,
      error: { code: 'permission_denied', message: 'User denied browser permission' },
    });
    const notes = await runVerificationPass(context(), deps);
    expect(notes[0]).toContain('User denied browser permission (permission_denied)');
    expect(server.start).not.toHaveBeenCalled();
    expect(session.endSessionsForTask).not.toHaveBeenCalled();
  });
});

describe('runVerificationPass — gated pass', () => {
  it('asks permission with an intent naming the command, file count, and route', async () => {
    const { deps, session } = makeDeps();
    await runVerificationPass(context(), deps);
    const intent = session.ensureSession.mock.calls[0]?.[1] as string;
    expect(intent).toContain('"pnpm dev"');
    expect(intent).toContain('"/settings"');
    expect(intent).toContain('1 changed UI file');
  });

  it('navigates to the changed surface, screenshots, reads console, tears down', async () => {
    const { deps, session, server } = makeDeps();
    const notes = await runVerificationPass(context(), deps);

    expect(server.start).toHaveBeenCalledWith({ command: 'pnpm dev', cwd: 'V:\\ws' });
    const actions = session.performAction.mock.calls.map(call => call[1]);
    expect(actions).toEqual([
      { browserAction: 'navigate', url: 'http://localhost:5173/settings' },
      { browserAction: 'screenshot', fullPage: true },
      { browserAction: 'read_console' },
    ]);
    expect(notes).toEqual([
      '✅ Verified http://localhost:5173/settings — page rendered with no console errors.',
    ]);
    expect(server.stop).toHaveBeenCalledTimes(1);
    expect(session.endSessionsForTask).toHaveBeenCalledWith('task-1', 'task_settled');
  });

  it('fails with a note (and still tears down) when the dev server never readies', async () => {
    const { deps, session, server } = makeDeps();
    server.start.mockResolvedValue({ ok: false, reason: 'exited (code 1) before ready' });
    const notes = await runVerificationPass(context(), deps);
    expect(notes[0]).toContain('Browser verification failed');
    expect(notes[0]).toContain('exited (code 1) before ready');
    expect(server.stop).toHaveBeenCalledTimes(1);
    expect(session.endSessionsForTask).toHaveBeenCalledWith('task-1', 'task_settled');
  });

  it('fails with a note when navigation fails, and still tears down', async () => {
    const { deps, session, server } = makeDeps(
      {},
      {
        navigate: {
          ok: false,
          action: 'navigate',
          error: { code: 'server_error', message: 'net::ERR_CONNECTION_REFUSED' },
        },
      }
    );
    const notes = await runVerificationPass(context(), deps);
    expect(notes[0]).toContain('could not navigate');
    expect(notes[0]).toContain('net::ERR_CONNECTION_REFUSED');
    expect(session.performAction).toHaveBeenCalledTimes(1); // no screenshot/console after
    expect(server.stop).toHaveBeenCalledTimes(1);
    expect(session.endSessionsForTask).toHaveBeenCalled();
  });

  it('surfaces console errors capped at the notes limit', async () => {
    const errors = Array.from({ length: MAX_CONSOLE_ERROR_NOTES + 2 }, (_, i) => ({
      level: 'error',
      text: `boom ${i}`,
    }));
    const { deps } = makeDeps(
      {},
      {
        read_console: {
          ok: true,
          action: 'read_console',
          consoleMessages: [{ level: 'log', text: 'fine' }, ...errors],
        },
      }
    );
    const notes = await runVerificationPass(context(), deps);
    expect(notes[0]).toContain(`${MAX_CONSOLE_ERROR_NOTES + 2} console error(s) detected`);
    expect(notes).toContain('- boom 0');
    expect(notes).toContain('- …and 2 more');
    expect(notes).toHaveLength(1 + MAX_CONSOLE_ERROR_NOTES + 1);
  });

  it('notes an unavailable console and a failed screenshot without failing the pass', async () => {
    const { deps } = makeDeps(
      {},
      {
        screenshot: {
          ok: false,
          action: 'screenshot',
          error: { code: 'screenshot_too_large', message: 'too big' },
        },
        read_console: {
          ok: false,
          action: 'read_console',
          error: { code: 'server_error', message: 'console unavailable' },
        },
      }
    );
    const notes = await runVerificationPass(context(), deps);
    expect(notes[0]).toContain('console state unavailable (console unavailable)');
    expect(notes[1]).toContain('Screenshot capture failed: too big.');
  });
});

describe('initBrowserVerificationLoop + default deps', () => {
  const readFile = vi.fn(async () => JSON.stringify({ scripts: { dev: 'vite' } }));

  function registeredHook() {
    initBrowserVerificationLoop(readFile);
    const hook = vi.mocked(setWalkthroughVerificationHook).mock.calls.at(-1)?.[0];
    if (!hook) throw new Error('hook was not registered');
    return hook;
  }

  it('registers a hook that skips failed tasks (returns null)', async () => {
    const hook = registeredHook();
    expect(await hook(context({ outcome: 'failed' }))).toBeNull();
  });

  it('runs the pass for completed tasks (safe skip note with no UI diffs)', async () => {
    const hook = registeredHook();
    const notes = await hook(context({ diffs: [] }));
    expect(notes?.[0]).toContain('Browser verification skipped');
  });

  it('builds default deps against the real seams', async () => {
    const fakeSession = {} as unknown as BrowserSessionService;
    setBrowserSessionServiceForTests(fakeSession);
    useEditorStore.setState({ workspaceFolder: 'V:\\open-ws' });

    const deps = buildDefaultVerificationDeps(readFile);
    expect(deps.session).toBe(fakeSession);
    expect(deps.getWorkspaceRoot()).toBe('V:\\open-ws');
    expect(await deps.resolveCommand('V:\\open-ws')).toBe('pnpm dev');
    expect(readFile).toHaveBeenCalledWith('V:\\open-ws\\package.json');
    expect(deps.createServer()).toBeInstanceOf(DevServerOrchestrator);
  });
});
