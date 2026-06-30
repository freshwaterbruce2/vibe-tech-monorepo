/**
 * Route tests for the MCP adapter. ps-health, workspace-scanner, remediation,
 * and fs are mocked so every route + branch is exercised deterministically
 * (no real PowerShell, no disk, no workspace mutation).
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
}));
vi.mock('../workspace-scanner.js', () => ({ scanWorkspace: vi.fn() }));
vi.mock('../remediation.js', () => ({ handleDependencyFix: vi.fn() }));
vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));

import { readFile } from 'node:fs/promises';
import { scanWorkspace } from '../workspace-scanner.js';
import { handleDependencyFix } from '../remediation.js';
import {
  getDatabaseHealthReport,
  getDDriveHealthReport,
  scanLogsForErrors,
  getGitStatus,
  runPs,
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
  it('splits apps/packages, counts deps, and reports lodash drift truthfully', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      root: 'V:/monorepo', // path-segregation-ignore (mock)
      includeGlobs: [],
      ignoreGlobs: [],
      scannedAt: '',
      count: 2,
      packages: [pkg('apps/a', '@v/a', '/ws/apps/a'), pkg('packages/b', '@v/b', '/ws/packages/b')],
    } as never);
    vi.mocked(readFile).mockImplementation(
      (p) =>
        Promise.resolve(
          String(p).includes('apps')
            ? JSON.stringify({ name: '@v/a', dependencies: { lodash: '^4.17.0', react: '19' } })
            : JSON.stringify({ name: '@v/b', dependencies: {}, devDependencies: { vitest: '^4' } }),
        ) as never,
    );

    const res = await client().get('/api/mcp/get_workspace_health');

    expect(res.status).toBe(200);
    expect(res.body.packages).toHaveLength(2);
    const a = res.body.packages.find((p: { name: string }) => p.name === '@v/a');
    expect(a).toMatchObject({ type: 'app', dependenciesCount: 2, status: 'drifted' });
    const b = res.body.packages.find((p: { name: string }) => p.name === '@v/b');
    expect(b).toMatchObject({ type: 'package', devDependenciesCount: 1, status: 'stable' });
    expect(res.body.drifts).toEqual([
      { dependencyName: 'lodash', versions: [{ version: '^4.17.0', packages: ['@v/a'] }] },
    ]);
  });

  it('yields empty drifts when no package carries the aligned dep (real tree state)', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      packages: [pkg('apps/a', '@v/a', '/a')],
      count: 1,
    } as never);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ name: '@v/a', dependencies: { react: '19' } }) as never,
    );

    const res = await client().get('/api/mcp/get_workspace_health');
    expect(res.body.drifts).toEqual([]);
    expect(res.body.packages[0].status).toBe('stable');
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
      { name: 'a.db', size: '1.5 MB', walStatus: 'Enabled', status: 'OK', hasLock: true },
      {
        name: 'b.db',
        size: '0.2 MB',
        walStatus: 'Disabled',
        status: 'INTEGRITY_ERROR',
        hasLock: false,
      },
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
});

describe('POST /api/mcp/run_workspace_maintenance', () => {
  it('dry-run returns the alignment command preview without mutating', async () => {
    const res = await client().post('/api/mcp/run_workspace_maintenance').send({ dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, dryRun: true });
    expect(res.body.script).toContain('pnpm add lodash@^4.17.21');
    expect(handleDependencyFix).not.toHaveBeenCalled();
  });

  it('live run bridges to handleDependencyFix and bubbles its {success,log}', async () => {
    vi.mocked(handleDependencyFix).mockResolvedValue({ success: true, log: 'Packages: +1' });
    const res = await client().post('/api/mcp/run_workspace_maintenance').send({ dryRun: false });
    expect(handleDependencyFix).toHaveBeenCalledOnce();
    expect(res.body).toEqual({ success: true, dryRun: false, message: 'Packages: +1' });
  });

  it('live failure surfaces the handler log as error with 500', async () => {
    vi.mocked(handleDependencyFix).mockResolvedValue({ success: false, log: 'ERR_PNPM' });
    const res = await client().post('/api/mcp/run_workspace_maintenance').send({ dryRun: false });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, dryRun: false, error: 'ERR_PNPM' });
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
  it('GET /api/telemetry aggregates real counts + heuristic healthScore', async () => {
    vi.mocked(scanWorkspace).mockResolvedValue({
      packages: [pkg('apps/a', '@v/a', '/a')],
      count: 1,
    } as never);
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ name: '@v/a', dependencies: { lodash: '^4.0.0' } }) as never,
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
    expect(res.body).toEqual({
      mismatchedDeps: 1,
      activeLockfiles: 1,
      hasOOM: false,
      healthScore: 93,
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
