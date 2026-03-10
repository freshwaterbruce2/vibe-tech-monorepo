/**
 * Tauri API bridge — replaces Electron's window.vtde IPC.
 * All calls go through @tauri-apps/api invoke().
 * Falls back to safe defaults when running outside Tauri (e.g. browser dev).
 */
import type {
  AppHealthInfo,
  HealingCycle,
  HealingSummary,
  LaunchResult,
  SelfHealingRunStatus,
  SystemStats,
  VibeAppManifest,
} from '../types/vtde';

function isBrowserLikeRuntime(): boolean {
  if (typeof window === 'undefined') return true;
  const protocol = window.location?.protocol;
  return protocol === 'http:' || protocol === 'https:' || protocol === 'about:';
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(cmd, args);
  } catch (error) {
    if (isBrowserLikeRuntime()) {
      return null;
    }
    throw error;
  }
}

export async function getApps(): Promise<VibeAppManifest[]> {
  return (await tauriInvoke<VibeAppManifest[]>('get_apps')) ?? [];
}

export async function launchApp(appId: string): Promise<LaunchResult> {
  const tauriResult = await tauriInvoke<LaunchResult>('launch_app', { appId });
  if (tauriResult) return tauriResult;

  throw new Error(`Failed to launch app: ${appId} (Not running in Tauri context)`);
}

export async function stopApp(pid: number): Promise<string> {
  return (await tauriInvoke<string>('stop_app', { pid })) ?? 'Not in Tauri';
}

export async function getSystemStats(): Promise<SystemStats> {
  return (
    (await tauriInvoke<SystemStats>('get_system_stats')) ?? {
      cpu: 0,
      ram_used_gb: 0,
      ram_total_gb: 0,
      ram_percent: 0,
      disk_used_gb: 0,
      disk_total_gb: 0,
      disk_percent: 0,
    }
  );
}

export async function getHealingLogs(): Promise<HealingCycle[]> {
  return (await tauriInvoke<HealingCycle[]>('get_healing_logs')) ?? [];
}

export async function getHealingSummary(): Promise<HealingSummary> {
  return (
    (await tauriInvoke<HealingSummary>('get_healing_summary')) ?? {
      total_cycles: 0,
      total_issues: 0,
      total_fixes: 0,
      total_verified: 0,
      last_run: null,
      avg_elapsed: 0,
    }
  );
}

const EMPTY_HEALING_RUN_STATUS: SelfHealingRunStatus = {
  running: false,
  pid: null,
  mode: null,
  started_at_ms: null,
  last_exit_code: null,
};

export async function getSelfHealingRunStatus(): Promise<SelfHealingRunStatus> {
  return (
    (await tauriInvoke<SelfHealingRunStatus>('get_self_healing_run_status')) ??
    EMPTY_HEALING_RUN_STATUS
  );
}

export async function startSelfHealingRun(options?: {
  dryRun?: boolean;
  skipNotify?: boolean;
  loopName?: string;
}): Promise<SelfHealingRunStatus> {
  const dryRun = options?.dryRun ?? true;
  const skipNotify = options?.skipNotify ?? true;
  const loopName = options?.loopName ?? null;

  const status = await tauriInvoke<SelfHealingRunStatus>('start_self_healing_run', {
    dryRun,
    skipNotify,
    loopName,
  });

  if (!status) {
    throw new Error('Self-healing runs are available only in the VTDE desktop runtime.');
  }

  return status;
}

export async function checkAppHealth(appId: string): Promise<AppHealthInfo | null> {
  return await tauriInvoke<AppHealthInfo>('check_app_health', { appId });
}
