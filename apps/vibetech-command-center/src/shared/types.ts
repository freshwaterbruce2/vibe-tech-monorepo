// Shared contract types — consumed by main, preload, and renderer.

// ---------- monorepo-watcher ----------
export type FileEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface FileEvent {
  type: FileEventType;
  path: string;          // absolute Windows path
  appName: string | null; // derived from path, null if not inside apps/* or packages/*
  packageName: string | null;
  timestamp: number;      // epoch ms
  sizeBytes?: number;
}

// ---------- nx-graph ----------
export interface NxProject {
  name: string;
  type: 'app' | 'lib';
  root: string;           // relative to C:\dev
  sourceRoot?: string;
  tags: string[];
  implicitDependencies: string[];
}

export interface NxDependency {
  source: string;
  target: string;
  type: 'static' | 'dynamic' | 'implicit';
}

export interface NxGraph {
  projects: Record<string, NxProject>;
  dependencies: Record<string, NxDependency[]>;
  generatedAt: number;
}

// ---------- health-probe ----------
export type ServiceName =
  | 'frontend-vite'     // 5173
  | 'backend-express'   // 5177
  | 'dashboard-ui'      // 5180
  | 'openrouter-proxy'  // 3001
  | 'memory-mcp'        // 3200
  | 'dashboard-ipc';    // 3210

export interface ProbeResult {
  service: ServiceName;
  host: string;
  port: number;
  reachable: boolean;
  latencyMs: number | null;
  checkedAt: number;
  error?: string;
}

// ---------- db-metrics ----------
export interface DbMetric {
  name: string;
  path: string;
  sizeBytes: number;
  walSizeBytes: number;
  pageCount: number;
  pageSize: number;
  tables: Array<{ name: string; rowCount: number }>;
  journalMode: string;
  lastCheckedAt: number;
  error?: string;
}

// ---------- backup-service ----------
export interface BackupRequest {
  sourcePath: string;
  label?: string;
  destinationDir?: string;
}

export interface BackupResult {
  success: boolean;
  zipPath: string;
  sizeBytes: number;
  sourcePath: string;
  label: string | null;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  error?: string;
}

export interface BackupLogEntry {
  zipPath: string;
  sizeBytes: number;
  createdAt: number;
  label: string | null;
}

// ---------- process-runner ----------
export type ProcessStatus = 'running' | 'exited' | 'killed' | 'error';

export interface ProcessHandle {
  id: string;
  command: string;
  args: readonly string[];
  cwd: string;
  pid: number | null;
  status: ProcessStatus;
  startedAt: number;
  exitedAt?: number;
  exitCode: number | null;
}

export interface ProcessChunk {
  processId: string;
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

// ---------- claude-bridge ----------
export type ClaudeAllowedTool =
  | 'Read' | 'Write' | 'Edit' | 'Bash' | 'Glob' | 'Grep' | 'WebFetch' | 'WebSearch';

export interface ClaudeInvocation {
  invocationId?: string;     // client-generated correlation id; bridge uses it as-is or generates one
  prompt: string;
  cwd: string;
  allowedTools: ClaudeAllowedTool[];
  appendSystemPrompt?: string;
  resumeSessionId?: string;
  permissionMode?: 'bypassPermissions' | 'acceptEdits' | 'plan' | 'default';
  timeoutMs?: number;
}

export interface ClaudeStreamEvent {
  invocationId: string;
  type: 'system' | 'assistant' | 'user' | 'result' | 'error' | 'raw';
  subtype?: string;
  payload: unknown;
  timestamp: number;
}

export interface ClaudeInvocationResult {
  invocationId: string;
  sessionId: string | null;
  success: boolean;
  exitCode: number | null;
  resultText: string | null;
  durationMs: number;
  totalCostUsd: number | null;
  numTurns: number | null;
  error?: string;
}

// ---------- rag-client ----------
export interface RagSearchQuery {
  query: string;
  topK?: number;
  filter?: { app?: string; language?: string; };
}

export interface RagHit {
  score: number;
  path: string;
  language: string | null;
  snippet: string;
  startLine: number | null;
  endLine: number | null;
}

export interface RagSearchResult {
  query: string;
  hits: RagHit[];
  latencyMs: number;
  source: 'mcp-rag-server' | 'fallback' | 'unavailable';
  error?: string;
}

// ---------- fs-stat ----------
export interface FsStatResult {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  sizeBytes: number;
  mtimeMs: number | null;
}

// ---------- IPC contract ----------

export interface IpcResponse<T> {
  ok: true;
  data: T;
  timestamp: number;
}
export interface IpcErrorResponse {
  ok: false;
  error: string;
  code?: string;
  timestamp: number;
}
export type IpcResult<T> = IpcResponse<T> | IpcErrorResponse;

export const IPC_CHANNELS = {
  NX_GET: 'cc:nx:get',
  NX_REFRESH: 'cc:nx:refresh',
  HEALTH_PROBE_ALL: 'cc:health:probeAll',
  HEALTH_PROBE_ONE: 'cc:health:probeOne',
  DB_COLLECT_ALL: 'cc:db:collectAll',
  BACKUP_CREATE: 'cc:backup:create',
  BACKUP_LIST: 'cc:backup:list',
  PROCESS_SPAWN: 'cc:process:spawn',
  PROCESS_KILL: 'cc:process:kill',
  PROCESS_LIST: 'cc:process:list',
  CLAUDE_INVOKE: 'cc:claude:invoke',
  RAG_SEARCH: 'cc:rag:search',
  META_INFO: 'cc:meta:info',
  META_WS_PORT: 'cc:meta:wsPort',
  FS_STAT: 'cc:fs:stat'
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

export type StreamTopic =
  | 'cc.watcher.events'
  | 'cc.watcher.ready'
  | 'cc.watcher.error'
  | 'cc.claude.stream'
  | 'cc.process.chunk'
  | 'cc.process.exit';

export interface StreamMessage {
  topic: StreamTopic;
  payload: unknown;
  timestamp: number;
}

export interface CommandCenterAPI {
  version: string;

  nx: {
    get(force?: boolean): Promise<IpcResult<NxGraph>>;
    refresh(): Promise<IpcResult<NxGraph>>;
  };
  health: {
    probeAll(): Promise<IpcResult<ProbeResult[]>>;
    probeOne(service: ServiceName): Promise<IpcResult<ProbeResult>>;
  };
  db: {
    collectAll(): Promise<IpcResult<DbMetric[]>>;
  };
  backup: {
    create(req: BackupRequest): Promise<IpcResult<BackupResult>>;
    list(limit?: number): Promise<IpcResult<BackupLogEntry[]>>;
  };
  process: {
    spawn(spec: { command: string; args: string[]; cwd: string; timeoutMs?: number }): Promise<IpcResult<ProcessHandle>>;
    kill(id: string): Promise<IpcResult<boolean>>;
    list(): Promise<IpcResult<ProcessHandle[]>>;
  };
  claude: {
    invoke(inv: ClaudeInvocation): Promise<IpcResult<ClaudeInvocationResult>>;
  };
  rag: {
    search(query: RagSearchQuery): Promise<IpcResult<RagSearchResult>>;
  };
  fs: {
    stat(path: string): Promise<IpcResult<FsStatResult>>;
  };
  meta: {
    info(): Promise<IpcResult<{ version: string; monorepoRoot: string; wsPort: number }>>;
  };

  stream: {
    subscribe(topic: StreamTopic, handler: (payload: unknown) => void): () => void;
  };
}

declare global {
  interface Window {
    commandCenter: CommandCenterAPI;
  }
}
