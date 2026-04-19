import {
  MonorepoWatcher,
  NxGraphService,
  HealthProbe,
  DbMetricsService,
  BackupService,
  ProcessRunner,
  ClaudeBridge,
  RagClient
} from './services';

export interface ServiceContainer {
  watcher: MonorepoWatcher;
  nxGraph: NxGraphService;
  health: HealthProbe;
  dbMetrics: DbMetricsService;
  backup: BackupService;
  runner: ProcessRunner;
  claude: ClaudeBridge;
  rag: RagClient;
  wsPort: number;
}

export interface ServiceContainerOptions {
  monorepoRoot: string;
  wsPort: number;
}

export function createServiceContainer(opts: ServiceContainerOptions): ServiceContainer {
  const runner = new ProcessRunner();
  const watcher = new MonorepoWatcher({ monorepoRoot: opts.monorepoRoot, debounceMs: 250 });
  const nxGraph = new NxGraphService({ monorepoRoot: opts.monorepoRoot });
  const health = new HealthProbe();
  const dbMetrics = new DbMetricsService();
  const backup = new BackupService();
  const claude = new ClaudeBridge({}, runner);
  const rag = new RagClient();

  return { watcher, nxGraph, health, dbMetrics, backup, runner, claude, rag, wsPort: opts.wsPort };
}

export async function disposeServiceContainer(c: ServiceContainer): Promise<void> {
  try { await c.watcher.stop(); } catch {}
  try { await c.rag.disconnect(); } catch {}
  for (const p of c.runner.list()) {
    if (p.status === 'running') c.runner.kill(p.id);
  }
}
