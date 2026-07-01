/**
 * Typed client for the maintenance-copilot gateway (server/mcp-adapter.ts).
 *
 * All calls use an ABSOLUTE base when running locally or under Tauri, because
 * the Tauri webview origin (tauri://localhost) and the Vite dev origin differ
 * from the gateway on :8675. The interfaces mirror the adapter's payloads so
 * the UI is a pure consumer.
 */
const DEFAULT_GATEWAY = 'http://localhost:8675';

/** Gateway base URL: VITE_GATEWAY_URL override, else :8675 for local/Tauri, else same-origin. */
export function apiBaseUrl(): string {
  const override = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  if (override) return override;
  const { hostname, protocol } = window.location;
  const local =
    protocol === 'tauri:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'tauri.localhost';
  return local ? DEFAULT_GATEWAY : '';
}

export interface DashboardPackage {
  name: string;
  path: string;
  type: 'app' | 'package';
  dependenciesCount: number;
  devDependenciesCount: number;
  status: 'stable' | 'drifted';
}
export interface DriftReport {
  dependencyName: string;
  versions: { version: string; packages: string[] }[];
}
export interface WorkspaceHealth {
  packages: DashboardPackage[];
  drifts: DriftReport[];
}
export interface DashboardDatabase {
  name: string;
  path: string;
  size: string;
  walStatus: 'Enabled' | 'Disabled';
  status: 'OK' | 'SQLITE_BUSY' | 'INTEGRITY_ERROR';
  hasLock: boolean;
}
export interface DatabaseHealth {
  databases: DashboardDatabase[];
}
export interface LearningSystem {
  status: string;
  staleFileCount: number;
  insightsCount: number;
  crashed: boolean;
  reason?: string;
}
export interface DDriveHealth {
  totalSize: string;
  freeSpace: string;
  learningSystem: LearningSystem;
}
export interface Telemetry {
  mismatchedDeps: number;
  activeLockfiles: number;
  hasOOM: boolean;
  healthScore: number;
}
export interface ActionResult {
  success: boolean;
  dryRun: boolean;
  script?: string;
  message?: string;
  error?: string;
}
/** Opt-in deep-clean steps for the maintenance pipeline (baseline = all false). */
export interface MaintenanceOptions {
  dryRun: boolean;
  retention?: boolean;
  vacuum?: boolean;
  backup?: boolean;
}
export interface DiagnoseResult {
  active: boolean;
  notice: string;
}
export interface GitReport {
  branch: string;
  isDirty: boolean;
  recentCommits: { hash: string; message: string }[];
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // Action routes return a {success} envelope even on 4xx/5xx; let callers branch on it.
  return (await res.json()) as T;
}

export const api = {
  workspaceHealth: async () => getJSON<WorkspaceHealth>('/api/mcp/get_workspace_health'),
  databaseHealth: async () => getJSON<DatabaseHealth>('/api/mcp/get_database_health'),
  dDriveHealth: async () => getJSON<DDriveHealth>('/api/mcp/get_d_drive_health'),
  gitStatus: async () => getJSON<GitReport>('/api/mcp/get_git_status'),
  telemetry: async () => getJSON<Telemetry>('/api/telemetry'),
  runMaintenance: async (opts: MaintenanceOptions) =>
    postJSON<ActionResult>('/api/mcp/run_workspace_maintenance', opts),
  runCleanup: async (dryRun: boolean) =>
    postJSON<ActionResult>('/api/mcp/run_workspace_cleanup', { dryRun }),
  diagnose: async () => postJSON<DiagnoseResult>('/api/diagnose', {}),
};
