import { ipcMain } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { IPC_CHANNELS } from '../../shared/types';
import type {
  IpcResult, NxGraph, ProbeResult, DbMetric,
  BackupRequest, BackupResult, BackupLogEntry,
  ProcessHandle, ProcessChunk, ClaudeInvocation, ClaudeInvocationResult,
  RagSearchQuery, RagSearchResult, ServiceName, FsStatResult,
  AffectedGraph, DbExplorerDatabase, DbTableSchema, DbExplorerResult,
  McpServerStatus, AgentTaskLauncher, AgentTaskSpec, LogSearchFilters,
  MemoryVizSnapshot, MemorySearchResult, MemoryDecayView
} from '../../shared/types';
import type { ServiceContainer } from '../service-container';

const ok = <T>(data: T): IpcResult<T> => ({ ok: true, data, timestamp: Date.now() });
const err = (e: unknown, code?: string): IpcResult<never> => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
  code,
  timestamp: Date.now()
});

export function registerIpcHandlers(c: ServiceContainer): void {
  ipcMain.handle(IPC_CHANNELS.NX_GET, async (_evt, force?: boolean): Promise<IpcResult<NxGraph>> => {
    try { return ok(await c.nxGraph.getGraph(force === true)); }
    catch (e) { return err(e, 'NX_GET_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.NX_REFRESH, async (): Promise<IpcResult<NxGraph>> => {
    try { return ok(await c.nxGraph.getGraph(true)); }
    catch (e) { return err(e, 'NX_REFRESH_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.AFFECTED_GET, async (_evt, force?: boolean): Promise<IpcResult<AffectedGraph>> => {
    try { return ok(await c.nxAffected.getAffected(force === true)); }
    catch (e) { return err(e, 'AFFECTED_GET_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.AFFECTED_REFRESH, async (): Promise<IpcResult<AffectedGraph>> => {
    try { return ok(await c.nxAffected.refresh()); }
    catch (e) { return err(e, 'AFFECTED_REFRESH_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.HEALTH_PROBE_ALL, async (): Promise<IpcResult<ProbeResult[]>> => {
    try { return ok(await c.health.probeAll()); }
    catch (e) { return err(e, 'HEALTH_PROBE_ALL_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.HEALTH_PROBE_ONE, async (_evt, service: ServiceName): Promise<IpcResult<ProbeResult>> => {
    try { return ok(await c.health.probe(service)); }
    catch (e) { return err(e, 'HEALTH_PROBE_ONE_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.DB_COLLECT_ALL, async (): Promise<IpcResult<DbMetric[]>> => {
    try { return ok(await c.dbMetrics.collectAll()); }
    catch (e) { return err(e, 'DB_COLLECT_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async (_evt, req: BackupRequest): Promise<IpcResult<BackupResult>> => {
    try {
      if (!req || typeof req.sourcePath !== 'string') throw new Error('invalid backup request');
      return ok(await c.backup.createBackup(req));
    } catch (e) { return err(e, 'BACKUP_CREATE_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, async (_evt, limit?: number): Promise<IpcResult<BackupLogEntry[]>> => {
    try { return ok(c.backup.listRecent(limit ?? 20)); }
    catch (e) { return err(e, 'BACKUP_LIST_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.PROCESS_SPAWN, async (
    _evt, spec: { command: string; args: string[]; cwd: string; timeoutMs?: number }
  ): Promise<IpcResult<ProcessHandle>> => {
    try {
      if (!spec || typeof spec.command !== 'string' || !Array.isArray(spec.args)) {
        throw new Error('invalid process spec');
      }
      return ok(c.runner.spawn({ ...spec, args: spec.args }));
    } catch (e) { return err(e, 'PROCESS_SPAWN_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.PROCESS_KILL, async (_evt, id: string): Promise<IpcResult<boolean>> => {
    try { return ok(c.runner.kill(id)); }
    catch (e) { return err(e, 'PROCESS_KILL_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.PROCESS_LIST, async (): Promise<IpcResult<ProcessHandle[]>> => {
    try { return ok(c.runner.list()); }
    catch (e) { return err(e, 'PROCESS_LIST_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_INVOKE, async (_evt, inv: ClaudeInvocation): Promise<IpcResult<ClaudeInvocationResult>> => {
    try {
      if (!inv || typeof inv.prompt !== 'string' || typeof inv.cwd !== 'string') {
        throw new Error('invalid claude invocation');
      }
      return ok(await c.claude.invoke(inv));
    } catch (e) { return err(e, 'CLAUDE_INVOKE_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.RAG_SEARCH, async (_evt, query: RagSearchQuery): Promise<IpcResult<RagSearchResult>> => {
    try {
      if (!query || typeof query.query !== 'string') throw new Error('invalid rag query');
      return ok(await c.rag.search(query));
    } catch (e) { return err(e, 'RAG_SEARCH_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.FS_STAT, async (_evt, path: string): Promise<IpcResult<FsStatResult>> => {
    try {
      if (typeof path !== 'string' || path.length === 0) throw new Error('invalid path');
      if (!existsSync(path)) {
        return ok({ path, exists: false, isDirectory: false, isFile: false, sizeBytes: 0, mtimeMs: null });
      }
      const s = statSync(path);
      return ok({
        path,
        exists: true,
        isDirectory: s.isDirectory(),
        isFile: s.isFile(),
        sizeBytes: s.size,
        mtimeMs: s.mtimeMs
      });
    } catch (e) { return err(e, 'FS_STAT_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.META_INFO, async (): Promise<IpcResult<{ version: string; monorepoRoot: string; wsPort: number }>> => {
    try {
      return ok({ version: '0.1.0', monorepoRoot: 'C:\\dev', wsPort: c.wsPort });
    } catch (e) { return err(e, 'META_INFO_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.META_WS_PORT, async (): Promise<IpcResult<number>> => {
    try { return ok(c.wsPort); }
    catch (e) { return err(e, 'META_WS_PORT_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.DB_EXPLORER_LIST, async (): Promise<IpcResult<DbExplorerDatabase[]>> => {
    try { return ok(await c.dbExplorer.listDatabases()); }
    catch (e) { return err(e, 'DB_EXPLORER_LIST_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.DB_EXPLORER_SCHEMA, async (_evt, dbPath: string): Promise<IpcResult<DbTableSchema[]>> => {
    try {
      if (typeof dbPath !== 'string') throw new Error('invalid dbPath');
      return ok(await c.dbExplorer.getSchema(dbPath));
    } catch (e) { return err(e, 'DB_EXPLORER_SCHEMA_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.DB_EXPLORER_QUERY, async (_evt, dbPath: string, sql: string): Promise<IpcResult<DbExplorerResult>> => {
    try {
      if (typeof dbPath !== 'string' || typeof sql !== 'string') throw new Error('invalid query params');
      return ok(await c.dbExplorer.runQuery(dbPath, sql));
    } catch (e) { return err(e, 'DB_EXPLORER_QUERY_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_MCP_STATUS, async (): Promise<IpcResult<McpServerStatus[]>> => {
    try { return ok(await c.agent.probeMcpServers()); }
    catch (e) { return err(e, 'AGENT_MCP_STATUS_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.AGENT_TASK_RUN, async (_evt, spec: AgentTaskLauncher): Promise<IpcResult<ProcessHandle>> => {
    try {
      if (!spec || typeof spec.project !== 'string' || typeof spec.target !== 'string') {
        throw new Error('invalid task launcher spec');
      }
      return ok(await c.agent.runTask(spec));
    } catch (e) { return err(e, 'AGENT_TASK_RUN_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.AGENT_TASK_LIST, async (): Promise<IpcResult<AgentTaskSpec[]>> => {
    try { return ok(c.agent.listTasks()); }
    catch (e) { return err(e, 'AGENT_TASK_LIST_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.AGENT_LOG_SEARCH, async (_evt, filters: LogSearchFilters): Promise<IpcResult<ProcessChunk[]>> => {
    try { return ok(c.agent.searchLogs(filters)); }
    catch (e) { return err(e, 'AGENT_LOG_SEARCH_FAILED'); }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY_VIZ_SNAPSHOT, async (): Promise<IpcResult<MemoryVizSnapshot>> => {
    try { return ok(await c.memory.getSnapshot() as MemoryVizSnapshot); }
    catch (e) { return err(e, 'MEMORY_VIZ_SNAPSHOT_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.MEMORY_VIZ_SEARCH, async (_evt, query: string, topK?: number): Promise<IpcResult<MemorySearchResult[]>> => {
    try {
      if (typeof query !== 'string') throw new Error('invalid query');
      return ok(c.memory.search(query, typeof topK === 'number' ? topK : 10) as MemorySearchResult[]);
    } catch (e) { return err(e, 'MEMORY_VIZ_SEARCH_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.MEMORY_VIZ_DECAY, async (): Promise<IpcResult<MemoryDecayView[]>> => {
    try { return ok(c.memory.computeDecay() as MemoryDecayView[]); }
    catch (e) { return err(e, 'MEMORY_VIZ_DECAY_FAILED'); }
  });
  ipcMain.handle(IPC_CHANNELS.MEMORY_VIZ_CONSOLIDATE, async (): Promise<IpcResult<{ success: boolean; message: string }>> => {
    try { return ok(c.memory.triggerConsolidation()); }
    catch (e) { return err(e, 'MEMORY_VIZ_CONSOLIDATE_FAILED'); }
  });
}

export function unregisterIpcHandlers(): void {
  for (const ch of Object.values(IPC_CHANNELS)) ipcMain.removeHandler(ch);
}
