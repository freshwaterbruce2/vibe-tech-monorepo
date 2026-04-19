import { ipcMain } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { IPC_CHANNELS } from '../../shared/types';
import type {
  IpcResult, NxGraph, ProbeResult, DbMetric,
  BackupRequest, BackupResult, BackupLogEntry,
  ProcessHandle, ClaudeInvocation, ClaudeInvocationResult,
  RagSearchQuery, RagSearchResult, ServiceName, FsStatResult
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
}

export function unregisterIpcHandlers(): void {
  for (const ch of Object.values(IPC_CHANNELS)) ipcMain.removeHandler(ch);
}
