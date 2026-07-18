/**
 * custom action executor tests — a `custom` step has no concrete operation, so
 * it must report an honest, actionable failure (it previously faked success,
 * making Agent Mode claim "Task completed" while doing nothing).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  executeCustomAction,
  executeRunCommand,
  executeRunTests,
} from '../../../../services/ai/execution/actions/SystemActions';
import type { ActionContext } from '../../../../services/ai/execution/types';

const ctx = {
  taskState: { workspaceRoot: 'V:\\monorepo' },
} as ActionContext;

type ShellResult = { success: boolean; stdout?: string; stderr?: string; code?: number } | null;

function setShell(execute: ((cmd: string, cwd?: string) => Promise<ShellResult>) | null): void {
  (window as unknown as { electron?: unknown }).electron = execute
    ? { shell: { execute } }
    : undefined;
}

afterEach(() => {
  delete (window as unknown as { electron?: unknown }).electron;
});

describe('executeCustomAction', () => {
  it('reports an honest failure instead of faking success', async () => {
    const result = await executeCustomAction({}, ctx);
    expect(result.success).toBe(false);
    expect(result.skipped).toBeUndefined();
    expect(result.message).toMatch(/No concrete action was planned/);
  });

  it('echoes the original user request in the guidance message', async () => {
    const result = await executeCustomAction({ userRequest: 'do the thing' }, ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain('do the thing');
  });

  it('falls back to the metacognitive approach text when present', async () => {
    const result = await executeCustomAction({ approach: 'try plan B' }, ctx);
    expect(result.success).toBe(false);
    expect(result.message).toContain('try plan B');
  });
});

describe('executeRunTests', () => {
  it('does not execute a generic shell command', async () => {
    const execute = vi.fn(async () => ({ success: true, code: 0 }));
    setShell(execute);

    const result = await executeRunCommand({ command: 'Set-Content src/a.ts x' }, ctx);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/exact mutation approval/i);
    expect(execute).not.toHaveBeenCalled();
  });

  it('skips cleanly (not a hard failure) when no shell is available (web mode)', async () => {
    setShell(null);
    const result = await executeRunTests({ projectName: 'example-app' }, ctx);
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.message).toMatch(/desktop app/);
  });

  it('runs the default Nx test target and reports a pass', async () => {
    const execute = vi.fn(async () => ({ success: true, stdout: 'ok', code: 0 }));
    setShell(execute);
    const result = await executeRunTests({ projectName: 'example-app' }, ctx);
    expect(execute).toHaveBeenCalledWith('pnpm nx run example-app:test', 'V:\\monorepo');
    expect(result.success).toBe(true);
    expect((result.data as { passed: boolean }).passed).toBe(true);
    expect(result.message).toMatch(/Nx validation passed/);
  });

  it('fails the step when Nx exits nonzero and reports the validation output', async () => {
    const execute = vi.fn(async () => ({ success: true, stderr: '1 failed', code: 1 }));
    setShell(execute);
    const result = await executeRunTests(
      { projectName: 'example-app', targets: ['typecheck', 'test'] },
      ctx
    );
    expect(execute).toHaveBeenCalledWith(
      'pnpm nx run-many -t typecheck test --projects=example-app --parallel=1',
      'V:\\monorepo'
    );
    expect(result.success).toBe(false);
    expect((result.data as { passed: boolean }).passed).toBe(false);
    expect(result.message).toMatch(/Nx validation failed/);
    expect(result.message).toContain('1 failed');
  });

  it('rejects missing or injectable Nx project names before invoking the shell', async () => {
    const execute = vi.fn(async () => ({ success: true, code: 0 }));
    setShell(execute);
    await expect(executeRunTests({}, ctx)).rejects.toThrow(/projectName/);
    await expect(executeRunTests({ projectName: 'example-app && del .' }, ctx)).rejects.toThrow(
      /safe Nx projectName/
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects targets that can mutate source or external state', async () => {
    const execute = vi.fn(async () => ({ success: true, code: 0 }));
    setShell(execute);

    await expect(
      executeRunTests({ projectName: 'example-app', targets: ['lint-fix'] }, ctx)
    ).rejects.toThrow(/safe Nx target/);
    await expect(
      executeRunTests({ projectName: '--help', targets: ['test'] }, ctx)
    ).rejects.toThrow(/safe Nx projectName/);
    expect(execute).not.toHaveBeenCalled();
  });

  it('fails when the runner cannot be started', async () => {
    setShell(async () => null);
    const result = await executeRunTests({ projectName: 'example-app' }, ctx);
    expect(result.success).toBe(false);
    expect(result.skipped).toBeUndefined();
    expect(result.message).toMatch(/could not be started/);
  });
});
