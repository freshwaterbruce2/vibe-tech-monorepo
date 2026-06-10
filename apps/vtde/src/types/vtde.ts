export type AppType = 'web' | 'native';

export interface VibeAppManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  status: string;
  launch_cmd: string;
  features: string[];
  port: number | null;
  app_type: AppType;
}

export interface LaunchResult {
  url: string;
  pid: number;
  app_type: AppType;
}

export interface WindowInfo {
  id: string;
  title: string;
  state: 'normal' | 'minimized' | 'maximized';
  isActive: boolean;
}

export interface SystemStats {
  cpu: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_percent: number;
}

export interface HealingResult {
  timestamp: string;
  error_type: string;
  project: string;
  confidence: number;
  approved: boolean;
  reason: string;
  fix_applied: string | null;
  verified: boolean;
}

export interface HealingCycle {
  timestamp: string;
  dry_run: boolean;
  elapsed_seconds: number;
  ralph_issues: number;
  drift_alerts: number;
  fixable_issues: number;
  fixes_attempted: number;
  fixes_verified: number;
  results: HealingResult[];
}

export interface HealingSummary {
  total_cycles: number;
  total_issues: number;
  total_fixes: number;
  total_verified: number;
  last_run: string | null;
  avg_elapsed: number;
}

export interface SelfHealingRunStatus {
  running: boolean;
  pid: number | null;
  mode: string | null;
  started_at_ms: number | null;
  last_exit_code: number | null;
}

export interface AppHealthInfo {
  id: string;
  has_dist: boolean;
  has_package_json: boolean;
  has_build_script: boolean;
  status: string;
}
