import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LOG_DIR = 'D:/logs/vibe-it-specialist-bot/optimization';
const HISTORY_FILE = 'D:/logs/vibe-it-specialist-bot/runs.jsonl';
const TREND_REPORT_DIR = 'D:/logs/vibe-it-specialist-bot/trends';

interface SummaryStats {
  P0Count: number;
  P1Count: number;
  P2Count: number;
  P3Count: number;
  pathViolations: number;
  tsVersionDrifts: number;
  missingTargets: number;
}

interface RunRecord {
  label: string;
  command: string;
  durationMs: number;
  exitCode: number | null;
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

interface OptimizationReport {
  summary?: {
    P0Count?: number;
    P1Count?: number;
    P2Count?: number;
    P3Count?: number;
  };
  findings?: {
    category: string;
    priority: string;
    message: string;
    details?: string;
  }[];
}

function calculateHealthScore(P0: number, P1: number, P2: number, P3: number): number {
  const deduction = (P0 * 10) + (P1 * 3) + (P2 * 1) + (P3 * 0.2);
  return Math.max(0, Math.round(100 - deduction));
}

function extractStats(report: OptimizationReport): SummaryStats {
  const summary = report.summary ?? {};
  const findings = report.findings ?? [];
  
  // Calculate path violations: hygiene findings with "C:\" in details or message
  const pathViolations = findings
    .filter((f) => f.category === 'hygiene' && (f.message.includes('C:\\dev') || (f.details?.includes('C:\\') ?? false)))
    .reduce((acc: number, f) => {
      const match = f.message.match(/(\d+) database|(\d+) runtime log/);
      if (match) {
        return acc + parseInt(match[1] ?? match[2] ?? '1', 10);
      }
      return acc + 1;
    }, 0);

  // TS Drift findings
  const tsVersionDrifts = findings.filter((f) => f.category === 'deps' && f.message.includes('typescript')).length;

  // Missing target findings
  const missingTargets = findings.filter((f) => f.category === 'targets').length;

  return {
    P0Count: summary.P0Count ?? 0,
    P1Count: summary.P1Count ?? 0,
    P2Count: summary.P2Count ?? 0,
    P3Count: summary.P3Count ?? 0,
    pathViolations,
    tsVersionDrifts,
    missingTargets,
  };
}

export function analyzeTrends(categoryFilter = 'all'): string {
  if (!existsSync(LOG_DIR)) {
    return `ℹ️ *No optimization history found.* Run \`/it optimize\` first to generate a report.`;
  }

  // Find all JSON reports and isolate by category filter to prevent comparison mismatches
  const targetFilter = categoryFilter ?? 'all';
  let files: string[] = [];
  try {
    const allFiles = readdirSync(LOG_DIR).filter(f => f.startsWith('optimization-report-') && f.endsWith('.json'));
    const matchedFiles: { path: string; filter: string; timestamp: string }[] = [];
    
    for (const f of allFiles) {
      try {
        const content = JSON.parse(readFileSync(join(LOG_DIR, f), 'utf8')) as OptimizationReport;
        matchedFiles.push({
          path: f,
          filter: (content.summary ? (content as { filter?: string }).filter : undefined) ?? 'all',
          timestamp: (content.summary ? (content as { timestamp?: string }).timestamp : undefined) ?? new Date().toISOString(),
        });
      } catch {}
    }

    // Sort chronologically
    matchedFiles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Filter matching scope
    files = matchedFiles
      .filter(f => f.filter === targetFilter)
      .map(f => f.path);
  } catch (err) {
    return `❌ *Failed to read optimization reports directory*: ${err instanceof Error ? err.message : String(err)}`;
  }

  if (files.length === 0) {
    return `ℹ️ *No optimization history found for category "${targetFilter}".* Run \`/it optimize ${targetFilter === 'all' ? '' : targetFilter}\` first.`;
  }

  const latestFile = files[files.length - 1];
  if (!latestFile) {
    return `ℹ️ *No optimization history found.*`;
  }
  let latestReport: OptimizationReport;
  try {
    latestReport = JSON.parse(readFileSync(join(LOG_DIR, latestFile), 'utf8')) as OptimizationReport;
  } catch (err) {
    return `❌ *Failed to parse latest report* \`${latestFile}\`: ${err instanceof Error ? err.message : String(err)}`;
  }

  const latestStats = extractStats(latestReport);
  const latestScore = calculateHealthScore(latestStats.P0Count, latestStats.P1Count, latestStats.P2Count, latestStats.P3Count);

  let trendOutput = `📈 *VibeTech Monorepo Health Trend (${targetFilter.toUpperCase()})* 📈\n\n`;

  if (files.length > 1) {
    const prevFile = files[files.length - 2];
    let prevReport: OptimizationReport | undefined = undefined;
    if (prevFile) {
      try {
        prevReport = JSON.parse(readFileSync(join(LOG_DIR, prevFile), 'utf8')) as OptimizationReport;
      } catch {}
    }

    if (prevReport) {
      const prevStats = extractStats(prevReport);
      const prevScore = calculateHealthScore(prevStats.P0Count, prevStats.P1Count, prevStats.P2Count, prevStats.P3Count);
      const scoreDiff = latestScore - prevScore;
      const diffSign = scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`;
      const diffStatus = scoreDiff > 0 ? ' (Improved)' : scoreDiff < 0 ? ' (Regressed)' : ' (Unchanged)';

      trendOutput += `• *Health Score*: ${latestScore}/100\n`;
      trendOutput += `• *Previous Score*: ${prevScore}/100\n`;
      trendOutput += `• *Trend*: ${diffSign}${diffStatus}\n\n`;

      trendOutput += `*Detailed Metrics History:*\n`;
      trendOutput += `• P0 (Critical): ${prevStats.P0Count} ➔ ${latestStats.P0Count}\n`;
      trendOutput += `• P1 (High): ${prevStats.P1Count} ➔ ${latestStats.P1Count}\n`;
      trendOutput += `• P2 (Medium): ${prevStats.P2Count} ➔ ${latestStats.P2Count}\n`;
      trendOutput += `• Path Violations: ${prevStats.pathViolations} ➔ ${latestStats.pathViolations}\n`;
      trendOutput += `• TS Drift Count: ${prevStats.tsVersionDrifts} ➔ ${latestStats.tsVersionDrifts}\n`;
      trendOutput += `• Missing targets: ${prevStats.missingTargets} ➔ ${latestStats.missingTargets}\n\n`;

      // Compare individual findings to identify fixed and regressions
      const latestFindings = latestReport.findings ?? [];
      const prevFindings = prevReport.findings ?? [];

      const latestMessages = new Set(latestFindings.map((f) => f.message));
      const prevMessages = new Set(prevFindings.map((f) => f.message));

      const fixed = prevFindings.filter((f) => !latestMessages.has(f.message));
      const regressed = latestFindings.filter((f) => !prevMessages.has(f.message));

      if (fixed.length > 0) {
        trendOutput += `*Fixed Issues:*\n`;
        fixed.slice(0, 5).forEach((f) => {
          trendOutput += `• [${f.category}] \`${f.message}\`\n`;
        });
        if (fixed.length > 5) trendOutput += `• ...and ${fixed.length - 5} more fixed.\n`;
        trendOutput += `\n`;
      }

      if (regressed.length > 0) {
        trendOutput += `*Regressions (New Issues):*\n`;
        regressed.slice(0, 5).forEach((f) => {
          trendOutput += `• ⚠️ [${f.category}] \`${f.message}\`\n`;
        });
        if (regressed.length > 5) trendOutput += `• ...and ${regressed.length - 5} more regressions.\n`;
        trendOutput += `\n`;
      } else {
        trendOutput += `🎉 *No new regressions introduced!*\n\n`;
      }
    }
  } else {
    trendOutput += `• *Health Score*: ${latestScore}/100 (First logged audit)\n\n`;
    trendOutput += `*Detailed Metrics:*\n`;
    trendOutput += `• P0 (Critical): ${latestStats.P0Count}\n`;
    trendOutput += `• P1 (High): ${latestStats.P1Count}\n`;
    trendOutput += `• P2 (Medium): ${latestStats.P2Count}\n`;
    trendOutput += `• Path Violations: ${latestStats.pathViolations}\n`;
    trendOutput += `• TS Drift Count: ${latestStats.tsVersionDrifts}\n`;
    trendOutput += `• Missing targets: ${latestStats.missingTargets}\n\n`;
  }

  // Parse runs history to find slowest repeated tasks
  if (existsSync(HISTORY_FILE)) {
    try {
      const logContent = readFileSync(HISTORY_FILE, 'utf8');
      const lines = logContent.split('\n').filter(Boolean);
      const runs: RunRecord[] = [];

      for (const line of lines) {
        try {
          runs.push(JSON.parse(line));
        } catch {}
      }

      // Group runs by label/command to find repeated ones and calculate avg durations
      const taskGroups = new Map<string, { label: string; count: number; totalMs: number; maxMs: number }>();
      
      for (const run of runs) {
        const key = run.label ?? run.command;
        if (!taskGroups.has(key)) {
          taskGroups.set(key, { label: run.label, count: 0, totalMs: 0, maxMs: 0 });
        }
        const group = taskGroups.get(key);
        if (group) {
          group.count += 1;
          group.totalMs += run.durationMs;
          if (run.durationMs > group.maxMs) {
            group.maxMs = run.durationMs;
          }
        }
      }

      const sortedGroups = Array.from(taskGroups.values())
        .map(g => ({
          label: g.label,
          count: g.count,
          avgSeconds: Math.round(g.totalMs / g.count / 1000),
          maxSeconds: Math.round(g.maxMs / 1000),
        }))
        .sort((a, b) => b.avgSeconds - a.avgSeconds)
        .slice(0, 5);

      if (sortedGroups.length > 0) {
        trendOutput += `*Slowest Executed Tasks (Avg duration):*\n`;
        sortedGroups.forEach((g, idx) => {
          trendOutput += `${idx + 1}. \`${g.label}\` (Avg: ${g.avgSeconds}s, Count: ${g.count})\n`;
        });
      }
    } catch (err) {
      trendOutput += `\n⚠️ *Could not read task execution history*: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // Write trend report markdown to trends folder
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const trendReportPath = join(TREND_REPORT_DIR, `trend-report-${stamp}.md`);
  const latestTrendPath = join(TREND_REPORT_DIR, 'latest.md');
  
  try {
    mkdirSync(TREND_REPORT_DIR, { recursive: true });
    writeFileSync(trendReportPath, trendOutput, 'utf8');
    writeFileSync(latestTrendPath, trendOutput, 'utf8');
  } catch {}

  trendOutput += `\n\n📄 *Trend Report*: ${trendReportPath}`;
  return trendOutput;
}

// Check if running directly as CLI script
if (process.argv[1] && (process.argv[1].endsWith('trends.ts') || process.argv[1].endsWith('trends.js'))) {
  const filter = process.argv[2] === 'undefined' || !process.argv[2] ? 'all' : process.argv[2];
  const summary = analyzeTrends(filter);
  console.log(summary);
}
