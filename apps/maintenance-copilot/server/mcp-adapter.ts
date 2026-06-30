/**
 * mcp-adapter.ts - orchestration layer for the dashboard's /api/mcp/* + telemetry.
 *
 * Pure orchestration: it reshapes data from existing services (ps-health.ts,
 * workspace-scanner.ts) and bridges live repair actions to remediation.ts. It
 * never re-implements a scan or re-parses raw PowerShell output. All numbers are
 * real; fields with no real source are honest stubs (see the plan).
 */
import { Router, type Request, type Response } from 'express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scanWorkspace, type WorkspacePackage } from './workspace-scanner.js';
import {
  WORKSPACE_ROOT,
  LEARNING_DIR,
  getDatabaseHealthReport,
  getDDriveHealthReport,
  scanLogsForErrors,
  getGitStatus,
  runPs,
  type DbFileRecord,
} from './ps-health.js';
import { handleDependencyFix } from './remediation.js';

// --- Dashboard payload shapes (must match what index.html reads) ------------

interface DashboardPackage {
  name: string;
  path: string;
  type: 'app' | 'package';
  dependenciesCount: number;
  devDependenciesCount: number;
  status: 'stable' | 'drifted';
}
interface DriftReport {
  dependencyName: string;
  versions: { version: string; packages: string[] }[];
}
interface WorkspaceHealth {
  packages: DashboardPackage[];
  drifts: DriftReport[];
}
interface DashboardDatabase {
  name: string;
  path: string;
  size: string;
  walStatus: 'Enabled' | 'Disabled';
  status: 'OK' | 'SQLITE_BUSY' | 'INTEGRITY_ERROR';
  hasLock: boolean;
}
interface ActionResult {
  success: boolean;
  dryRun: boolean;
  script?: string;
  message?: string;
  error?: string;
}

/**
 * Deps the maintenance action (handleDependencyFix) actually aligns. Drift is
 * reported only against these, so the dashboard's "drift" == what we can fix.
 * lodash is currently absent from the tree, so this truthfully yields [].
 */
const ALIGN_TARGETS = [{ name: 'lodash', expected: '^4.17.21' }];

// --- Workspace health -------------------------------------------------------

async function readPkgMeta(
  p: WorkspacePackage,
): Promise<{ pkg: DashboardPackage; drift: { name: string; version: string }[] }> {
  const raw = JSON.parse(await readFile(join(p.absPath, 'package.json'), 'utf8')) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = raw.dependencies ?? {};
  const dev = raw.devDependencies ?? {};
  const drift = ALIGN_TARGETS.flatMap(({ name, expected }) => {
    const v = deps[name] ?? dev[name];
    return v && v !== expected ? [{ name, version: v }] : [];
  });
  return {
    pkg: {
      name: raw.name ?? p.relPath,
      path: p.relPath,
      type: p.relPath.startsWith('apps/') ? 'app' : 'package',
      dependenciesCount: Object.keys(deps).length,
      devDependenciesCount: Object.keys(dev).length,
      status: drift.length ? 'drifted' : 'stable',
    },
    drift,
  };
}

async function buildWorkspaceHealth(): Promise<WorkspaceHealth> {
  const scan = await scanWorkspace(WORKSPACE_ROOT);
  const metas = (
    await Promise.all(scan.packages.map(async (p) => readPkgMeta(p).catch(() => null)))
  ).filter((m): m is Awaited<ReturnType<typeof readPkgMeta>> => m !== null);
  const driftMap = new Map<string, Map<string, string[]>>();
  for (const m of metas) {
    for (const d of m.drift) {
      const byVer = driftMap.get(d.name) ?? new Map<string, string[]>();
      byVer.set(d.version, [...(byVer.get(d.version) ?? []), m.pkg.name]);
      driftMap.set(d.name, byVer);
    }
  }
  const drifts: DriftReport[] = [...driftMap].map(([dependencyName, byVer]) => ({
    dependencyName,
    versions: [...byVer].map(([version, packages]) => ({ version, packages })),
  }));
  return { packages: metas.map((m) => m.pkg), drifts };
}

// --- Database + D:\ health (reshape from ps-health parsed reports) ----------

function mapDatabase(f: DbFileRecord): DashboardDatabase {
  const status: DashboardDatabase['status'] = f.integrity.startsWith('failed')
    ? 'INTEGRITY_ERROR'
    : 'OK';
  return {
    name: f.name,
    // Unique key: DB names repeat across subfolders (e.g. trading.db and
    // crypto-enhanced/trading.db), so the UI keys/labels on relativePath.
    path: f.relativePath,
    size: `${f.sizeMB} MB`,
    walStatus: f.walExists ? 'Enabled' : 'Disabled',
    status,
    hasLock: f.walExists,
  };
}

async function readInsightsCount(): Promise<number> {
  try {
    const raw = JSON.parse(
      await readFile(join(LEARNING_DIR, 'learning_insights.json'), 'utf8'),
    ) as { success_patterns?: unknown[] };
    return Array.isArray(raw.success_patterns) ? raw.success_patterns.length : 0;
  } catch {
    return 0;
  }
}

async function buildDDriveHealth() {
  const [report, insightsCount, logs] = await Promise.all([
    getDDriveHealthReport(),
    readInsightsCount(),
    scanLogsForErrors(),
  ]);
  return {
    totalSize: `${report.disk.totalGB} GB`,
    freeSpace: `${report.disk.freeGB} GB`,
    learningSystem: {
      status: report.learningSystem.status,
      staleFileCount: report.learningSystem.staleFileCount,
      insightsCount,
      crashed: logs.hasOOM,
      reason: logs.hasOOM
        ? logs.matches.find((m) => /oom|out of memory/i.test(m.text))?.text
        : undefined,
    },
  };
}

// --- Router -----------------------------------------------------------------

export const mcpRouter = Router();

const ok = async (res: Response, fn: () => Promise<unknown>) =>
  fn()
    .then((data) => res.json(data))
    .catch((e: unknown) => res.status(500).json({ error: (e as Error).message }));

mcpRouter.get('/api/mcp/get_workspace_health', async (_req, res) => ok(res, buildWorkspaceHealth));

mcpRouter.get('/api/mcp/get_database_health', async (_req, res) =>
  ok(res, async () => ({ databases: (await getDatabaseHealthReport()).files.map(mapDatabase) })),
);

mcpRouter.get('/api/mcp/get_d_drive_health', async (_req, res) => ok(res, buildDDriveHealth));

mcpRouter.get('/api/mcp/get_git_status', async (_req, res) => ok(res, getGitStatus));

mcpRouter.post('/api/mcp/run_workspace_maintenance', async (req: Request, res: Response) => {
  const dryRun = req.body?.dryRun !== false;
  if (dryRun) {
    res.json({
      success: true,
      dryRun: true,
      script: 'pnpm add lodash@^4.17.21 --save-exact --workspace-root',
      message: '[Dry Run] Dependency-alignment command generated. Confirm to execute live.',
    } satisfies ActionResult);
    return;
  }
  const r = await handleDependencyFix();
  res.status(r.success ? 200 : 500).json({
    success: r.success,
    dryRun: false,
    ...(r.success ? { message: r.log } : { error: r.log }),
  } satisfies ActionResult);
});

mcpRouter.post('/api/mcp/run_workspace_cleanup', async (req: Request, res: Response) => {
  const dryRun = req.body?.dryRun !== false;
  const r = await runPs('cleanup-stale-artifacts.ps1', dryRun ? '-DryRun' : '');
  res.status(r.success ? 200 : 500).json({
    success: r.success,
    dryRun,
    ...(dryRun ? { script: r.stdout } : {}),
    ...(r.success ? { message: r.stdout || 'Cleanup complete.' } : { error: r.error ?? r.stderr }),
  } satisfies ActionResult);
});

mcpRouter.post('/api/mcp/reset', (_req, res) => res.json({ success: true }));

mcpRouter.get('/api/telemetry', async (_req, res) =>
  ok(res, async () => {
    const [workspace, dbReport, logs] = await Promise.all([
      buildWorkspaceHealth(),
      getDatabaseHealthReport(),
      scanLogsForErrors(),
    ]);
    const activeLockfiles = dbReport.files.filter((f) => f.walExists).length;
    const mismatchedDeps = workspace.packages.filter((p) => p.status === 'drifted').length;
    const healthScore = Math.max(
      0,
      100 - mismatchedDeps * 5 - activeLockfiles * 2 - (logs.hasOOM ? 30 : 0),
    );
    return { mismatchedDeps, activeLockfiles, hasOOM: logs.hasOOM, healthScore };
  }),
);

mcpRouter.post('/api/diagnose', (_req, res) =>
  res.json({ active: false, notice: 'AI Diagnostics offline' }),
);
