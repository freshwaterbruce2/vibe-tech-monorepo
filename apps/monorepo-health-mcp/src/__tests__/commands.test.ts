/**
 * commands — command builders + the shared exec runner.
 *
 * Verifies the pwsh.exe / powershell.exe / run_maintenance.py command strings
 * are built exactly as expected, and that runCommand() correctly maps a
 * resolved exec() call to a success response and a rejected exec() call to an
 * isError response (including the stdout/stderr fallback when absent).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promisify } from 'util';

const execImpl = vi.fn();

vi.mock('child_process', () => {
  const exec = (
    _command: string,
    _options: unknown,
    callback: (error: unknown, stdout?: string, stderr?: string) => void,
  ): void => {
    callback(null, '', '');
  };
  Object.defineProperty(exec, promisify.custom, {
    value: (...args: unknown[]) => execImpl(...args),
  });
  return { exec };
});

const { buildMaintenanceCommand, buildPowershellCommand, buildPwshCommand, runCommand } =
  await import('../commands.js');

describe('buildPwshCommand', () => {
  it('builds a pwsh.exe invocation for the given script path', () => {
    expect(buildPwshCommand('/repo/scripts/database-health.ps1')).toBe(
      'pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "/repo/scripts/database-health.ps1"',
    );
  });
});

describe('buildPowershellCommand', () => {
  it('omits -DryRun when dryRun is false', () => {
    expect(buildPowershellCommand('/repo/scripts/cleanup-stale-artifacts.ps1', false)).toBe(
      'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "/repo/scripts/cleanup-stale-artifacts.ps1"',
    );
  });

  it('appends -DryRun when dryRun is true', () => {
    expect(buildPowershellCommand('/repo/scripts/cleanup-stale-artifacts.ps1', true)).toBe(
      'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "/repo/scripts/cleanup-stale-artifacts.ps1" -DryRun',
    );
  });
});

describe('buildMaintenanceCommand', () => {
  it('builds with no flags when opts is empty', () => {
    expect(buildMaintenanceCommand('/repo/learning-system', {})).toBe(
      'python "/repo/learning-system/scripts/run_maintenance.py"',
    );
  });

  it('builds with all flags in order when all opts are true', () => {
    expect(
      buildMaintenanceCommand('/repo/learning-system', {
        retention: true,
        vacuum: true,
        backup: true,
      }),
    ).toBe(
      'python "/repo/learning-system/scripts/run_maintenance.py" --retention --vacuum --backup',
    );
  });
});

describe('runCommand', () => {
  beforeEach(() => {
    execImpl.mockReset();
  });

  it('returns a trimmed success result on resolve', async () => {
    execImpl.mockResolvedValue({ stdout: '  all good  \n', stderr: '' });

    const result = await runCommand('echo ok', '/repo');

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({
      success: true,
      stdout: 'all good',
      stderr: '',
    });
  });

  it('returns a trimmed isError result on reject, using err.stdout/err.stderr', async () => {
    const err = Object.assign(new Error('exit code 1'), {
      stdout: '  partial output  \n',
      stderr: '  a warning  \n',
    });
    execImpl.mockRejectedValue(err);

    const result = await runCommand('false', '/repo');

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({
      success: false,
      error: 'exit code 1',
      stdout: 'partial output',
      stderr: 'a warning',
    });
  });

  it('falls back to empty strings when the rejection has no stdout/stderr', async () => {
    execImpl.mockRejectedValue(new Error('spawn failed'));

    const result = await runCommand('false', '/repo');

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0].text)).toEqual({
      success: false,
      error: 'spawn failed',
      stdout: '',
      stderr: '',
    });
  });
});
