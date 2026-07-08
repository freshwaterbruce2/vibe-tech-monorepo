/**
 * devServerOrchestrator tests — dev-command resolution from package.json,
 * ANSI-safe readiness detection (URL in PTY output, across chunk splits),
 * the starting → ready | failed → stopped state machine, timeout/early-exit
 * failure paths, and idempotent teardown. Everything resolves as structured
 * results; nothing throws upward (spec 11 Phase 2).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DevServerOrchestrator,
  findDevServerUrl,
  resolveDevCommand,
  stripAnsi,
} from '../../../services/browser/devServerOrchestrator';
import type { TerminalLike } from '../../../services/browser/verification.types';

const ESC = String.fromCharCode(27);

type FakeTerminal = TerminalLike & {
  createSession: ReturnType<typeof vi.fn>;
  startShell: ReturnType<typeof vi.fn>;
  writeInput: ReturnType<typeof vi.fn>;
  closeSession: ReturnType<typeof vi.fn>;
  emitData: (data: string) => void;
  emitExit: (code: number | null) => void;
};

function makeTerminal(): FakeTerminal {
  let onData: ((data: string) => void) | null = null;
  let onExit: ((code: number | null) => void) | null = null;
  return {
    createSession: vi.fn().mockReturnValue('pty-1'),
    startShell: vi.fn(async (_id: string, data: typeof onData, exit: typeof onExit) => {
      onData = data;
      onExit = exit;
    }),
    writeInput: vi.fn(),
    closeSession: vi.fn(),
    emitData: data => onData?.(data),
    emitExit: code => onExit?.(code),
  } as FakeTerminal;
}

/** Let the startShell().then(writeInput) microtask chain run */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

describe('stripAnsi / findDevServerUrl', () => {
  it('strips ANSI color codes', () => {
    expect(stripAnsi(`${ESC}[32mready${ESC}[0m`)).toBe('ready');
  });

  it('finds a local dev-server URL and ignores remote ones', () => {
    expect(findDevServerUrl('➜  Local:   http://localhost:5173/')).toBe('http://localhost:5173/');
    expect(findDevServerUrl('listening on http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(findDevServerUrl('see https://example.com/docs')).toBeNull();
    expect(findDevServerUrl('no url here')).toBeNull();
  });
});

describe('resolveDevCommand', () => {
  it('prefers the dev script, falls back to start, else null', async () => {
    const read = (scripts: Record<string, string>) => async () => JSON.stringify({ scripts });
    expect(await resolveDevCommand(read({ dev: 'vite', start: 'x' }), '/ws')).toBe('pnpm dev');
    expect(await resolveDevCommand(read({ start: 'serve' }), '/ws')).toBe('pnpm start');
    expect(await resolveDevCommand(read({ build: 'tsc' }), '/ws')).toBeNull();
  });

  it('builds the manifest path with the workspace separator style', async () => {
    const readFile = vi.fn().mockResolvedValue(JSON.stringify({ scripts: { dev: 'vite' } }));
    await resolveDevCommand(readFile, 'V:\\ws\\app');
    expect(readFile).toHaveBeenCalledWith('V:\\ws\\app\\package.json');
    await resolveDevCommand(readFile, '/home/ws/');
    expect(readFile).toHaveBeenCalledWith('/home/ws/package.json');
  });

  it('returns null for missing or malformed manifests', async () => {
    expect(
      await resolveDevCommand(async () => Promise.reject(new Error('ENOENT')), '/ws')
    ).toBeNull();
    expect(await resolveDevCommand(async () => 'not json', '/ws')).toBeNull();
  });
});

describe('DevServerOrchestrator', () => {
  it('starts the shell in the workspace, writes the command, and resolves on URL', async () => {
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal);
    const startPromise = orchestrator.start({ command: 'pnpm dev', cwd: 'V:\\ws' });
    await flush();
    expect(terminal.createSession).toHaveBeenCalledWith('V:\\ws');
    expect(terminal.writeInput).toHaveBeenCalledWith('pty-1', 'pnpm dev\r');

    terminal.emitData(`${ESC}[32m  Local:   http://localhost:5173/${ESC}[0m\n`);
    await expect(startPromise).resolves.toEqual({ ok: true, url: 'http://localhost:5173/' });
    expect(orchestrator.getState()).toBe('ready');
  });

  it('detects the URL across chunk boundaries via the rolling buffer', async () => {
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal);
    const startPromise = orchestrator.start({ command: 'pnpm dev', cwd: '/ws' });
    await flush();
    terminal.emitData('  Local:   http://loc');
    terminal.emitData('alhost:5173/\n');
    await expect(startPromise).resolves.toEqual({ ok: true, url: 'http://localhost:5173/' });
  });

  it('fails when the dev server exits before becoming ready', async () => {
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal);
    const startPromise = orchestrator.start({ command: 'pnpm dev', cwd: '/ws' });
    await flush();
    terminal.emitExit(1);
    await expect(startPromise).resolves.toEqual({
      ok: false,
      reason: 'dev server exited (code 1) before ready',
    });
    expect(terminal.closeSession).toHaveBeenCalledWith('pty-1');
    expect(orchestrator.getState()).toBe('failed');
  });

  it('fails on the readiness timeout and tears the session down', async () => {
    vi.useFakeTimers();
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal, 5_000);
    const startPromise = orchestrator.start({ command: 'pnpm dev', cwd: '/ws' });
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(startPromise).resolves.toEqual({
      ok: false,
      reason: 'dev server not ready within 5000ms',
    });
    expect(terminal.closeSession).toHaveBeenCalledWith('pty-1');
    expect(orchestrator.getState()).toBe('failed');
  });

  it('fails structurally when the shell cannot start', async () => {
    const terminal = makeTerminal();
    terminal.startShell.mockRejectedValue(new Error('pty unavailable'));
    const orchestrator = new DevServerOrchestrator(terminal);
    await expect(orchestrator.start({ command: 'pnpm dev', cwd: '/ws' })).resolves.toEqual({
      ok: false,
      reason: 'failed to start shell: pty unavailable',
    });
    expect(orchestrator.getState()).toBe('failed');
  });

  it('ignores late signals after settling (exit after ready)', async () => {
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal);
    const startPromise = orchestrator.start({ command: 'pnpm dev', cwd: '/ws' });
    await flush();
    terminal.emitData('http://localhost:4000');
    terminal.emitExit(0); // late — must not flip the resolved result/state
    await expect(startPromise).resolves.toEqual({ ok: true, url: 'http://localhost:4000' });
    expect(orchestrator.getState()).toBe('ready');
  });

  it('refuses to be reused after a start', async () => {
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal);
    const first = orchestrator.start({ command: 'pnpm dev', cwd: '/ws' });
    await flush();
    await expect(orchestrator.start({ command: 'pnpm dev', cwd: '/ws' })).resolves.toMatchObject({
      ok: false,
      reason: expect.stringContaining('already used'),
    });
    terminal.emitData('http://localhost:5173/');
    await first;
  });

  it('stop() closes the PTY once and is idempotent', async () => {
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal);
    const startPromise = orchestrator.start({ command: 'pnpm dev', cwd: '/ws' });
    await flush();
    terminal.emitData('http://localhost:5173/');
    await startPromise;

    orchestrator.stop();
    orchestrator.stop();
    expect(terminal.closeSession).toHaveBeenCalledTimes(1);
    expect(orchestrator.getState()).toBe('stopped');
  });

  it('stop() before any start is a no-op', () => {
    const terminal = makeTerminal();
    const orchestrator = new DevServerOrchestrator(terminal);
    orchestrator.stop();
    expect(terminal.closeSession).not.toHaveBeenCalled();
    expect(orchestrator.getState()).toBe('idle');
  });
});
