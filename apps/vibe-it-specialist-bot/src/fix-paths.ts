import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';

const WORKSPACE_ROOT = 'C:/dev';
const MIGRATION_LOG_DIR = 'D:/logs/vibe-it-specialist-bot/optimization';
const TARGET_DB_DIR = 'D:/databases';
const TARGET_LOG_DIR = 'D:/logs';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.nx', 'dist', 'build', 'coverage', '_backups',
  '.agent', '.agents', '.claude', '.cursor', '.gemini', '.vscode',
  '.playwright-mcp', '.antigravitycli', '.kimi', '.serena', '.vercel',
  '_worktrees', 'target'
]);

interface MigrationItem {
  originalPath: string;
  targetPath: string;
  status: 'copied' | 'ignored' | 'error';
  error?: string;
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function runPathFix(): string {
  const items: MigrationItem[] = [];
  const gitIgnoreEntriesToAdd: string[] = [];

  const scanAndMigrate = (dir: string, depth = 0) => {
    if (depth > 8) return;
    let dirItems: string[] = [];
    try {
      dirItems = readdirSync(dir);
    } catch {
      return;
    }

    for (const item of dirItems) {
      if (IGNORED_DIRS.has(item)) continue;
      const fullPath = join(dir, item);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        scanAndMigrate(fullPath, depth + 1);
      } else {
        const ext = item.split('.').pop()?.toLowerCase();
        const normPath = fullPath.replaceAll('\\', '/');

        // Check path policy violations (dbs and logs on C:)
        if (ext === 'log' || ext === 'db' || ext === 'sqlite') {
          if (fullPath.startsWith('C:')) {
            // Filter exceptions
            if (!normPath.includes('.gemini') && !normPath.includes('.update_check') && !normPath.includes('auth.lock') && !normPath.includes('gateway.lock') && !normPath.includes('kanban.db.init.lock') && !normPath.includes('node_modules')) {
              
              let targetDir = TARGET_LOG_DIR;
              if (ext === 'db' || ext === 'sqlite') {
                targetDir = TARGET_DB_DIR;
              }

              const targetPath = join(targetDir, basename(fullPath)).replaceAll('\\', '/');

              try {
                mkdirSync(dirname(targetPath), { recursive: true });
                copyFileSync(fullPath, targetPath);
                items.push({ originalPath: normPath, targetPath, status: 'copied' });
                
                // Track relative path to add to gitignore
                const relPath = relative(WORKSPACE_ROOT, fullPath).replaceAll('\\', '/');
                gitIgnoreEntriesToAdd.push(relPath);

                // Copy SQLite sidecar files if they exist to keep databases functional
                if (ext === 'sqlite' || ext === 'db') {
                  for (const sidecarExt of ['-wal', '-shm']) {
                    const sidecarSrc = fullPath + sidecarExt;
                    if (existsSync(sidecarSrc)) {
                      const sidecarDest = targetPath + sidecarExt;
                      copyFileSync(sidecarSrc, sidecarDest);
                      gitIgnoreEntriesToAdd.push(relPath + sidecarExt);
                    }
                  }
                }
              } catch (err) {
                items.push({
                  originalPath: normPath,
                  targetPath,
                  status: 'error',
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }
        }
      }
    }
  };

  scanAndMigrate(WORKSPACE_ROOT);

  // Update .gitignore if entries to add
  let gitIgnoreUpdated = false;
  if (gitIgnoreEntriesToAdd.length > 0) {
    const gitIgnorePath = join(WORKSPACE_ROOT, '.gitignore');
    if (existsSync(gitIgnorePath)) {
      try {
        let content = readFileSync(gitIgnorePath, 'utf8');
        const lines = content.split(/\r?\n/);
        const toAppend: string[] = [];

        for (const entry of gitIgnoreEntriesToAdd) {
          if (!lines.some(l => l.trim() === entry || l.trim() === `/${entry}`)) {
            toAppend.push(entry);
          }
        }

        if (toAppend.length > 0) {
          content += '\n# Auto-added by Vibe IT Specialist Bot path-policy fixer\n' + toAppend.join('\n') + '\n';
          writeFileSync(gitIgnorePath, content, 'utf8');
          gitIgnoreUpdated = true;
        }
      } catch (err) {
        console.error('Failed to update .gitignore', err);
      }
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(MIGRATION_LOG_DIR, `path-migration-report-${stamp}.md`);

  // Generate recommendations based on migrated items
  let recommendationsMd = `## 💡 Recommended Configuration Changes\n\n`;
  const projectsSeen = new Set<string>();

  for (const item of items) {
    if (item.status !== 'copied') continue;
    const rel = relative(WORKSPACE_ROOT, item.originalPath).replaceAll('\\', '/');
    const parts = rel.split('/');
    
    if (parts[0] === 'apps' && parts[1]) {
      const appName = parts[1];
      if (!projectsSeen.has(appName)) {
        projectsSeen.add(appName);
        recommendationsMd += `### Project: \`${appName}\`\n`;
        if (appName === 'vibe-discharge') {
          recommendationsMd += `- **Required Update**: Update the SQLite connection path inside \`apps/vibe-discharge\` (check \`.env.local\`, configuration files, or database init scripts) to point to \`${TARGET_DB_DIR}/ship-check-<id>.sqlite\` instead of using a relative path on \`C:\`.\n`;
        } else {
          recommendationsMd += `- **Required Update**: Review database/log configurations in \`apps/${appName}\` to direct runtime outputs to the \`D:\\\` drive (e.g. \`D:/databases\` or \`D:/logs\`).\n`;
        }
      }
    } else if (parts[0] === 'packages' && parts[1]) {
      const pkgName = parts[1];
      if (!projectsSeen.has(pkgName)) {
        projectsSeen.add(pkgName);
        recommendationsMd += `### Package: \`${pkgName}\`\n`;
        recommendationsMd += `- **Required Update**: Check the code in \`packages/${pkgName}\` where files are read/written. Avoid hardcoding relative paths or C:-drive paths for logs/databases.\n`;
      }
    } else {
      const topDir = parts[0] ?? 'root';
      if (!projectsSeen.has(topDir)) {
        projectsSeen.add(topDir);
        recommendationsMd += `### Path: \`${topDir}\`\n`;
        recommendationsMd += `- **Required Update**: Found database or log file at \`${item.originalPath}\`. Please configure the writing application to use \`D:\\\` paths.\n`;
      }
    }
  }

  if (projectsSeen.size === 0) {
    recommendationsMd += `No active projects required path-policy migrations.\n`;
  }

  // Write Migration Markdown Report
  let md = `# Path Policy Migration Report\n\n`;
  md += `* **Date**: ${new Date().toLocaleString()}\n`;
  md += `* **Policy**: Databases and logs must be stored on the D:\\ drive instead of C:\\dev.\n\n`;
  md += `## Migration Summary\n\n`;
  md += `* **Total Files Migrated**: ${items.filter(i => i.status === 'copied').length}\n`;
  md += `* **Errors encountered**: ${items.filter(i => i.status === 'error').length}\n`;
  md += `* **Gitignore updated**: ${gitIgnoreUpdated ? 'Yes' : 'No (already ignored or gitignore missing)'}\n\n`;

  md += `### Migrated Files Details\n\n`;
  if (items.length === 0) {
    md += `🎉 No files required migration or all files are already compliant.\n`;
  } else {
    md += `| Original File (C:) | Target Path (D:) | Status |\n`;
    md += `| --- | --- | --- |\n`;
    for (const item of items) {
      const errDetail = item.error ? ` (Error: ${item.error})` : '';
      md += `| \`${item.originalPath}\` | \`${item.targetPath}\` | ${item.status}${errDetail} |\n`;
    }
    md += '\n';
  }

  md += recommendationsMd + '\n';

  md += `### ⚠️ Important Action Required\n\n`;
  md += `The database and log files have been **copied** to the target \`D:\\\` directory. To preserve stability, the original files on the \`C:\\\` drive were **not** deleted. \n\n`;
  md += `Please update your application configurations (e.g., \`.env\` files, configuration structures, or SQLite connection strings) to point to the new \`D:\\\` paths instead of using relative paths inside \`C:\\dev\`. Once verified, you may safely delete the original files manually.\n`;

  try {
    mkdirSync(MIGRATION_LOG_DIR, { recursive: true });
    writeFileSync(reportPath, md, 'utf8');
  } catch (err) {
    console.error('Failed to write path migration report', err);
  }

  let summary = `✅ *Path Policy Migration Complete* ✅\n\n`;
  summary += `• Files Copied: ${items.filter(i => i.status === 'copied').length}\n`;
  summary += `• Gitignore Updated: ${gitIgnoreUpdated ? 'Yes' : 'No'}\n\n`;
  if (items.length > 0) {
    summary += `*Copied Files:*\n`;
    items.slice(0, 5).forEach((item, idx) => {
      summary += `${idx + 1}. \`${basename(item.originalPath)}\` ➔ \`${basename(item.targetPath)}\`\n`;
    });
  }
  summary += `\n📄 *Migration Report*: ${reportPath}\n\n*Note*: Original files were preserved. Please update your connection strings/configs before manually deleting them.`;
  return summary;
}

// Check if running directly as CLI script
if (process.argv[1] && (process.argv[1].endsWith('fix-paths.ts') || process.argv[1].endsWith('fix-paths.js'))) {
  const summary = runPathFix();
  console.log(summary);
}
