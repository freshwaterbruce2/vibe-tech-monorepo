/**
 * learning-pipeline-mcp index tests
 *
 * Verifies the exec-hardening introduced in runCommand:
 *   - allowlist guard rejects non-python/powershell bases
 *   - tool handlers invoke execFile (no shell) with structured args
 *   - LEARNING_SYSTEM_DIR / WORKSPACE_ROOT are propagated into the child env
 *
 * The MCP SDK transport + server are mocked so importing index.ts registers the
 * tools (captured below) without opening a real stdio connection.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

const { toolRegistry, execFileMock } = vi.hoisted(() => ({
  toolRegistry: new Map<string, ToolHandler>(),
  execFileMock: vi.fn(),
}));

vi.mock('child_process', () => ({ execFile: execFileMock }));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    tool(name: string, _desc: string, _schema: unknown, handler: ToolHandler): void {
      toolRegistry.set(name, handler);
    }
    async connect(): Promise<void> {
      /* no-op transport */
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

// Default: execFile (callback style) succeeds. promisify resolves with the
// second callback argument, which runCommand destructures as { stdout, stderr }.
function okExec(stdout = 'done', stderr = ''): void {
  execFileMock.mockImplementation(
    (_file: string, _args: string[], _opts: unknown, cb: (e: unknown, r: unknown) => void) => {
      cb(null, { stdout, stderr });
    },
  );
}

let runCommand: (
  file: string,
  args: string[],
  cwd: string,
) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

beforeEach(async () => {
  toolRegistry.clear();
  execFileMock.mockReset();
  okExec();
  vi.resetModules();
  const mod = await import('../index.js');
  runCommand = mod.runCommand;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('runCommand — allowlist guard', () => {
  it('rejects a disallowed exec base without spawning a process', async () => {
    await expect(runCommand('rm', ['-rf', '/'], '.')).rejects.toThrow('Disallowed exec base: rm');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('allows python and propagates LEARNING_SYSTEM_DIR / WORKSPACE_ROOT into child env', async () => {
    okExec('hello', '');
    const result = await runCommand('python', ['--version'], 'D:/learning-system');

    expect(result.isError).toBeUndefined();
    expect(execFileMock).toHaveBeenCalledTimes(1);
    const [file, args, opts] = execFileMock.mock.calls[0];
    expect(file).toBe('python');
    expect(args).toEqual(['--version']);
    expect((opts as { env: Record<string, string> }).env.LEARNING_SYSTEM_DIR).toBeDefined();
    expect((opts as { env: Record<string, string> }).env.WORKSPACE_ROOT).toBeDefined();
  });

  it('surfaces child process errors as an MCP error result', async () => {
    execFileMock.mockImplementation(
      (_file: string, _args: string[], _opts: unknown, cb: (e: unknown) => void) => {
        cb(Object.assign(new Error('boom'), { stdout: 'partial', stderr: 'bad' }));
      },
    );

    const result = await runCommand('python3', ['x.py'], '.');

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('boom');
  });
});

describe('tool handlers use execFile with structured args (no shell)', () => {
  it('trigger_insight_generation runs python with --days and --dry-run', async () => {
    const handler = toolRegistry.get('trigger_insight_generation');
    expect(handler).toBeDefined();

    const result = await handler!({ days: 7, dryRun: true });

    expect(result.content[0].text).toContain('"success": true');
    const [file, args] = execFileMock.mock.calls[0];
    expect(String(file)).toContain('python');
    expect(args).toContain('--days');
    expect(args).toContain('7');
    expect(args).toContain('--dry-run');
  });

  it('run_skill_analysis runs powershell.exe with -File and numeric params as strings', async () => {
    const handler = toolRegistry.get('run_skill_analysis');
    const result = await handler!({ daysBack: 30, minOccurrences: 10, minSuccessRate: 0.8 });

    expect(result.content[0].text).toContain('"success": true');
    const [file, args] = execFileMock.mock.calls[0];
    expect(file).toBe('powershell.exe');
    expect(args).toContain('-File');
    expect(args).toContain('-DaysBack');
    expect(args).toContain('30');
  });

  it('generate_skill passes user pattern name as a structured arg, not interpolated shell', async () => {
    const handler = toolRegistry.get('generate_skill');
    const result = await handler!({ patternName: 'My Pattern; rm -rf', type: 'Skill' });

    expect(result.content[0].text).toContain('"success": true');
    const [file, args] = execFileMock.mock.calls[0];
    expect(file).toBe('powershell.exe');
    // The injection-shaped value is a single discrete argv entry — never a shell token.
    expect(args).toContain('My Pattern; rm -rf');
    expect(args).toContain('-PatternName');
  });
});
