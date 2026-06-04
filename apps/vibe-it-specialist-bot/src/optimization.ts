import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE_ROOT = 'C:/dev';
const LOG_DIR = 'D:/logs/vibe-it-specialist-bot/optimization';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.nx', 'dist', 'build', 'coverage', '_backups',
  '.agent', '.agents', '.claude', '.cursor', '.gemini', '.vscode',
  '.playwright-mcp', '.antigravitycli', '.kimi', '.serena', '.vercel',
  '_worktrees', 'target'
]);

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  nx?: { targets?: Record<string, unknown> };
  packageManager?: string | undefined;
  [key: string]: unknown;
}

interface ProjectJson {
  name?: string;
  targets?: Record<string, { cache?: boolean; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface ProjectInfo {
  name: string;
  dir: string;
  type: 'app' | 'package' | 'tool';
  packageJson?: PackageJson | undefined;
  projectJson?: ProjectJson | undefined;
}

interface Finding {
  category: 'targets' | 'deps' | 'hygiene' | 'cache' | 'slow-path';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  message: string;
  details?: string;
}

function getProjects(): ProjectInfo[] {
  const projects: ProjectInfo[] = [];
  const dirs: { path: string; type: 'app' | 'package' | 'tool' }[] = [
    { path: join(WORKSPACE_ROOT, 'apps'), type: 'app' },
    { path: join(WORKSPACE_ROOT, 'packages'), type: 'package' },
    { path: join(WORKSPACE_ROOT, 'tools'), type: 'tool' },
  ];

  for (const group of dirs) {
    if (!statSync(group.path).isDirectory()) continue;
    const items = readdirSync(group.path);
    for (const item of items) {
      const fullPath = join(group.path, item);
      if (!statSync(fullPath).isDirectory()) continue;
      
      const pkgPath = join(fullPath, 'package.json');
      const projPath = join(fullPath, 'project.json');
      
      if (existsSync(pkgPath) || existsSync(projPath)) {
        let packageJson: PackageJson | undefined = undefined;
        let projectJson: ProjectJson | undefined = undefined;
        let name = item;

        if (existsSync(pkgPath)) {
          try {
            packageJson = JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageJson;
            name = packageJson.name ?? name;
          } catch {}
        }
        if (existsSync(projPath)) {
          try {
            projectJson = JSON.parse(readFileSync(projPath, 'utf8')) as ProjectJson;
            name = projectJson.name ?? name;
          } catch {}
        }

        projects.push({
          name,
          dir: fullPath,
          type: group.type,
          packageJson,
          projectJson,
        });
      }
    }
  }
  return projects;
}

function existsSync(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

// 1. Target Coverage Analyser
function checkTargets(projects: ProjectInfo[], findings: Finding[]) {
  for (const proj of projects) {
    const scripts = proj.packageJson?.scripts ?? {};
    const nxTargets = proj.projectJson?.targets ?? proj.packageJson?.nx?.targets ?? {};
    
    const hasBuild = (scripts['build'] ?? nxTargets['build']) !== undefined;
    const hasTest = (scripts['test'] ?? scripts['test:unit'] ?? nxTargets['test'] ?? nxTargets['vitest:test'] ?? nxTargets['test:unit']) !== undefined;
    const hasTypecheck = (scripts['typecheck'] ?? nxTargets['typecheck']) !== undefined;
    const hasLint = (scripts['lint'] ?? scripts['lint:biome'] ?? nxTargets['lint']) !== undefined;

    const missing: string[] = [];
    if (!hasBuild && proj.type === 'package') missing.push('build'); // apps might not have built output directly
    if (!hasTest) missing.push('test');
    if (!hasTypecheck) missing.push('typecheck');
    if (!hasLint) missing.push('lint');

    if (missing.length > 0) {
      findings.push({
        category: 'targets',
        priority: proj.type === 'package' && missing.includes('build') ? 'P0' : 'P1',
        message: `Project "${proj.name}" is missing target(s): ${missing.join(', ')}`,
        details: `Directory: ${proj.dir.replace(WORKSPACE_ROOT, '')}`,
      });
    }
  }
}

// 2. Dependency Alignment Analyser
function checkDependencies(projects: ProjectInfo[], findings: Finding[]) {
  const rootPkgPath = join(WORKSPACE_ROOT, 'package.json');
  if (!existsSync(rootPkgPath)) return;
  
  let rootPkg: PackageJson = {};
  try {
    rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8')) as PackageJson;
  } catch {
    return;
  }

  // Version maps for key libraries
  const keyLibs = ['react', 'react-dom', 'vite', 'typescript', 'zod', 'tailwindcss', 'telegraf', 'vitest', 'eslint'];
  const versionMap = new Map<string, Map<string, string[]>>(); // libName -> versionString -> projectNames[]

  // Helper to register versions
  const registerVersion = (lib: string, version: string, projName: string) => {
    // Clean versions to identify actual mismatch (e.g. ^19.0.0 vs 19.0.0)
    const cleaned = version.replace(/[\^~]/g, '');
    if (!versionMap.has(lib)) {
      versionMap.set(lib, new Map());
    }
    const innerMap = versionMap.get(lib);
    if (innerMap) {
      let list = innerMap.get(cleaned);
      if (!list) {
        list = [];
        innerMap.set(cleaned, list);
      }
      list.push(projName);
    }
  };

  // Add root versions
  const rootDeps: Record<string, string> = { ...rootPkg.dependencies, ...rootPkg.devDependencies };
  for (const lib of keyLibs) {
    if (rootDeps[lib]) {
      registerVersion(lib, rootDeps[lib], 'root');
    }
  }

  // Check subprojects
  for (const proj of projects) {
    const deps: Record<string, string> = { ...proj.packageJson?.dependencies, ...proj.packageJson?.devDependencies };
    for (const lib of keyLibs) {
      if (deps[lib]) {
        registerVersion(lib, deps[lib], proj.name);
      }
    }
  }

  // Generate version conflict findings
  for (const [lib, innerMap] of versionMap.entries()) {
    if (innerMap.size > 1) {
      const detailsArr: string[] = [];
      innerMap.forEach((projectsArr, version) => {
        detailsArr.push(`Version ${version} in: ${projectsArr.join(', ')}`);
      });
      findings.push({
        category: 'deps',
        priority: lib === 'react' || lib === 'react-dom' || lib === 'typescript' ? 'P0' : 'P2',
        message: `Mismatched versions found for key library "${lib}" (${innerMap.size} distinct versions)`,
        details: detailsArr.join('\n'),
      });
    }
  }

  // Check packageManager declaration
  if (rootPkg.packageManager && !rootPkg.packageManager.startsWith('pnpm@10')) {
    findings.push({
      category: 'deps',
      priority: 'P1',
      message: `Root packageManager is configured as "${rootPkg.packageManager}", expected pnpm v10.x`,
      details: 'Check package.json "packageManager" property',
    });
  }
}

// 3. Workspace Hygiene Analyser
function checkHygiene(findings: Finding[]) {
  const cLogs: string[] = [];
  const cDbs: string[] = [];
  const srcBuildArtifacts: string[] = [];
  const generatedFilesInSrc: string[] = [];

  const scanDir = (dir: string, depth = 0) => {
    if (depth > 8) return;
    let items: string[] = [];
    try {
      items = readdirSync(dir);
    } catch {
      return;
    }

    for (const item of items) {
      if (IGNORED_DIRS.has(item)) continue;
      const fullPath = join(dir, item);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        const normPath = fullPath.replaceAll('\\', '/');
        // Check for unexpectedly placed dist/build/coverage folders in source tree
        if (normPath.includes('/src/dist') || normPath.includes('/src/build') || normPath.includes('/src/coverage')) {
          srcBuildArtifacts.push(fullPath);
        }
        scanDir(fullPath, depth + 1);
      } else {
        const ext = item.split('.').pop()?.toLowerCase();
        const normPath = fullPath.replaceAll('\\', '/');
        // Check D-drive rule violations for logs and dbs
        if (ext === 'log' || ext === 'db' || ext === 'sqlite') {
          if (fullPath.startsWith('C:')) {
            // Exceptions for local agent prompt snapshot configurations, kanban lock files, or git-based settings
            if (!normPath.includes('.gemini') && !normPath.includes('.update_check') && !normPath.includes('auth.lock') && !normPath.includes('gateway.lock') && !normPath.includes('kanban.db.init.lock') && !normPath.includes('node_modules')) {
              if (ext === 'log') cLogs.push(fullPath);
              else cDbs.push(fullPath);
            }
          }
        }
        // Check generated build files in packages/src folder
        if (normPath.includes('/packages/') && normPath.includes('/src/') && (ext === 'js' || item.endsWith('.d.ts'))) {
          // Exclude helper/configuration scripts and standard source assets
          if (!normPath.endsWith('vitest.config.ts') && !normPath.includes('tailwind') && !normPath.includes('eslint') && !normPath.includes('next.config')) {
            generatedFilesInSrc.push(fullPath);
          }
        }
      }
    }
  };

  scanDir(WORKSPACE_ROOT);

  if (cLogs.length > 0) {
    findings.push({
      category: 'hygiene',
      priority: 'P1',
      message: `${cLogs.length} runtime log file(s) found under C:\\dev (violates D:\\ drive policy)`,
      details: cLogs.slice(0, 5).join('\n') + (cLogs.length > 5 ? `\n...and ${cLogs.length - 5} more` : ''),
    });
  }
  if (cDbs.length > 0) {
    findings.push({
      category: 'hygiene',
      priority: 'P0',
      message: `${cDbs.length} database/SQLite file(s) found under C:\\dev (violates D:\\ drive policy)`,
      details: cDbs.slice(0, 5).join('\n') + (cDbs.length > 5 ? `\n...and ${cDbs.length - 5} more` : ''),
    });
  }
  if (srcBuildArtifacts.length > 0) {
    findings.push({
      category: 'hygiene',
      priority: 'P1',
      message: `${srcBuildArtifacts.length} build artifact folder(s) found nested inside source directories`,
      details: srcBuildArtifacts.slice(0, 5).join('\n'),
    });
  }
  if (generatedFilesInSrc.length > 0) {
    findings.push({
      category: 'hygiene',
      priority: 'P2',
      message: `${generatedFilesInSrc.length} emitted JS/d.ts file(s) found inside packages/*/src/`,
      details: generatedFilesInSrc.slice(0, 5).join('\n') + (generatedFilesInSrc.length > 5 ? `\n...and ${generatedFilesInSrc.length - 5} more` : ''),
    });
  }
}

interface NxJson {
  targetDefaults?: Record<string, { cache?: boolean; [key: string]: unknown }>;
  [key: string]: unknown;
}

// 4. Cache Effectiveness Analyser
function checkCache(findings: Finding[]) {
  const nxJsonPath = join(WORKSPACE_ROOT, 'nx.json');
  if (!existsSync(nxJsonPath)) return;

  let nxJson: NxJson = {};
  try {
    nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf8')) as NxJson;
  } catch {
    return;
  }

  const targetDefaults = nxJson.targetDefaults ?? {};
  const missingCacheConfig: string[] = [];

  const coreTargets = ['build', 'test', 'typecheck', 'lint'];
  for (const target of coreTargets) {
    const config = targetDefaults[target];
    if (config?.cache !== true) {
      missingCacheConfig.push(target);
    }
  }

  if (missingCacheConfig.length > 0) {
    findings.push({
      category: 'cache',
      priority: 'P0',
      message: `Nx cache is disabled or missing configuration for core targets: ${missingCacheConfig.join(', ')}`,
      details: 'Check nx.json targetDefaults config',
    });
  }

  // Calculate Cache directory size
  const cacheDir = join(WORKSPACE_ROOT, '.nx/cache');
  let cacheSize = 0;
  let fileCount = 0;
  
  const sumDirSize = (dir: string) => {
    let items: string[] = [];
    try { items = readdirSync(dir); } catch { return; }
    for (const item of items) {
      const fullPath = join(dir, item);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          sumDirSize(fullPath);
        } else {
          cacheSize += stat.size;
          fileCount++;
        }
      } catch {}
    }
  };

  if (existsSync(cacheDir)) {
    sumDirSize(cacheDir);
  }

  const sizeMb = (cacheSize / (1024 * 1024)).toFixed(2);
  findings.push({
    category: 'cache',
    priority: 'P3',
    message: `Nx Cache directory statistics`,
    details: `Cache folder: ${cacheDir}\nTotal files: ${fileCount}\nTotal size: ${sizeMb} MB`,
  });
}

// 5. Slow-path Recommendations
function checkSlowPaths(projects: ProjectInfo[], findings: Finding[]) {
  const projectSizes: { name: string; fileCount: number; dir: string }[] = [];

  for (const proj of projects) {
    let fileCount = 0;
    const countFiles = (dir: string) => {
      let items: string[] = [];
      try { items = readdirSync(dir); } catch { return; }
      for (const item of items) {
        if (IGNORED_DIRS.has(item)) continue;
        const fullPath = join(dir, item);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            countFiles(fullPath);
          } else {
            const ext = item.split('.').pop()?.toLowerCase();
            if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
              fileCount++;
            }
          }
        } catch {}
      }
    };
    countFiles(proj.dir);
    projectSizes.push({ name: proj.name, fileCount, dir: proj.dir });
  }

  // Sort and list largest projects
  const sorted = projectSizes.sort((a, b) => b.fileCount - a.fileCount).filter(p => p.fileCount > 0);
  const topSize = sorted.slice(0, 5);

  if (topSize.length > 0) {
    const details = topSize.map(p => `- ${p.name}: ${p.fileCount} source files (${p.dir.replace(WORKSPACE_ROOT, '')})`).join('\n');
    findings.push({
      category: 'slow-path',
      priority: 'P2',
      message: `Largest projects by source file count (top candidates for code splitting / build optimization)`,
      details,
    });
  }
}

export function runOptimization(categoryFilter?: string): string {
  const projects = getProjects();
  const findings: Finding[] = [];

  // Run analytical stages
  if (!categoryFilter || categoryFilter === 'targets') checkTargets(projects, findings);
  if (!categoryFilter || categoryFilter === 'deps') checkDependencies(projects, findings);
  if (!categoryFilter || categoryFilter === 'hygiene' || categoryFilter === 'paths') checkHygiene(findings);
  if (!categoryFilter || categoryFilter === 'cache') checkCache(findings);
  if (!categoryFilter || categoryFilter === 'slow-path' || categoryFilter === 'report') checkSlowPaths(projects, findings);

  // Group findings by priority
  const p0 = findings.filter(f => f.priority === 'P0');
  const p1 = findings.filter(f => f.priority === 'P1');
  const p2 = findings.filter(f => f.priority === 'P2');
  const p3 = findings.filter(f => f.priority === 'P3');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = join(LOG_DIR, `optimization-report-${stamp}.json`);
  const mdPath = join(LOG_DIR, `optimization-report-${stamp}.md`);
  const latestJsonPath = join(LOG_DIR, 'latest.json');
  const latestMdPath = join(LOG_DIR, 'latest.md');

  // Build JSON Report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    filter: categoryFilter ?? 'all',
    summary: {
      totalProjects: projects.length,
      totalFindings: findings.length,
      P0Count: p0.length,
      P1Count: p1.length,
      P2Count: p2.length,
      P3Count: p3.length,
    },
    findings,
  };

  // Build Markdown Report
  let mdReport = `# Vibe Monorepo Optimization Report\n\n`;
  mdReport += `* **Date**: ${new Date().toLocaleString()}\n`;
  mdReport += `* **Scope**: ${categoryFilter ?? 'All Categories'}\n`;
  mdReport += `* **Total Projects Analyzed**: ${projects.length}\n\n`;
  mdReport += `## Executive Summary\n\n`;
  mdReport += `* **P0 (Critical correctness/safety)**: ${p0.length}\n`;
  mdReport += `* **P1 (High speed/policy impact)**: ${p1.length}\n`;
  mdReport += `* **P2 (Medium cleanup/consistency)**: ${p2.length}\n`;
  mdReport += `* **P3 (Low automation/information)**: ${p3.length}\n\n`;

  const addSection = (title: string, list: Finding[]) => {
    if (list.length === 0) return;
    mdReport += `### ${title}\n\n`;
    for (const f of list) {
      mdReport += `#### ${f.message}\n`;
      mdReport += `* **Category**: ${f.category}\n`;
      if (f.details) {
        mdReport += `* **Details**:\n\`\`\`\n${f.details}\n\`\`\`\n`;
      }
      mdReport += `\n`;
    }
  };

  addSection('P0 - Critical Priority Issues', p0);
  addSection('P1 - High Priority Issues', p1);
  addSection('P2 - Medium Priority Issues', p2);
  addSection('P3 - Low Priority / Information', p3);

  // Write files
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
    writeFileSync(mdPath, mdReport, 'utf8');
    writeFileSync(latestJsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
    writeFileSync(latestMdPath, mdReport, 'utf8');
  } catch (err) {
    console.error('Failed to write optimization reports', err);
  }

  // Telegram Summary (Top 10 findings)
  const sortedFindings = [...p0, ...p1, ...p2, ...p3];
  const sliceFindings = sortedFindings.slice(0, 10);
  
  let teleSummary = `=== Monorepo Optimization Summary ===\n\n`;
  teleSummary += `• Projects: ${projects.length}\n`;
  teleSummary += `• P0 (Critical): ${p0.length} | P1 (High): ${p1.length} | P2 (Medium): ${p2.length}\n\n`;
  teleSummary += `*Top Findings:*\n`;
  
  if (sliceFindings.length === 0) {
    teleSummary += `[OK] No optimization findings! Monorepo is in perfect health.\n`;
  } else {
    let idx = 1;
    for (const f of sliceFindings) {
      teleSummary += `${idx}. [${f.priority}] *${f.category}*: ${f.message}\n`;
      idx++;
    }
  }

  if (sortedFindings.length > 10) {
    teleSummary += `\n...and ${sortedFindings.length - 10} more findings.\n`;
  }

  teleSummary += `\n*Full Report*: ${mdPath}\n*JSON Report*: ${jsonPath}`;
  return teleSummary;
}

// Check if running directly as CLI script
if (process.argv[1] && (process.argv[1].endsWith('optimization.ts') || process.argv[1].endsWith('optimization.js'))) {
  const filter = process.argv[2] === 'undefined' ? undefined : process.argv[2];
  const summary = runOptimization(filter);
  console.log(summary);
}
