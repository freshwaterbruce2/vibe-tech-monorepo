import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SelfHealingTelemetry, SelfHealingReport, ProcessHandle } from '../../shared/types';
import type { ProcessRunner } from './process-runner';
import yaml from 'yaml';

export class SelfHealingService {
  private logPath = 'D:\\logs\\self-healing';
  private configPath = 'C:\\dev\\.woodpecker\\self-healing-config.yml';
  private policyPath = 'C:\\dev\\.nx\\SELF_HEALING.md';

  constructor(
    private readonly opts: { monorepoRoot: string },
    private readonly runner: ProcessRunner
  ) {
    this.configPath = join(this.opts.monorepoRoot, '.woodpecker', 'self-healing-config.yml');
    this.policyPath = join(this.opts.monorepoRoot, '.nx', 'SELF_HEALING.md');
    this.resolveLogPath();
  }

  private resolveLogPath(): void {
    try {
      if (existsSync(this.configPath)) {
        const raw = yaml.parse(readFileSync(this.configPath, 'utf8'));
        if (raw?.defaults?.log_path) {
          this.logPath = raw.defaults.log_path;
        }
      }
    } catch {
      // Fallback to default D:\logs\self-healing
    }
  }

  async getTelemetry(): Promise<SelfHealingTelemetry> {
    this.resolveLogPath();

    // Read policy
    let policy = '';
    if (existsSync(this.policyPath)) {
      policy = readFileSync(this.policyPath, 'utf8');
    }

    // Read config details
    let killSwitch = false;
    let dryRun = true;
    try {
      if (existsSync(this.configPath)) {
        const raw = yaml.parse(readFileSync(this.configPath, 'utf8'));
        killSwitch = raw?.safety?.kill_switch ?? false;
        dryRun = raw?.defaults?.dry_run ?? true;
      }
    } catch {
      // Keep defaults
    }

    // Read history from logPath
    const history: SelfHealingReport[] = [];
    try {
      if (existsSync(this.logPath)) {
        const files = readdirSync(this.logPath)
          .filter((f) => f.startsWith('report_') && f.endsWith('.json'))
          .sort()
          .reverse(); // Newest first

        // Read up to top 20 reports
        for (const file of files.slice(0, 20)) {
          try {
            const content = readFileSync(join(this.logPath, file), 'utf8');
            const parsed = JSON.parse(content);
            history.push({
              timestamp: parsed.timestamp || new Date().toISOString(),
              report_file: file,
              summary: parsed.summary || {
                overall_status: 'monitoring',
                total_issues_found: 0,
                total_issues_fixed: 0,
                total_issues_blocked: 0,
                total_duration_seconds: 0,
                loops_run: 0,
              },
              loops: parsed.loops || [],
            });
          } catch {
            // Ignore corrupted individual files
          }
        }
      }
    } catch {
      // Log path might not exist yet
    }

    return {
      policy,
      history,
      config: {
        killSwitch,
        dryRun,
        logPath: this.logPath,
      },
    };
  }

  async triggerRun(): Promise<ProcessHandle> {
    // Run the Python orchestrator with auto-apply mode
    return this.runner.spawn({
      command: 'python',
      args: ['-m', 'tools.self-healing.orchestrator', '--auto-apply'],
      cwd: this.opts.monorepoRoot,
    });
  }
}
