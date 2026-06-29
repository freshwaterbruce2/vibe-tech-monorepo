/**
 * Unit tests for the self-healing remediation handlers.
 *
 * child_process.execSync and fs are mocked so we exercise every logic branch
 * (success + failure for each handler) without mutating the real workspace,
 * touching disk, or rewriting apps/nova-agent/project.json. resolveWorkspaceRoot
 * is stubbed to a fixed root so the constructed paths are deterministic.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { handleDependencyFix, handleDatabaseUnlock, handleDaemonRecovery } from '../remediation.js';

const ROOT = 'V:/monorepo'; // path-segregation-ignore (fixed mock workspace root for deterministic path assertions under test)

vi.mock('child_process', () => ({ execSync: vi.fn() }));
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));
vi.mock('../workspace-scanner.js', () => ({
  resolveWorkspaceRoot: vi.fn(() => ROOT),
}));

const mockedExecSync = vi.mocked(execSync);
const mockedExists = vi.mocked(fs.existsSync);
const mockedUnlink = vi.mocked(fs.unlinkSync);
const mockedRead = vi.mocked(fs.readFileSync);
const mockedWrite = vi.mocked(fs.writeFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleDependencyFix', () => {
  it('runs the targeted pnpm workspace-root lodash override and returns its log', async () => {
    mockedExecSync.mockReturnValue('Packages: +1\nProgress: done\n' as never);

    const result = await handleDependencyFix();

    expect(mockedExecSync).toHaveBeenCalledWith(
      'pnpm add lodash@^4.17.21 --save-exact --workspace-root',
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(result).toEqual({ success: true, log: 'Packages: +1\nProgress: done\n' });
  });

  it('returns success:false with the error message when pnpm fails', async () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error('ERR_PNPM_OUTDATED_LOCKFILE');
    });

    const result = await handleDependencyFix();

    expect(result).toEqual({ success: false, log: 'ERR_PNPM_OUTDATED_LOCKFILE' });
  });
});

describe('handleDatabaseUnlock', () => {
  it('unlinks dangling WAL and SHM artifacts inside the mock d_drive databases folder', async () => {
    mockedExists.mockReturnValue(true);

    const result = await handleDatabaseUnlock('trading.db');

    const dbPath = path.join(ROOT, 'mock', 'd_drive', 'databases', 'trading.db');
    expect(mockedUnlink).toHaveBeenCalledTimes(2);
    expect(mockedUnlink).toHaveBeenCalledWith(`${dbPath}-wal`);
    expect(mockedUnlink).toHaveBeenCalledWith(`${dbPath}-shm`);
    expect(result.success).toBe(true);
    expect(result.log).toContain('Removed dangling Write-Ahead Log file: trading.db-wal');
    expect(result.log).toContain('Removed shared memory marker: trading.db-shm');
    expect(result.log).toContain('Database trading.db connections successfully cleared.');
  });

  it('reports cleared connections without unlinking when no WAL/SHM artifacts exist', async () => {
    mockedExists.mockReturnValue(false);

    const result = await handleDatabaseUnlock('memory.db');

    expect(mockedUnlink).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.log).toContain('Initiating lock striping sequence for memory.db');
    expect(result.log).toContain('connections successfully cleared');
    expect(result.log).not.toContain('Removed');
  });

  it('returns success:false when an unlink throws (e.g. EBUSY)', async () => {
    mockedExists.mockReturnValue(true);
    mockedUnlink.mockImplementation(() => {
      throw new Error('EBUSY: resource busy or locked');
    });

    const result = await handleDatabaseUnlock('locked.db');

    expect(result).toEqual({ success: false, log: 'EBUSY: resource busy or locked' });
  });
});

describe('handleDaemonRecovery', () => {
  it('injects the 4GB max-old-space-size override when a train target exists', async () => {
    mockedExists.mockReturnValue(true);
    mockedRead.mockReturnValue(
      JSON.stringify({ targets: { train: { options: { cwd: 'apps/nova-agent' } } } }) as never,
    );

    const result = await handleDaemonRecovery();

    expect(mockedWrite).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenBody] = mockedWrite.mock.calls[0];
    expect(String(writtenPath)).toContain(path.join('apps', 'nova-agent', 'project.json'));
    const written = JSON.parse(String(writtenBody));
    expect(written.targets.train.options.nodeOptions).toBe('--max-old-space-size=4096');
    expect(written.targets.train.options.cwd).toBe('apps/nova-agent'); // existing options preserved
    expect(result).toEqual({
      success: true,
      log: 'Memory boundary adjusted to 4GB. OOM threshold neutralized.',
    });
  });

  it('exits gracefully without writing when project.json has no train target', async () => {
    mockedExists.mockReturnValue(true);
    mockedRead.mockReturnValue(JSON.stringify({ targets: { build: {} } }) as never);

    const result = await handleDaemonRecovery();

    expect(mockedWrite).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      log: 'Nova Agent engine targets could not be located.',
    });
  });

  it('exits gracefully when the nova-agent project.json is absent', async () => {
    mockedExists.mockReturnValue(false);

    const result = await handleDaemonRecovery();

    expect(mockedRead).not.toHaveBeenCalled();
    expect(mockedWrite).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      log: 'Nova Agent engine targets could not be located.',
    });
  });

  it('returns success:false when reading/parsing project.json throws', async () => {
    mockedExists.mockReturnValue(true);
    mockedRead.mockReturnValue('{ not-valid-json' as never);

    const result = await handleDaemonRecovery();

    expect(result.success).toBe(false);
    expect(typeof result.log).toBe('string');
    expect(result.log.length).toBeGreaterThan(0);
  });
});
