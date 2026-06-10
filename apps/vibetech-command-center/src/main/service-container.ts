import {
  MonorepoWatcher,
  NxGraphService,
  HealthProbe,
  DbMetricsService,
  BackupService,
  ProcessRunner,
  ClaudeBridge,
  RagClient,
  NxAffectedService,
  DbExplorerService,
  AgentOrchestratorService,
  MemoryVizService,
  WebMCPGatewayService
} from './services';

export interface ServiceContainer {
  watcher: MonorepoWatcher;
  nxGraph: NxGraphService;
  nxAffected: NxAffectedService;
  health: HealthProbe;
  dbMetrics: DbMetricsService;
  backup: BackupService;
  runner: ProcessRunner;
  claude: ClaudeBridge;
  rag: RagClient;
  dbExplorer: DbExplorerService;
  agent: AgentOrchestratorService;
  memory: MemoryVizService;
  webmcp: WebMCPGatewayService;
  wsPort: number;
}

export interface ServiceContainerOptions {
  monorepoRoot: string;
  wsPort: number;
}

export function createServiceContainer(opts: ServiceContainerOptions): ServiceContainer {
  const runner = new ProcessRunner();
  const webmcp = new WebMCPGatewayService();
  const agent = new AgentOrchestratorService({ monorepoRoot: opts.monorepoRoot, runner, webmcpGateway: webmcp });
  const watcher = new MonorepoWatcher({ monorepoRoot: opts.monorepoRoot, debounceMs: 250 });
  const nxGraph = new NxGraphService({ monorepoRoot: opts.monorepoRoot });
  const nxAffected = new NxAffectedService({ monorepoRoot: opts.monorepoRoot });
  const health = new HealthProbe();
  const dbMetrics = new DbMetricsService();
  const backup = new BackupService();
  const claude = new ClaudeBridge({}, runner);
  const rag = new RagClient();
  const dbExplorer = new DbExplorerService({ allowedRoots: [opts.monorepoRoot, 'D:\\databases'] });
  const memory = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });

  return { watcher, nxGraph, nxAffected, health, dbMetrics, backup, runner, claude, rag, dbExplorer, agent, memory, webmcp, wsPort: opts.wsPort };
}

export async function disposeServiceContainer(c: ServiceContainer): Promise<void> {
  try { await c.watcher.stop(); } catch {}
  try { await c.rag.disconnect(); } catch {}
  try { c.webmcp.dispose(); } catch {}
  for (const p of c.runner.list()) {
    if (p.status === 'running') c.runner.kill(p.id);
  }
}
