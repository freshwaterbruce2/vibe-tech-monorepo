import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const WORKSPACE_ROOT = 'C:/dev';
const MIGRATION_LOG_DIR = 'D:/logs/vibe-it-specialist-bot/optimization';

type ProjectClass = 'app' | 'package' | 'e2e' | 'tool' | 'experimental';

interface TargetUpdate {
  projectName: string;
  relativePath: string;
  projectClass: ProjectClass;
  addedTargets: { target: string; command: string }[];
  recommendations: string[];
}

interface TargetConfig {
  executor?: string;
  options?: Record<string, unknown>;
}

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface ProjectJson {
  name?: string;
  targets?: Record<string, TargetConfig>;
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

function classifyProject(dirName: string, relativePath: string): ProjectClass {
  const norm = relativePath.toLowerCase();
  
  // Experimental / Archive / Smoke test projects
  if (
    dirName.startsWith('_') || 
    norm.includes('smoke') || 
    norm.includes('test-factory') || 
    norm.includes('my-test') ||
    dirName === 'tty'
  ) {
    return 'experimental';
  }

  // E2E test projects
  if (norm.endsWith('-e2e') || norm.includes('/e2e') || norm.includes('automator-e2e')) {
    return 'e2e';
  }

  // Tools / Scripts
  if (norm.startsWith('tools/')) {
    return 'tool';
  }

  // Apps
  if (norm.startsWith('apps/')) {
    return 'app';
  }

  // Packages / Libs
  if (norm.startsWith('packages/')) {
    return 'package';
  }

  return 'package'; // Default fallback
}

function runTargetsFix(): string {
  const updates: TargetUpdate[] = [];
  const dirs = [
    { path: join(WORKSPACE_ROOT, 'apps'), rootRel: 'apps' },
    { path: join(WORKSPACE_ROOT, 'packages'), rootRel: 'packages' },
    { path: join(WORKSPACE_ROOT, 'tools'), rootRel: 'tools' },
  ];

  for (const group of dirs) {
    if (!existsSync(group.path)) continue;

    let items: string[] = [];
    try {
      items = readdirSync(group.path);
    } catch {
      continue;
    }

    for (const item of items) {
      const fullPath = join(group.path, item);
      if (!statSync(fullPath).isDirectory()) continue;

      const pkgPath = join(fullPath, 'package.json');
      const projPath = join(fullPath, 'project.json');
      
      if (existsSync(pkgPath) || existsSync(projPath)) {
        let pkgContent = '';
        let pkgJson: PackageJson | null = null;
        let projJson: ProjectJson | null = null;

        if (existsSync(pkgPath)) {
          try {
            pkgContent = readFileSync(pkgPath, 'utf8');
            pkgJson = JSON.parse(pkgContent) as PackageJson;
          } catch {}
        }

        if (existsSync(projPath)) {
          try {
            projJson = JSON.parse(readFileSync(projPath, 'utf8')) as ProjectJson;
          } catch {}
        }

        const projectName = pkgJson?.name ?? projJson?.name ?? item;
        const relPath = relative(WORKSPACE_ROOT, fullPath).replaceAll('\\', '/');
        const projectClass = classifyProject(item, relPath);

        // Experimental projects require no standard targets to avoid polluting them
        if (projectClass === 'experimental') continue;

        const scripts = pkgJson?.scripts ?? {};
        const nxTargets = projJson?.targets ?? {};
        const addedTargets: { target: string; command: string }[] = [];
        const recommendations: string[] = [];

        // Check target existence in both package.json scripts and project.json targets
        const hasBuild = (scripts['build'] ?? nxTargets['build']) !== undefined;
        const hasTest = (scripts['test'] ?? scripts['test:unit'] ?? nxTargets['test'] ?? nxTargets['vitest:test'] ?? nxTargets['test:unit']) !== undefined;
        const hasTypecheck = (scripts['typecheck'] ?? nxTargets['typecheck']) !== undefined;
        const hasLint = (scripts['lint'] ?? scripts['lint:biome'] ?? nxTargets['lint']) !== undefined;

        // Check TSConfig presence
        const hasTSConfig = existsSync(join(fullPath, 'tsconfig.json'));
        // Check ESLint config presence
        const hasESLint = existsSync(join(fullPath, 'eslint.config.js')) || 
                         existsSync(join(fullPath, '.eslintrc.json')) || 
                         existsSync(join(fullPath, '.eslintrc.js')) || 
                         existsSync(join(WORKSPACE_ROOT, 'eslint.config.js'));
        // Check Vitest/Jest config presence
        const hasTestConfig = existsSync(join(fullPath, 'vitest.config.ts')) || 
                              existsSync(join(fullPath, 'jest.config.js')) ||
                              existsSync(join(fullPath, 'tests')) ||
                              existsSync(join(fullPath, 'src/__tests__'));

        // Helper to add target
        const addTarget = (targetName: string, commandStr: string) => {
          if (pkgJson) {
            pkgJson.scripts = pkgJson.scripts ?? {};
            pkgJson.scripts[targetName] = commandStr;
          } else if (projJson) {
            projJson.targets = projJson.targets ?? {};
            projJson.targets[targetName] = {
              executor: 'nx:run-commands',
              options: {
                command: commandStr,
                cwd: relPath,
              }
            };
          }
          addedTargets.push({ target: targetName, command: commandStr });
        };

        // 1. Build Target (required for package, optional for app, not needed for tool/e2e)
        if (!hasBuild) {
          if (projectClass === 'package') {
            addTarget('build', 'tsc');
          } else if (projectClass === 'app') {
            const deps = { ...pkgJson?.dependencies, ...pkgJson?.devDependencies };
            if (deps['next']) {
              addTarget('build', 'next build');
            } else if (deps['vite']) {
              addTarget('build', 'vite build');
            } else if (deps['@tauri-apps/cli']) {
              recommendations.push('Tauri application detected. Please define a production tauri build script (e.g. "tauri build").');
            } else {
              recommendations.push('Custom application. Please specify an appropriate build command.');
            }
          }
        }

        // 2. Typecheck Target (required if typescript/tsconfig is present)
        if (hasTSConfig && !hasTypecheck) {
          addTarget('typecheck', 'tsc -p tsconfig.json --noEmit');
        }

        // 3. Lint Target (required if eslint is configured)
        if (hasESLint && !hasLint) {
          const targetDirs = ['src', 'tests', 'lib', 'server', 'client'].filter(d => existsSync(join(fullPath, d)));
          const targetPattern = targetDirs.length > 0 ? targetDirs.join(' ') : '.';
          addTarget('lint', `eslint ${targetPattern} --max-warnings 0`);
        }

        // 4. Test Target (required for app, package, e2e)
        if (!hasTest) {
          if (projectClass === 'e2e') {
            const usesPlaywright = pkgContent.includes('playwright') || existsSync(join(fullPath, 'playwright.config.ts'));
            if (usesPlaywright) {
              addTarget('test', 'playwright test');
            } else {
              recommendations.push('E2E project. Playwright or other E2E runner configuration required.');
            }
          } else if (hasTestConfig || projectClass === 'package' || projectClass === 'app') {
            const deps = { ...pkgJson?.dependencies, ...pkgJson?.devDependencies };
            if (deps['vitest']) {
              addTarget('test', 'vitest run');
            } else {
              addTarget('test', 'vitest run');
              recommendations.push('Defaulted test to "vitest run". Please verify testing framework compatibility.');
            }
          }
        }

        // Write changes
        if (addedTargets.length > 0) {
          if (pkgJson) {
            try {
              writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
            } catch (err) {
              console.error(`Failed to write package.json for ${projectName}`, err);
            }
          }
          if (projJson) {
            try {
              writeFileSync(projPath, JSON.stringify(projJson, null, 2) + '\n', 'utf8');
            } catch (err) {
              console.error(`Failed to write project.json for ${projectName}`, err);
            }
          }
          updates.push({
            projectName,
            relativePath: relPath,
            projectClass,
            addedTargets,
            recommendations,
          });
        }
      }
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(MIGRATION_LOG_DIR, `targets-migration-report-${stamp}.md`);

  // Write Markdown Report
  let md = `# Target Coverage Migration Report\n\n`;
  md += `* **Date**: ${new Date().toLocaleString()}\n`;
  md += `* **Policy**: Monorepo standard targets (build, test, lint, typecheck) must be defined and appropriate to the project type.\n\n`;
  
  md += `## Summary\n\n`;
  md += `* **Total projects updated**: ${updates.length}\n\n`;

  md += `### Updated Projects Details\n\n`;
  if (updates.length === 0) {
    md += `🎉 All projects have compliant target/scripts configurations!\n`;
  } else {
    for (const u of updates) {
      md += `#### Project: \`${u.projectName}\` (\`type: ${u.projectClass}\`)\n`;
      md += `* **Path**: \`${u.relativePath}\`\n`;
      md += `* **Added Scripts**:\n`;
      for (const t of u.addedTargets) {
        md += `  - \`"${t.target}": "${t.command}"\`\n`;
      }
      if (u.recommendations.length > 0) {
        md += `* **Manual Recommendations**:\n`;
        for (const rec of u.recommendations) {
          md += `  - ⚠️ ${rec}\n`;
        }
      }
      md += `\n`;
    }
  }

  md += `### ⚠️ Verification Required\n\n`;
  md += `Please verify that the newly added targets run successfully in the workspace by executing command checks, for example:\n\n`;
  md += `* \`/it run affected-quality\` (to check build/test/lint/typecheck status on modified files)\n`;
  md += `* \`/it typecheck <project>\`\n`;
  md += `* \`/it test <project>\`\n`;

  try {
    mkdirSync(MIGRATION_LOG_DIR, { recursive: true });
    writeFileSync(reportPath, md, 'utf8');
  } catch (err) {
    console.error('Failed to write target migration report', err);
  }

  let summary = `✅ *Target Coverage Correction Complete* ✅\n\n`;
  summary += `• Projects Configured: ${updates.length}\n\n`;
  if (updates.length > 0) {
    summary += `*Updated Projects:*\n`;
    updates.slice(0, 5).forEach((u, idx) => {
      const addedNames = u.addedTargets.map(t => t.target).join(', ');
      summary += `${idx + 1}. \`${u.projectName}\` (Class: \`${u.projectClass}\`, Added: [${addedNames}])\n`;
    });
  }
  summary += `\n📄 *Migration Report*: ${reportPath}\n\n*Note*: Check the report for any manual configuration recommendations.`;
  return summary;
}

// Check if running directly as CLI script
if (process.argv[1] && (process.argv[1].endsWith('fix-targets.ts') || process.argv[1].endsWith('fix-targets.js'))) {
  const summary = runTargetsFix();
  console.log(summary);
}
