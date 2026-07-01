/**
 * Route tests for the MCP adapter. ps-health, workspace-scanner, and fs are
 * mocked so every route + branch is exercised deterministically (no real
 * PowerShell/python, no disk, no workspace mutation).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../ps-health.js', () => ({
  WORKSPACE_ROOT: 'V:/monorepo', // path-segregation-ignore (mock workspace root under test)
  LEARNING_DIR: 'D:/learning-system',
  getDatabaseHealthReport: vi.fn(),
  getDDriveHealthReport: vi.fn(),
  scanLogsForErrors: vi.fn(),
  getGitStatus: vi.fn(),
  runPs: vi.fn(),
  runMaintenance: vi.fn(),
  previewMaintenance: vi.fn(),
}));
vi.mock('../workspace-scanner.js', () => ({ scanWorkspace: vi.fn() }));
vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));

import { readFile } from 'node:fs/promises';
import { scanWorkspace } from '../workspace-scanner.js';
import {
  getDatabaseHealthReport,
  getDDriveHealthReport,
  scanLogsForErrors,
  getGitStatus,
  runPs,
  runMaintenance,
  previewMaintenance,
} from '../ps-health.js';
import { mcpRouter } from '../mcp-adapter.js';

const app = express();
app.use(express.json());
app.use(mcpRouter);
const client = () => request(app);

const pkg = (relPath: string, name: string, absPath: string) => ({
  name,
  version: '1.0.0',
  private: false,
  relPath,
  absPath,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(scanLogsForErrors).mockResolvedValue({
    hasError: false,
    hasOOM: false,
    scanned: 0,
    matches: [],
  });
});

describe('GET /api/mcp/get_workspace_health', () => {
  it('detects real cross-package version drift and flags minority-version packages', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      root: 'V:/monorepo', // path-segregation-ignore (mock)
      includeGlobs: [],
      ignoreGlobs: [],
      scannedAt: '',
      count: 3,
      packages: [
        pkg('apps/a', '@v/a', '/ws/AA'),
        pkg('packages/b', '@v/b', '/ws/BB'),
        pkg('apps/c', '@v/c', '/ws/CC'),
      ],
    } as never);
    vi.mocked(readFile).mockImplementation((p) => {
      const s = String(p);
      if (s.includes('AA'))
        return Promise.resolve(
          JSON.stringify({
            name: '@v/a',
            dependencies: { react: '19.0.0', lodash: '^4.17.21' },
            devDependencies: { '@vibetech/shared': 'workspace:*' },
          }),
        ) as never;
      if (s.includes('BB'))
        return Promise.resolve(
          JSON.stringify({ name: '@v/b', dependencies: { react: '19.0.0' } }),
        ) as never;
      return Promise.resolve(
        JSON.stringify({ name: '@v/c', dependencies: { react: '18.0.0', lodash: '^4.17.21' } }),
      ) as never;
    });

    const res = await client().get('/api/mcp/get_workspace_health');

    expect(res.status).toBe(200);
    // react drifts (19 majority vs 18); lodash agrees; workspace:* is excluded.
    expect(res.body.drifts).toEqual([
      {
        dependencyName: 'react',
        versions: [
          { version: '19.0.0', packages: ['@v/a', '@v/b'] },
          { version: '18.0.0', packages: ['@v/c'] },
        ],
      },
    ]);
    const byName = (n: string) => res.body.packages.find((p: { name: string }) => p.name === n);
    expect(byName('@v/a')).toMatchObject({
      type: 'app',
      dependenciesCount: 2,
      devDependenciesCount: 1,
      status: 'stable',
    });
    expect(byName('@v/b')).toMatchObject({ type: 'package', status: 'stable' });
    expect(byName('@v/c')).toMatchObject({ type: 'app', status: 'drifted' });
  });

  it('reports no drift when every package agrees on the version', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      packages: [pkg('apps/a', '@v/a', '/ws/AA'), pkg('apps/c', '@v/c', '/ws/CC')],
      count: 2,
    } as never);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ name: '@v/x', dependencies: { react: '19.0.0' } }) as never,
    );

    const res = await client().get('/api/mcp/get_workspace_health');
    expect(res.body.drifts).toEqual([]);
    expect(res.body.packages.every((p: { status: string }) => p.status === 'stable')).toBe(true);
  });

  it('skips packages whose package.json is unreadable', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      packages: [pkg('apps/a', '@v/a', '/ws/AA'), pkg('apps/b', '@v/b', '/ws/BB')],
      count: 2,
    } as never);
    vi.mocked(readFile).mockImplementation((p) =>
      String(p).includes('AA')
        ? (Promise.resolve(JSON.stringify({ name: '@v/a', dependencies: {} })) as never)
        : (Promise.reject(new Error('ENOENT')) as never),
    );

    const res = await client().get('/api/mcp/get_workspace_health');
    expect(res.body.packages).toHaveLength(1);
    expect(res.body.packages[0].name).toBe('@v/a');
  });

  it('sorts multiple drifts by severity (version count, then packages affected)', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      packages: [
        pkg('apps/a', '@v/a', '/ws/AA'),
        pkg('apps/b', '@v/b', '/ws/BB'),
        pkg('apps/c', '@v/c', '/ws/CC'),
      ],
      count: 3,
    } as never);
    vi.mocked(readFile).mockImplementation((p) => {
      const s = String(p);
      if (s.includes('AA'))
        return Promise.resolve(
          JSON.stringify({ name: '@v/a', dependencies: { react: '19.0.0', vite: '7.0.0' } }),
        ) as never;
      if (s.includes('BB'))
        return Promise.resolve(
          JSON.stringify({ name: '@v/b', dependencies: { react: '19.0.0', vite: '6.0.0' } }),
        ) as never;
      return Promise.resolve(
        JSON.stringify({ name: '@v/c', dependencies: { react: '18.0.0' } }),
      ) as never;
    });

    const res = await client().get('/api/mcp/get_workspace_health');
    // Both react and vite drift across 2 versions (tie on version count), so the
    // tiebreak is total packages affected: react (3) sorts before vite (2).
    expect(res.body.drifts.map((d: { dependencyName: string }) => d.dependencyName)).toEqual([
      'react',
      'vite',
    ]);
  });
});

describe('GET /api/mcp/get_database_health', () => {
  it('maps db file records to the dashboard schema', async () => {
    vi.mocked(getDatabaseHealthReport).mockResolvedValue({
      summary: { totalDatabases: 2, coreDatabases: 1, largeWalFiles: 0 },
      files: [
        {
          name: 'a.db',
          relativePath: 'a.db',
          sizeMB: 1.5,
          walExists: true,
          shmExists: true,
          integrity: 'ok',
          isCore: true,
        },
        {
          name: 'b.db',
          relativePath: 'b.db',
          sizeMB: 0.2,
          walExists: false,
          shmExists: false,
          integrity: 'failed:corrupt',
          isCore: false,
        },
      ],
    });

    const res = await client().get('/api/mcp/get_database_health');
    expect(res.body.databases).toEqual([
      {
        name: 'a.db',
        path: 'a.db',
        size: '1.5 MB',
        walStatus: 'Enabled',
        status: 'OK',
        hasLock: true,
      },
      {
        name: 'b.db',
        path: 'b.db',
        size: '0.2 MB',
        walStatus: 'Disabled',
        status: 'INTEGRITY_ERROR',
        hasLock: false,
      },
    ]);
  });

  it('preserves a unique path for same-named DBs in different folders', async () => {
    vi.mocked(getDatabaseHealthReport).mockResolvedValue({
      summary: { totalDatabases: 2, coreDatabases: 1, largeWalFiles: 0 },
      files: [
        {
          name: 'trading.db',
          relativePath: 'trading.db',
          sizeMB: 1,
          walExists: true,
          shmExists: false,
          integrity: 'ok',
          isCore: true,
        },
        {
          name: 'trading.db',
          relativePath: 'crypto-enhanced/trading.db',
          sizeMB: 2,
          walExists: false,
          shmExists: false,
          integrity: 'ok',
          isCore: false,
        },
      ],
    });

    const res = await client().get('/api/mcp/get_database_health');
    expect(res.body.databases.map((d: { path: string }) => d.path)).toEqual([
      'trading.db',
      'crypto-enhanced/trading.db',
    ]);
  });
});

describe('GET /api/mcp/get_d_drive_health', () => {
  it('reframes learning data with real insightsCount and OOM-derived crashed flag', async () => {
    vi.mocked(getDDriveHealthReport).mockResolvedValue({
      disk: { status: 'OK', freeGB: 450.2, totalGB: 1000, usedPct: 55 },
      learningSystem: { status: 'OK', staleDays: 30, staleFileCount: 4 },
    });
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ success_patterns: new Array(109).fill(0) }) as never,
    );
    vi.mocked(scanLogsForErrors).mockResolvedValue({
      hasError: true,
      hasOOM: true,
      scanned: 3,
      matches: [{ file: 'x.err.log', line: 9, text: 'FATAL: out of memory killing process' }],
    });

    const res = await client().get('/api/mcp/get_d_drive_health');
    expect(res.body).toMatchObject({
      totalSize: '1000 GB',
      freeSpace: '450.2 GB',
      learningSystem: { status: 'OK', staleFileCount: 4, insightsCount: 109, crashed: true },
    });
    expect(res.body.learningSystem.reason).toMatch(/out of memory/i);
  });

  it('insightsCount is 0 when learning_insights.json is unreadable (honest fallback)', async () => {
    vi.mocked(getDDriveHealthReport).mockResolvedValue({
      disk: { status: 'OK', freeGB: 1, totalGB: 2, usedPct: 50 },
      learningSystem: { status: 'OK', staleDays: 30, staleFileCount: 0 },
    });
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

    const res = await client().get('/api/mcp/get_d_drive_health');
    expect(res.body.learningSystem.insightsCount).toBe(0);
    expect(res.body.learningSystem.crashed).toBe(false);
  });
});

describe('GET /api/mcp/get_git_status', () => {
  it('returns the GitReport from getGitStatus', async () => {
    vi.mocked(getGitStatus).mockResolvedValue({
      branch: 'feat/mc-dashboard',
      isDirty: true,
      recentCommits: [{ hash: 'abc123', message: 'feat: add adapter' }],
    });
    const res = await client().get('/api/mcp/get_git_status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      branch: 'feat/mc-dashboard',
      isDirty: true,
      recentCommits: [{ hash: 'abc123', message: 'feat: add adapter' }],
    });
  });

  it('returns 500 when the underlying query rejects (ok() error path)', async () => {
    vi.mocked(getGitStatus).mockRejectedValue(new Error('git exploded'));
    const res = await client().get('/api/mcp/get_git_status');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'git exploded' });
  });
});

describe('POST /api/mcp/run_workspace_maintenance', () => {
  it('dry-run returns the real pipeline preview + summary without executing', async () => {
    vi.mocked(previewMaintenance).mockReturnValue('python "RM"');
    const res = await client().post('/api/mcp/run_workspace_maintenance').send({ dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, dryRun: true, script: 'python "RM"' });
    expect(res.body.message).toContain('integrity check');
    expect(res.body.message).toContain('WAL checkpoint');
    expect(previewMaintenance).toHaveBeenCalledWith({
      retention: false,
      vacuum: false,
      backup: false,
    });
    expect(runMaintenance).not.toHaveBeenCalled();
  });

  it('dry-run summarizes the opt-in deep-clean steps and the auto-backup guard', async () => {
    vi.mocked(previewMaintenance).mockReturnValue('python "RM --all"');
    const res = await client()
      .post('/api/mcp/run_workspace_maintenance')
      .send({ dryRun: true, retention: true, vacuum: true, backup: true });
    expect(res.body.message).toContain('VACUUM');
    expect(res.body.message).toContain('retention purge');
    expect(res.body.message).toContain('A backup runs first');
    expect(previewMaintenance).toHaveBeenCalledWith({
      retention: true,
      vacuum: true,
      backup: true,
    });
  });

  it('live baseline runs the pipeline once and bubbles its stdout', async () => {
    vi.mocked(runMaintenance).mockResolvedValue({
      success: true,
      stdout: 'MAINTENANCE SUCCESS',
      stderr: '',
    });
    const res = await client().post('/api/mcp/run_workspace_maintenance').send({ dryRun: false });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, dryRun: false, message: 'MAINTENANCE SUCCESS' });
    expect(runMaintenance).toHaveBeenCalledTimes(1);
    expect(runMaintenance).toHaveBeenCalledWith({ retention: false, vacuum: false, backup: false });
  });

  it('backup-only runs a single pass (not destructive, no pre-backup)', async () => {
    vi.mocked(runMaintenance).mockResolvedValue({ success: true, stdout: 'backed up', stderr: '' });
    const res = await client()
      .post('/api/mcp/run_workspace_maintenance')
      .send({ dryRun: false, backup: true });
    expect(runMaintenance).toHaveBeenCalledTimes(1);
    expect(runMaintenance).toHaveBeenCalledWith({ retention: false, vacuum: false, backup: true });
    expect(res.body.message).toBe('backed up');
  });

  it('VACUUM passes the disk-space guardrail then backs up before the destructive pass', async () => {
    vi.mocked(getDDriveHealthReport).mockResolvedValue({
      disk: { status: 'OK', freeGB: 100, totalGB: 1000, usedPct: 50 },
      learningSystem: { status: 'OK', staleDays: 30, staleFileCount: 0 },
    });
    vi.mocked(getDatabaseHealthReport).mockResolvedValue({
      summary: { totalDatabases: 1, coreDatabases: 1, largeWalFiles: 0 },
      files: [
        {
          name: 'agent_learning.db',
          relativePath: 'agent_learning.db',
          sizeMB: 10,
          walExists: false,
          shmExists: false,
          integrity: 'ok',
          isCore: true,
        },
      ],
    });
    vi.mocked(runMaintenance).mockResolvedValue({ success: true, stdout: 'ok', stderr: '' });

    const res = await client()
      .post('/api/mcp/run_workspace_maintenance')
      .send({ dryRun: false, vacuum: true });

    expect(res.status).toBe(200);
    expect(runMaintenance).toHaveBeenCalledTimes(2);
    expect(runMaintenance).toHaveBeenNthCalledWith(1, { backup: true });
    expect(runMaintenance).toHaveBeenNthCalledWith(2, { retention: false, vacuum: true });
  });

  it('refuses VACUUM with 412 when D: lacks ~2× the DB size of free space', async () => {
    vi.mocked(getDDriveHealthReport).mockResolvedValue({
      disk: { status: 'FAIL', freeGB: 0.001, totalGB: 1000, usedPct: 99 },
      learningSystem: { status: 'OK', staleDays: 30, staleFileCount: 0 },
    });
    vi.mocked(getDatabaseHealthReport).mockResolvedValue({
      summary: { totalDatabases: 1, coreDatabases: 1, largeWalFiles: 0 },
      files: [
        {
          name: 'agent_learning.db',
          relativePath: 'agent_learning.db',
          sizeMB: 10,
          walExists: false,
          shmExists: false,
          integrity: 'ok',
          isCore: true,
        },
      ],
    });

    const res = await client()
      .post('/api/mcp/run_workspace_maintenance')
      .send({ dryRun: false, vacuum: true });

    expect(res.status).toBe(412);
    expect(res.body.error).toContain('VACUUM needs');
    expect(runMaintenance).not.toHaveBeenCalled();
  });

  it('aborts with 500 if the pre-destructive backup fails (retention requested)', async () => {
    vi.mocked(runMaintenance).mockResolvedValueOnce({
      success: false,
      stdout: '',
      stderr: 'disk full',
      error: 'backup err',
    });
    const res = await client()
      .post('/api/mcp/run_workspace_maintenance')
      .send({ dryRun: false, retention: true });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Pre-maintenance backup failed');
    expect(runMaintenance).toHaveBeenCalledTimes(1);
    expect(runMaintenance).toHaveBeenCalledWith({ backup: true });
  });

  it('live failure surfaces the pipeline error as 500', async () => {
    vi.mocked(runMaintenance).mockResolvedValue({
      success: false,
      stdout: '',
      stderr: '',
      error: 'boom',
    });
    const res = await client().post('/api/mcp/run_workspace_maintenance').send({ dryRun: false });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, dryRun: false, error: 'boom' });
  });
});

describe('POST /api/mcp/run_workspace_cleanup', () => {
  it('dry-run returns the real -DryRun script preview', async () => {
    vi.mocked(runPs).mockResolvedValue({
      success: true,
      stdout: 'Would remove 3 tmp entries',
      stderr: '',
    });
    const res = await client().post('/api/mcp/run_workspace_cleanup').send({ dryRun: true });
    expect(runPs).toHaveBeenCalledWith('cleanup-stale-artifacts.ps1', '-DryRun');
    expect(res.body).toMatchObject({
      success: true,
      dryRun: true,
      script: 'Would remove 3 tmp entries',
    });
  });

  it('live run executes the cleanup script (no -DryRun)', async () => {
    vi.mocked(runPs).mockResolvedValue({
      success: true,
      stdout: 'Cleanup complete. Removed 3',
      stderr: '',
    });
    const res = await client().post('/api/mcp/run_workspace_cleanup').send({ dryRun: false });
    expect(runPs).toHaveBeenCalledWith('cleanup-stale-artifacts.ps1', '');
    expect(res.body).toMatchObject({
      success: true,
      dryRun: false,
      message: 'Cleanup complete. Removed 3',
    });
  });
});

describe('telemetry + reset + diagnose', () => {
  it('GET /api/telemetry aggregates real drift count + heuristic healthScore', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      packages: [pkg('apps/a', '@v/a', '/ws/AA'), pkg('apps/c', '@v/c', '/ws/CC')],
      count: 2,
    } as never);
    vi.mocked(readFile).mockImplementation((p) =>
      String(p).includes('AA')
        ? (Promise.resolve(
            JSON.stringify({ name: '@v/a', dependencies: { react: '19.0.0' } }),
          ) as never)
        : (Promise.resolve(
            JSON.stringify({ name: '@v/c', dependencies: { react: '18.0.0' } }),
          ) as never),
    );
    vi.mocked(getDatabaseHealthReport).mockResolvedValue({
      summary: { totalDatabases: 1, coreDatabases: 0, largeWalFiles: 1 },
      files: [
        {
          name: 'a.db',
          relativePath: 'a.db',
          sizeMB: 1,
          walExists: true,
          shmExists: false,
          integrity: 'ok',
          isCore: false,
        },
      ],
    });

    const res = await client().get('/api/telemetry');
    // 1 drifting dep (react), 1 active WAL, no OOM => 100 - 1 - 2 - 0 = 97.
    expect(res.body).toEqual({
      mismatchedDeps: 1,
      activeLockfiles: 1,
      hasOOM: false,
      healthScore: 97,
    });
  });

  it('POST /api/mcp/reset and POST /api/diagnose return their static contracts', async () => {
    expect((await client().post('/api/mcp/reset')).body).toEqual({ success: true });
    expect((await client().post('/api/diagnose')).body).toEqual({
      active: false,
      notice: 'AI Diagnostics offline',
    });
  });
});
