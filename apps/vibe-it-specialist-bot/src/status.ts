import { readdirSync, readFileSync, statSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const LOG_DIR = 'D:/logs/vibe-it-specialist-bot';
const OPTIMIZATION_DIR = join(LOG_DIR, 'optimization');
const STATUS_FILE = join(LOG_DIR, '.status.json');
const HISTORY_FILE = join(LOG_DIR, 'runs.jsonl');

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function calculateHealthScore(P0: number, P1: number, P2: number, P3: number): number {
  const deduction = (P0 * 10) + (P1 * 3) + (P2 * 1) + (P3 * 0.2);
  return Math.max(0, Math.round(100 - deduction));
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const h = hours > 0 ? `${hours}h ` : '';
  const m = (minutes % 60) > 0 ? `${minutes % 60}m ` : '';
  const s = `${seconds % 60}s`;
  return `${h}${m}${s}`.trim();
}

function getNxDaemonStatus(): string {
  try {
    const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const res = spawnSync(cmd, ['exec', 'nx', 'daemon'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const output = res.stdout || '';
    if (output.toLowerCase().includes('running') || output.toLowerCase().includes('active') || output.toLowerCase().includes('started')) {
      return 'Available';
    }
    return 'Available (Inactive)';
  } catch {
    return 'Unavailable';
  }
}

function runStatus(): string {
  let pid = process.ppid; // Fallback to parent PID
  let startedAt = Date.now();
  let pendingCount = 0;

  // Read status file written by bot process
  if (existsSync(STATUS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
      pid = data.pid ?? pid;
      startedAt = data.startedAt ?? startedAt;
      pendingCount = data.pendingCount ?? 0;
    } catch {}
  }

  const uptimeMs = Date.now() - startedAt;
  const uptimeStr = formatUptime(uptimeMs);

  // Check if D: logs are writable
  let logsWritable = 'No';
  const testWriteFile = join(LOG_DIR, '.write-test');
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(testWriteFile, 'test', 'utf8');
    unlinkSync(testWriteFile);
    logsWritable = 'Yes';
  } catch {}

  // Get Nx Daemon status
  const nxDaemon = getNxDaemonStatus();

  // Find last optimize run details
  let lastOptimize = 'None';
  let lastTrendScore = 'N/A';
  if (existsSync(OPTIMIZATION_DIR)) {
    try {
      const files = readdirSync(OPTIMIZATION_DIR)
        .filter(f => f.startsWith('optimization-report-') && f.endsWith('.json'))
        .sort();
      
      if (files.length > 0) {
        const latestFile = files[files.length - 1];
        if (latestFile) {
          const dateMatch = latestFile.match(/report-(.*?)\.json$/);
          if (dateMatch?.[1]) {
            // Format timestamp nicely
            lastOptimize = dateMatch[1].replace('T', ' ').substring(0, 16);
          }
        }

        // Find the latest full score
        const fullReports = files.filter(f => {
          try {
            const content = JSON.parse(readFileSync(join(OPTIMIZATION_DIR, f), 'utf8'));
            return content.filter === 'all';
          } catch {
            return false;
          }
        });

        if (fullReports.length > 0) {
          const latestFullFile = fullReports[fullReports.length - 1];
          if (latestFullFile) {
            const latestFull = JSON.parse(readFileSync(join(OPTIMIZATION_DIR, latestFullFile), 'utf8'));
            const summary = latestFull.summary ?? {};
            const score = calculateHealthScore(
              summary.P0Count ?? 0,
              summary.P1Count ?? 0,
              summary.P2Count ?? 0,
              summary.P3Count ?? 0
            );
            lastTrendScore = `${score}/100`;
          }
        }
      }
    } catch {}
  }

  // Find last fixer run
  let lastFixer = 'None';
  if (existsSync(HISTORY_FILE)) {
    try {
      const content = readFileSync(HISTORY_FILE, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line) continue;
        try {
          const record = JSON.parse(line) as { requiresConfirmation?: boolean; key?: string; label?: string; timestamp?: string };
          const isFix = record.requiresConfirmation === true || 
                       (record.key ?? '').startsWith('fix') || 
                       (record.label ?? '').toLowerCase().includes('fix');
          if (isFix) {
            const timestamp = record.timestamp ?? '';
            const time = timestamp.replace('T', ' ').substring(0, 16);
            lastFixer = `${record.label ?? 'Unknown'} (${time})`;
            break;
          }
        } catch {}
      }
    } catch {}
  }

  let output = `=== Vibe IT Specialist Bot Status ===\n\n`;
  output += `• *Status*: Online\n`;
  output += `• *Uptime*: ${uptimeStr}\n`;
  output += `• *PID*: ${pid}\n`;
  output += `• *Nx daemon*: ${nxDaemon}\n`;
  output += `• *D: logs writable*: ${logsWritable}\n`;
  output += `• *Last optimize*: ${lastOptimize}\n`;
  output += `• *Last trend score*: ${lastTrendScore}\n`;
  output += `• *Last fixer*: ${lastFixer}\n`;
  output += `• *Pending confirmations*: ${pendingCount}\n`;
  output += `• *Reports*: \`${OPTIMIZATION_DIR.replaceAll('\\', '/')}\``;

  return output;
}

// Check if running directly as CLI script
if (process.argv[1] && (process.argv[1].endsWith('status.ts') || process.argv[1].endsWith('status.js'))) {
  console.log(runStatus());
}
