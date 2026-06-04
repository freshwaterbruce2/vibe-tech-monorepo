import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const LOG_DIR = 'D:/logs/vibe-it-specialist-bot';
const QUALITY_FILE = join(LOG_DIR, '.quality.json');
const STATUS_FILE = join(LOG_DIR, '.status.json');

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
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

function getLatestCommit(): string {
  try {
    const gitCmd = process.platform === 'win32' ? 'git.exe' : 'git';
    const res = spawnSync(gitCmd, ['log', '-n', '1', '--format=%h - %s (%an, %ar)', '--', 'apps/vibe-it-specialist-bot'], { encoding: 'utf8' });
    return (res.stdout || '').trim() || 'No commit found';
  } catch {
    return 'Git command failed';
  }
}

function getWorkingTreeStatus(): string {
  try {
    const gitCmd = process.platform === 'win32' ? 'git.exe' : 'git';
    const res = spawnSync(gitCmd, ['status', '--porcelain', '--', 'apps/vibe-it-specialist-bot'], { encoding: 'utf8' });
    const output = (res.stdout || '').trim();
    if (!output) {
      return 'Clean';
    }
    const lines = output.split('\n').filter(Boolean);
    return `${lines.length} uncommitted file(s) modified`;
  } catch {
    return 'Git command failed';
  }
}

function runCiStatus(): string {
  // 1. Latest Bot Quality Check Result
  let qualityResult = 'No quality checks run recently';
  if (existsSync(QUALITY_FILE)) {
    try {
      const data = JSON.parse(readFileSync(QUALITY_FILE, 'utf8'));
      if (data.passed) {
        const time = data.timestamp ? data.timestamp.replace('T', ' ').substring(0, 16) : 'unknown';
        qualityResult = `Passed (${time})`;
      } else {
        qualityResult = 'Failed';
      }
    } catch {}
  }

  // 2. Latest git commit
  const latestCommit = getLatestCommit();

  // 3. Working tree status
  const workingTree = getWorkingTreeStatus();

  // 4. Production bot details (PID and uptime)
  let pid = process.ppid;
  let startedAt = Date.now();
  let statusAvailable = false;

  if (existsSync(STATUS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
      pid = data.pid ?? pid;
      startedAt = data.startedAt ?? startedAt;
      statusAvailable = true;
    } catch {}
  }

  const uptimeMs = Date.now() - startedAt;
  const uptimeStr = formatUptime(uptimeMs);

  let output = `=== Vibe IT Specialist Bot CI/CD Status ===\n\n`;
  output += `• *Quality check*: ${qualityResult}\n`;
  output += `• *Latest bot commit*: ${latestCommit}\n`;
  output += `• *Working tree status*: ${workingTree}\n`;
  output += `• *Production PID*: ${statusAvailable ? pid : 'N/A'}\n`;
  output += `• *Production Uptime*: ${statusAvailable ? uptimeStr : 'N/A'}`;

  return output;
}

if (process.argv[1] && (process.argv[1].endsWith('ci.ts') || process.argv[1].endsWith('ci.js'))) {
  console.log(runCiStatus());
}
