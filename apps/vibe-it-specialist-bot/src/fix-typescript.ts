import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const WORKSPACE_ROOT = 'C:/dev';
const MIGRATION_LOG_DIR = 'D:/logs/vibe-it-specialist-bot/optimization';
const TARGET_TS_VERSION = '5.9.3';

interface TypeScriptUpdate {
  projectName: string;
  relativePath: string;
  field: 'dependencies' | 'devDependencies';
  oldVersion: string;
  newVersion: string;
}

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function runTypeScriptFix(): string {
  const updates: TypeScriptUpdate[] = [];
  const dirs = [
    { path: join(WORKSPACE_ROOT, 'apps'), rootRel: 'apps' },
    { path: join(WORKSPACE_ROOT, 'packages'), rootRel: 'packages' },
    { path: join(WORKSPACE_ROOT, 'tools'), rootRel: 'tools' },
  ];

  for (const group of dirs) {
    if (!existsSync(group.path)) continue;

    const groupDir = group.path;
    let items: string[] = [];
    try {
      items = readdirSync(groupDir);
    } catch {
      continue;
    }

    for (const item of items) {
      const fullPath = join(groupDir, item);
      if (!statSync(fullPath).isDirectory()) continue;

      const pkgPath = join(fullPath, 'package.json');
      if (existsSync(pkgPath)) {
        let pkgContent = '';
        let pkgJson: PackageJson | null = null;
        try {
          pkgContent = readFileSync(pkgPath, 'utf8');
          pkgJson = JSON.parse(pkgContent) as PackageJson;
        } catch {
          continue;
        }

        let updated = false;
        const name = pkgJson?.name ?? item;
        const relPath = relative(WORKSPACE_ROOT, pkgPath).replaceAll('\\', '/');

        // Check dependencies
        if (pkgJson?.dependencies?.['typescript']) {
          const oldVer = pkgJson.dependencies['typescript'];
          if (oldVer !== TARGET_TS_VERSION) {
            pkgJson.dependencies['typescript'] = TARGET_TS_VERSION;
            updated = true;
            updates.push({
              projectName: name,
              relativePath: relPath,
              field: 'dependencies',
              oldVersion: oldVer,
              newVersion: TARGET_TS_VERSION,
            });
          }
        }

        // Check devDependencies
        if (pkgJson?.devDependencies?.['typescript']) {
          const oldVer = pkgJson.devDependencies['typescript'];
          if (oldVer !== TARGET_TS_VERSION) {
            pkgJson.devDependencies['typescript'] = TARGET_TS_VERSION;
            updated = true;
            updates.push({
              projectName: name,
              relativePath: relPath,
              field: 'devDependencies',
              oldVersion: oldVer,
              newVersion: TARGET_TS_VERSION,
            });
          }
        }

        if (updated) {
          try {
            writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
          } catch (err) {
            console.error(`Failed to write package.json for ${name}`, err);
          }
        }
      }
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(MIGRATION_LOG_DIR, `typescript-migration-report-${stamp}.md`);

  // Write Markdown Report
  let md = `# TypeScript Version Alignment Report\n\n`;
  md += `* **Date**: ${new Date().toLocaleString()}\n`;
  md += `* **Target Version**: \`typescript@${TARGET_TS_VERSION}\` (matching workspace root configuration)\n\n`;
  
  md += `## Summary\n\n`;
  md += `* **Total package.json files updated**: ${updates.length}\n\n`;

  md += `### Updated Projects Details\n\n`;
  if (updates.length === 0) {
    md += `🎉 All projects are already aligned with typescript version \`${TARGET_TS_VERSION}\`!\n`;
  } else {
    md += `| Project / Package | package.json Path | Location | Original Version | New Version |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;
    for (const update of updates) {
      md += `| \`${update.projectName}\` | \`${update.relativePath}\` | \`${update.field}\` | \`${update.oldVersion}\` | \`${update.newVersion}\` |\n`;
    }
    md += `\n`;
  }

  md += `### ⚠️ Action Required\n\n`;
  md += `The TypeScript versions have been aligned in package configurations. To apply these changes in the workspace and rebuild node_modules, you MUST run a fresh install:\n\n`;
  md += `1. Run \`/it run pnpm-install\` in the bot (or run \`pnpm install\` in the root terminal).\n`;
  md += `2. Build and verify the affected packages to ensure zero compiler discrepancies.\n`;

  try {
    mkdirSync(MIGRATION_LOG_DIR, { recursive: true });
    writeFileSync(reportPath, md, 'utf8');
  } catch (err) {
    console.error('Failed to write TypeScript migration report', err);
  }

  let summary = `✅ *TypeScript Version Alignment Complete* ✅\n\n`;
  summary += `• Configurations Updated: ${updates.length}\n`;
  summary += `• Target Version: \`typescript@${TARGET_TS_VERSION}\`\n\n`;
  if (updates.length > 0) {
    summary += `*Updated Projects:*\n`;
    updates.slice(0, 5).forEach((u, idx) => {
      summary += `${idx + 1}. \`${u.projectName}\` (\`${u.field}\`: \`${u.oldVersion}\` ➔ \`${u.newVersion}\`)\n`;
    });
  }
  summary += `\n📄 *Migration Report*: ${reportPath}\n\n*Note*: Please run \`/it run pnpm-install\` next to compile the updated packages.`;
  return summary;
}

// Check if running directly as CLI script
if (process.argv[1] && (process.argv[1].endsWith('fix-typescript.ts') || process.argv[1].endsWith('fix-typescript.js'))) {
  const summary = runTypeScriptFix();
  console.log(summary);
}
