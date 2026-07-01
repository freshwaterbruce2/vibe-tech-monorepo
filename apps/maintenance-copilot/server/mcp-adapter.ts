/**
 * mcp-adapter.ts - orchestration layer for the dashboard's /api/mcp/* + telemetry.
 *
 * Pure orchestration: it reshapes data from existing services (ps-health.ts,
 * workspace-scanner.ts) and bridges the live maintenance/cleanup actions to the
 * shared runners in ps-health.ts. It never re-implements a scan or re-parses raw
 * PowerShell output. All numbers are real; fields with no real source are honest
 * stubs (see the plan).
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
  runMaintenance,
  previewMaintenance,
  type DbFileRecord,
  type MaintenanceOptions,
} from './ps-health.js';

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

// --- Workspace health + real cross-package dependency drift -----------------

/** Specifiers we can't meaningfully compare for drift (internal / non-semver). */
const UNTRACKABLE_SPECIFIER = /^(workspace:|catalog:|link:|file:|npm:)/;
function isTrackableSpecifier(v: string): boolean {
  return Boolean(v) && v !== '*' && v !== 'latest' && !UNTRACKABLE_SPECIFIER.test(v);
}

async function readPkgMeta(
  p: WorkspacePackage,
): Promise<{ pkg: DashboardPackage; specs: Map<string, string> }> {
  const raw = JSON.parse(await readFile(join(p.absPath, 'package.json'), 'utf8')) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = raw.dependencies ?? {};
  const dev = raw.devDependencies ?? {};
  const specs = new Map<string, string>();
  for (const [name, version] of [...Object.entries(deps), ...Object.entries(dev)]) {
    if (isTrackableSpecifier(version)) specs.set(name, version);
  }
  return {
    pkg: {
      name: raw.name ?? p.relPath,
      path: p.relPath,
      type: p.relPath.startsWith('apps/') ? 'app' : 'package',
      dependenciesCount: Object.keys(deps).length,
      devDependenciesCount: Object.keys(dev).length,
      status: 'stable', // recomputed below once drift is known
    },
    specs,
  };
}

const totalPackages = (versions: DriftReport['versions']): number =>
  versions.reduce((sum, v) => sum + v.packages.length, 0);

/**
 * Real cross-package dependency-drift detection. Aggregates the distinct version
 * specifiers each external dependency carries across all workspace packages; a
 * dependency "drifts" when more than one distinct specifier is in use. Packages
 * pinned to a minority version are flagged 'drifted'. Drifts are sorted by
 * severity (distinct-version count, then total packages affected).
 */
async function buildWorkspaceHealth(): Promise<WorkspaceHealth> {
  const scan = await scanWorkspace(WORKSPACE_ROOT);
  const metas = (
    await Promise.all(scan.packages.map(async (p) => readPkgMeta(p).catch(() => null)))
  ).filter((m): m is Awaited<ReturnType<typeof readPkgMeta>> => m !== null);

  const byDep = new Map<string, Map<string, string[]>>();
  for (const m of metas) {
    for (const [name, version] of m.specs) {
      const byVer = byDep.get(name) ?? new Map<string, string[]>();
      byVer.set(version, [...(byVer.get(version) ?? []), m.pkg.name]);
      byDep.set(name, byVer);
    }
  }

  const drifts: DriftReport[] = [];
  const drifted = new Set<string>();
  for (const [dependencyName, byVer] of byDep) {
    if (byVer.size < 2) continue; // single agreed version => no drift
    const versions = [...byVer].map(([version, packages]) => ({ version, packages }));
    const majority = [...versions].sort((a, b) => b.packages.length - a.packages.length)[0].version;
    for (const v of versions) {
      if (v.version !== majority) v.packages.forEach((name) => drifted.add(name));
    }
    drifts.push({ dependencyName, versions });
  }
  drifts.sort(
    (a, b) =>
      b.versions.length - a.versions.length ||
      totalPackages(b.versions) - totalPackages(a.versions),
  );

  const packages = metas.map((m) => ({
    ...m.pkg,
    status: drifted.has(m.pkg.name) ? ('drifted' as const) : ('stable' as const),
  }));
  return { packages, drifts };
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

// --- Maintenance (real run_maintenance.py pipeline + guardrails) -------------

/** Human-readable summary of which pipeline steps a maintenance run will execute. */
function maintenanceSummary(opts: MaintenanceOptions): string {
  const steps = ['integrity check', 'WAL checkpoint', 'ANALYZE'];
  if (opts.retention) steps.push('retention purge (permanently deletes old learning rows)');
  if (opts.vacuum) steps.push('VACUUM (rewrites the DB to reclaim space)');
  if (opts.backup) steps.push('hot backup');
  const guard = opts.retention || opts.vacuum ? ' A backup runs first as a restore point.' : '';
  return (
    `[Dry Run] Database maintenance on agent_learning.db: ${steps.join(' → ')}.${guard}` +
    ' Confirm to execute live.'
  );
}

/** Guardrail: VACUUM rewrites the whole DB and needs ~2× its size free on D:. */
async function checkVacuumSpace(): Promise<{ ok: boolean; reason?: string }> {
  const [dDrive, dbReport] = await Promise.all([
    getDDriveHealthReport(),
    getDatabaseHealthReport(),
  ]);
  const learningDb = dbReport.files.find((f) => f.name === 'agent_learning.db');
  const needMB = (learningDb?.sizeMB ?? 0) * 2;
  const freeMB = dDrive.disk.freeGB * 1024;
  if (freeMB < needMB) {
    return {
      ok: false,
      reason:
        `VACUUM needs ~${needMB.toFixed(0)} MB free on D: (2× agent_learning.db) ` +
        `but only ${freeMB.toFixed(0)} MB is available.`,
    };
  }
  return { ok: true };
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
  // Inferred as required booleans (not the optional MaintenanceOptions fields)
  // so `destructive` below is a clean boolean OR, not a nullable one.
  const opts = {
    retention: req.body?.retention === true,
    vacuum: req.body?.vacuum === true,
    backup: req.body?.backup === true,
  };
  const dryRun = req.body?.dryRun !== false;

  if (dryRun) {
    res.json({
      success: true,
      dryRun: true,
      script: previewMaintenance(opts),
      message: maintenanceSummary(opts),
    } satisfies ActionResult);
    return;
  }

  // Guardrail: refuse VACUUM if D: lacks ~2× the DB size of free space.
  if (opts.vacuum) {
    const guard = await checkVacuumSpace();
    if (!guard.ok) {
      res
        .status(412)
        .json({ success: false, dryRun: false, error: guard.reason } satisfies ActionResult);
      return;
    }
  }

  // Guardrail: back up before any destructive step so there is a restore point.
  const destructive = opts.retention || opts.vacuum;
  if (destructive) {
    const backup = await runMaintenance({ backup: true });
    if (!backup.success) {
      res.status(500).json({
        success: false,
        dryRun: false,
        error: `Pre-maintenance backup failed; aborting before destructive steps. ${
          backup.error ?? backup.stderr
        }`,
      } satisfies ActionResult);
      return;
    }
  }

  // When destructive, the backup already ran above; the main pass does only the
  // remaining steps. Otherwise run exactly what was requested (baseline/backup).
  const r = await runMaintenance(
    destructive ? { retention: opts.retention, vacuum: opts.vacuum } : opts,
  );
  res.status(r.success ? 200 : 500).json({
    success: r.success,
    dryRun: false,
    ...(r.success
      ? { message: r.stdout || 'Maintenance complete.' }
      : { error: r.error ?? r.stderr }),
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
    // Count of dependencies with cross-package version drift (bounded penalty so
    // a real, larger drift count doesn't instantly floor the score).
    const mismatchedDeps = workspace.drifts.length;
    const healthScore = Math.max(
      0,
      100 - Math.min(mismatchedDeps, 20) - activeLockfiles * 2 - (logs.hasOOM ? 30 : 0),
    );
    return { mismatchedDeps, activeLockfiles, hasOOM: logs.hasOOM, healthScore };
  }),
);

mcpRouter.post('/api/diagnose', (_req, res) =>
  res.json({ active: false, notice: 'AI Diagnostics offline' }),
);
