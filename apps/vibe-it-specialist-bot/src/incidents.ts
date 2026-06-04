import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LOG_DIR = 'D:/logs/vibe-it-specialist-bot';
const OPTIMIZATION_DIR = join(LOG_DIR, 'optimization');
const RUNS_FILE = join(LOG_DIR, 'runs.jsonl');
const SCHEDULER_INCIDENT_FILE = join(LOG_DIR, 'scheduler-incidents.jsonl');
const QUALITY_FILE = join(LOG_DIR, '.quality.json');

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

interface RunRecord {
  key?: string;
  label?: string;
  command?: string;
  exitCode?: number | null;
  timestamp?: string;
  logPath?: string;
  error?: string;
}

interface SchedulerRecord {
  timestamp?: string;
  event?: string;
  error?: string;
}

interface Finding {
  category: string;
  priority: string;
  message: string;
  details?: string;
}

interface OptimizationReport {
  timestamp: string;
  summary?: { P0Count?: number };
  findings?: Finding[];
}

function getRecentFailedTasks(): string[] {
  if (!existsSync(RUNS_FILE)) return ['None'];
  try {
    const content = readFileSync(RUNS_FILE, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const failures: RunRecord[] = [];

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as RunRecord;
        const failed = (record.exitCode !== undefined && record.exitCode !== 0 && record.exitCode !== null) || record.error;
        if (failed) {
          failures.push(record);
        }
      } catch {}
    }

    if (failures.length === 0) return ['[OK] No failed tasks registered'];
    
    // Sort descending by timestamp and take last 5
    failures.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());
    return failures.slice(0, 5).map(f => {
      const time = f.timestamp ? f.timestamp.replace('T', ' ').substring(0, 16) : 'unknown';
      return `• [${time}] *${f.label ?? f.command}* failed (Exit: ${f.exitCode ?? 'err'}). Log: \`${f.logPath}\``;
    });
  } catch {
    return ['Error reading runs history'];
  }
}

function getRecentFixerRuns(): string[] {
  if (!existsSync(RUNS_FILE)) return ['None'];
  try {
    const content = readFileSync(RUNS_FILE, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const fixers: RunRecord[] = [];

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as RunRecord;
        const isFixer = (record.key ?? '').startsWith('fix') || 
                        (record.label ?? '').toLowerCase().includes('fix') ||
                        (record.command ?? '').toLowerCase().includes('fix');
        if (isFixer) {
          fixers.push(record);
        }
      } catch {}
    }

    if (fixers.length === 0) return ['None'];
    
    fixers.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());
    return fixers.slice(0, 5).map(f => {
      const time = f.timestamp ? f.timestamp.replace('T', ' ').substring(0, 16) : 'unknown';
      const status = f.exitCode === 0 ? 'Success' : `Failed (Exit: ${f.exitCode ?? 'err'})`;
      return `• [${time}] *${f.label}* -> ${status}. Log: \`${f.logPath}\``;
    });
  } catch {
    return ['Error reading runs history'];
  }
}

function getP0FindingsLast7Days(): string[] {
  if (!existsSync(OPTIMIZATION_DIR)) return ['None'];
  try {
    const files = readdirSync(OPTIMIZATION_DIR)
      .filter(f => f.startsWith('optimization-report-') && f.endsWith('.json'))
      .sort();

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const p0Messages = new Set<string>();

    for (const file of files) {
      const filePath = join(OPTIMIZATION_DIR, file);
      const stat = statSync(filePath);
      if (stat.mtimeMs < sevenDaysAgo) continue;

      try {
        const content = JSON.parse(readFileSync(filePath, 'utf8')) as OptimizationReport;
        if (content.findings) {
          for (const f of content.findings) {
            if (f.priority === 'P0') {
              p0Messages.add(`• [${f.category}] ${f.message}`);
            }
          }
        }
      } catch {}
    }

    if (p0Messages.size === 0) return ['[OK] No P0 findings over the last 7 days'];
    return Array.from(p0Messages);
  } catch {
    return ['Error reading optimization reports'];
  }
}

function getSchedulerFailures(): string[] {
  if (!existsSync(SCHEDULER_INCIDENT_FILE)) return ['[OK] No scheduler failures'];
  try {
    const content = readFileSync(SCHEDULER_INCIDENT_FILE, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const failures: SchedulerRecord[] = [];

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as SchedulerRecord;
        failures.push(record);
      } catch {}
    }

    if (failures.length === 0) return ['[OK] No scheduler failures'];

    failures.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());
    return failures.slice(0, 5).map(f => {
      const time = f.timestamp ? f.timestamp.replace('T', ' ').substring(0, 16) : 'unknown';
      return `• [${time}] Event: *${f.event}* -> Error: ${f.error}`;
    });
  } catch {
    return ['Error reading scheduler incidents'];
  }
}

function getQualityStatus(): string {
  if (!existsSync(QUALITY_FILE)) return 'No quality checks run recently';
  try {
    const data = JSON.parse(readFileSync(QUALITY_FILE, 'utf8'));
    const time = data.timestamp ? data.timestamp.replace('T', ' ').substring(0, 16) : 'unknown';
    if (data.passed) {
      return `[OK] Passing (Last pass: ${time})`;
    } else {
      return `[FAIL] Failed at ${time}. Detail: ${data.details ?? 'unknown'}`;
    }
  } catch {
    return 'Error reading quality status';
  }
}

function runIncidentsReport(): string {
  const failedTasks = getRecentFailedTasks();
  const p0Findings = getP0FindingsLast7Days();
  const fixerRuns = getRecentFixerRuns();
  const schedulerFailures = getSchedulerFailures();
  const quality = getQualityStatus();

  let output = `=== Vibe IT Specialist Bot Incidents ===\n\n`;
  
  output += `*Quality Guardrail status:*\n${quality}\n\n`;

  output += `*P0 Findings (Last 7 Days):*\n`;
  output += p0Findings.join('\n') + `\n\n`;

  output += `*Recent Failed Tasks:*\n`;
  output += failedTasks.join('\n') + `\n\n`;

  output += `*Recent Fixer Runs:*\n`;
  output += fixerRuns.join('\n') + `\n\n`;

  output += `*Scheduler Delivery Failures:*\n`;
  output += schedulerFailures.join('\n');

  return output;
}

if (process.argv[1] && (process.argv[1].endsWith('incidents.ts') || process.argv[1].endsWith('incidents.js'))) {
  console.log(runIncidentsReport());
}
