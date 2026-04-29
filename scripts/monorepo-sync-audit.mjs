#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = resolve(__dirname, '..');

const cliArgs = process.argv.slice(2);
const reportOnly = cliArgs.includes('--report-only');
const focus = cliArgs.find((arg) => arg.startsWith('--focus='))?.split('=')[1] ?? null;

const configPath = resolve(workspaceRoot, 'tools', 'monorepo-sync', 'sync-audit.config.json');
const workspaceStatePath = resolve(workspaceRoot, 'WORKSPACE.json');
const tmpDir = resolve(workspaceRoot, 'tmp');
const graphPath = resolve(tmpDir, 'project-graph.sync-audit.json');
const reportPath = resolve(tmpDir, 'monorepo-sync-audit-report.json');
const nxCliPath = resolve(workspaceRoot, 'node_modules', 'nx', 'bin', 'nx.js');

function prependPathEntries(currentPath, entries) {
  const parts = (currentPath ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const seen = new Set(parts.map((entry) => entry.toLowerCase()));
  const nextEntries = [];

  for (const entry of entries) {
    if (!entry || !existsSync(entry)) {
      continue;
    }
    const normalized = entry.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    nextEntries.push(entry);
  }

  return [...nextEntries, ...parts].join(';');
}

function createChildEnv() {
  const env = { ...process.env };
  const systemRoot = env.SystemRoot?.trim() || 'C:\\Windows';
  const localAppData =
    env.LOCALAPPDATA?.trim() || (env.USERPROFILE ? join(env.USERPROFILE, 'AppData', 'Local') : '');
  const pnpmHome = env.PNPM_HOME?.trim() || (localAppData ? join(localAppData, 'pnpm') : '');
  const pathEntries = [
    join(systemRoot, 'System32'),
    join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'),
    pnpmHome,
    dirname(process.execPath),
  ];

  env.SystemRoot = systemRoot;
  env.WINDIR = env.WINDIR?.trim() || systemRoot;
  env.ComSpec = env.ComSpec?.trim() || join(systemRoot, 'System32', 'cmd.exe');
  env.PATHEXT =
    env.PATHEXT?.trim() && env.PATHEXT !== '.CPL'
      ? env.PATHEXT
      : '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL';
  env.PROCESSOR_ARCHITECTURE = env.PROCESSOR_ARCHITECTURE?.trim() || 'AMD64';
  env.PNPM_HOME = pnpmHome || env.PNPM_HOME;
  env.Path = prependPathEntries(env.Path ?? env.PATH ?? '', pathEntries);
  env.PATH = env.Path;
  env.NX_DAEMON = 'false';
  env.NX_CACHE_PROJECT_GRAPH = 'false';
  env.NX_ISOLATE_PLUGINS = 'false';
  env.NX_NO_CLOUD = 'true';
  env.NX_SKIP_REMOTE_CACHE = 'true';
  return env;
}

const childEnv = createChildEnv();

function run(command, args = [], options = {}) {
  try {
    const result = spawnSync(command, args, {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: { ...childEnv, ...(options.env ?? {}) },
      stdio: 'pipe',
      shell: false,
      windowsHide: true,
      ...options,
    });

    return {
      ok: result.status === 0,
      stdout: result.stdout?.toString?.() ?? '',
      stderr: result.stderr?.toString?.() ?? '',
      code: result.status ?? 1,
      error: result.error?.message ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString?.() ?? '',
      stderr: error.stderr?.toString?.() ?? error.message,
      code: error.status ?? 1,
      error: error.message,
    };
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function failAndExit(message, details = '') {
  console.error(`\n[monorepo-sync-audit] ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(2);
}

function safeDirectoryEntries(path) {
  if (!existsSync(path)) {
    return [];
  }

  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

function collectProjectJsonFiles(rootPath) {
  const files = [];

  function walk(currentPath) {
    for (const entry of safeDirectoryEntries(currentPath)) {
      const fullPath = resolve(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === 'project.json') {
        files.push(fullPath);
      }
    }
  }

  if (existsSync(rootPath)) {
    walk(rootPath);
  }

  return files;
}

function readGitStatus() {
  const gitStatus = run('git', ['status', '--short', '--untracked-files=all']);
  if (!gitStatus.ok) {
    return {
      dirtyEntries: [],
      dirtyByPath: new Map(),
      error: gitStatus.error || gitStatus.stderr || gitStatus.stdout || 'git status unavailable',
    };
  }

  const dirtyEntries = gitStatus.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.{2})\s+(.*)$/);
      if (!match) {
        return { status: '??', path: line };
      }

      const [, status, rawPath] = match;
      const finalPath = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
      return { status, path: normalizePath(finalPath) };
    });

  return {
    dirtyEntries,
    dirtyByPath: new Map(dirtyEntries.map((entry) => [entry.path, entry.status])),
    error: null,
  };
}

function parseGitmodules() {
  const gitmodulesPath = resolve(workspaceRoot, '.gitmodules');
  if (!existsSync(gitmodulesPath)) {
    return [];
  }

  const lines = readFileSync(gitmodulesPath, 'utf8').split(/\r?\n/);
  const modules = [];
  let current = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^\[submodule "(.+)"\]$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1] };
      modules.push(current);
      continue;
    }

    if (!current) {
      continue;
    }

    const kvMatch = line.match(/^\s*(path|url)\s*=\s*(.+)\s*$/);
    if (kvMatch) {
      current[kvMatch[1]] = kvMatch[2];
    }
  }

  return modules;
}

function classifyRootArtifact(name, sizeBytes) {
  const patterns = [
    [/^(health_output\d*|lint(_\w+)?_output|test_results|typecheck(_results|_output)?|vibeblox_typecheck|nova_(core_build|typecheck)|shipping_test|checklist_output|booking_build|notion_test\d*|notion_test_curl_exe)\.(txt|json)$/i, 'generated-report'],
    [/^out\.log$/i, 'generated-log'],
    [/^package\.json\.bak$/i, 'backup-file'],
    [/^(token.*|id_zoom.*|bottoken)\.png$/i, 'captured-image'],
    [/^vibe-tech-desktop-environment\.jsx$/i, 'placeholder-file'],
    [/^fibonacci\.js$/i, 'scratch-script'],
  ];

  for (const [pattern, reason] of patterns) {
    if (pattern.test(name)) {
      return reason;
    }
  }

  if (sizeBytes === 0 && /\.(txt|json|jsx)$/i.test(name)) {
    return 'empty-placeholder';
  }

  return null;
}

function collectRootArtifacts(dirtyByPath) {
  return safeDirectoryEntries(workspaceRoot)
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = resolve(workspaceRoot, entry.name);
      const stats = statSync(fullPath);
      const reason = classifyRootArtifact(entry.name, stats.size);
      if (!reason) {
        return null;
      }

      const path = normalizePath(entry.name);
      return {
        path,
        reason,
        sizeBytes: stats.size,
        dirtyStatus: dirtyByPath.get(path) ?? null,
      };
    })
    .filter(Boolean);
}

function collectGeneratedArtifacts(dirtyByPath) {
  const candidates = [];

  const tmpPatterns = [/^nx-graph\.json$/i, /^project-graph.*\.json$/i, /^monorepo-sync-audit-report\.json$/i];
  for (const entry of safeDirectoryEntries(resolve(workspaceRoot, 'tmp'))) {
    if (!entry.isFile()) {
      continue;
    }

    if (!tmpPatterns.some((pattern) => pattern.test(entry.name))) {
      continue;
    }

    const path = normalizePath(`tmp/${entry.name}`);
    candidates.push({
      path,
      reason: 'generated-tmp-report',
      dirtyStatus: dirtyByPath.get(path) ?? null,
    });
  }

  for (const entry of safeDirectoryEntries(resolve(workspaceRoot, 'apps'))) {
    if (!entry.isDirectory()) {
      continue;
    }

    const appRoot = resolve(workspaceRoot, 'apps', entry.name);
    for (const child of safeDirectoryEntries(appRoot)) {
      if (!child.isFile()) {
        continue;
      }

      if (!/^build_(result|output\d*)\.txt$/i.test(child.name) && child.name !== 'build_result.txt') {
        continue;
      }

      const path = normalizePath(`apps/${entry.name}/${child.name}`);
      candidates.push({
        path,
        reason: 'generated-build-report',
        dirtyStatus: dirtyByPath.get(path) ?? null,
      });
    }
  }

  return candidates;
}

function searchLiteral(literal) {
  let rgCommand = 'rg';
  let rgCheck = run(rgCommand, ['--version']);
  if (!rgCheck.ok) {
    const whereRg = run('where.exe', ['rg']);
    const candidate = whereRg.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().endsWith('rg.exe') && existsSync(line));

    if (candidate) {
      rgCommand = candidate;
      rgCheck = run(rgCommand, ['--version']);
    }
  }

  if (!rgCheck.ok) {
    return {
      available: false,
      error: rgCheck.error || rgCheck.stderr || rgCheck.stdout || 'rg unavailable',
      items: [],
    };
  }

  const search = run(rgCommand, [
    '-n',
    '--hidden',
    '-F',
    '--glob', '!**/.git/**',
    '--glob', '!**/node_modules/**',
    '--glob', '!**/dist/**',
    '--glob', '!**/.nx/**',
    '--glob', '!**/coverage/**',
    '--glob', '!**/playwright-report/**',
    '--glob', '!**/test-results/**',
    '--glob', '!**/.codex/**',
    '--glob', '!**/.playwright-cli/**',
    '--glob', '!**/.playwright-mcp/**',
    literal,
    workspaceRoot,
  ]);

  if (!search.ok || !search.stdout.trim()) {
    return {
      available: search.ok,
      error: search.ok ? null : search.error || search.stderr || search.stdout || 'rg search failed',
      items: [],
    };
  }

  return {
    available: true,
    error: null,
    items: search.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([A-Za-z]:.+?):(\d+):(.*)$/);
        if (!match) {
          return null;
        }

        return {
          file: match[1],
          line: Number(match[2]),
          match: match[3].trim(),
        };
      })
      .filter(Boolean),
  };
}

function collectPathPolicyObservations() {
  const learningSearch = searchLiteral('D:\\learning');
  const dataSearch = searchLiteral('C:\\dev\\data');
  const logsSearch = searchLiteral('C:\\dev\\logs');
  const databasesSearch = searchLiteral('C:\\dev\\databases');

  const deprecatedLearning = learningSearch.items
    .filter((item) => !item.match.includes('D:\\learning-system'))
    .slice(0, 50);

  const deprecatedCDrive = [
    ...dataSearch.items,
    ...logsSearch.items,
    ...databasesSearch.items,
  ].slice(0, 50);

  return {
    deprecatedLearning,
    deprecatedCDrive,
    searchAvailable:
      learningSearch.available &&
      dataSearch.available &&
      logsSearch.available &&
      databasesSearch.available,
    searchError:
      learningSearch.error || dataSearch.error || logsSearch.error || databasesSearch.error || null,
  };
}

function collectLocalToolState() {
  return ['.codex', '.playwright-cli', '.playwright-mcp']
    .map((name) => ({
      path: name,
      exists: existsSync(resolve(workspaceRoot, name)),
    }))
    .filter((entry) => entry.exists);
}

if (!existsSync(configPath)) {
  failAndExit(`Missing config: ${configPath}`);
}

if (!existsSync(tmpDir)) {
  mkdirSync(tmpDir, { recursive: true });
}

const config = readJson(configPath);
const requiredTargets = config.requiredTargets ?? ['lint', 'typecheck', 'test', 'build'];
const allowedMissingTargets = config.allowedMissingTargets ?? {};
const allowedIsolatedProjects = new Set(config.allowedIsolatedProjects ?? []);
const allowedStandaloneTags = new Set(config.allowedStandaloneTags ?? []);
const { dirtyEntries, dirtyByPath, error: gitStatusError } = readGitStatus();

let graphSource = 'nx-graph';
let graphLoadWarning = null;
let nodeMap = {};
let dependencyMap = {};

const graphCommand = existsSync(nxCliPath)
  ? run(process.execPath, [nxCliPath, 'graph', '--file', graphPath, '--open=false'])
  : {
      ok: false,
      stdout: '',
      stderr: `Missing Nx CLI at ${nxCliPath}`,
      code: 1,
      error: null,
    };
if (graphCommand.ok && existsSync(graphPath)) {
  const graphJson = readJson(graphPath);
  nodeMap = graphJson?.graph?.nodes ?? {};
  dependencyMap = graphJson?.graph?.dependencies ?? {};
} else {
  graphSource = 'project-json-fallback';
  graphLoadWarning = (graphCommand.stderr || graphCommand.stdout || 'Nx graph unavailable.').trim();

  const projectFiles = [
    ...collectProjectJsonFiles(resolve(workspaceRoot, 'apps')),
    ...collectProjectJsonFiles(resolve(workspaceRoot, 'packages')),
    ...collectProjectJsonFiles(resolve(workspaceRoot, 'backend')),
  ];

  nodeMap = Object.fromEntries(
    projectFiles.map((filePath) => {
      const projectJson = readJson(filePath);
      const projectRoot = normalizePath(dirname(filePath).replace(`${workspaceRoot}\\`, ''));
      return [
        projectJson.name,
        {
          data: {
            root: projectRoot,
            tags: projectJson.tags ?? [],
            targets: projectJson.targets ?? {},
          },
        },
      ];
    }),
  );
  dependencyMap = {};
}

const projectNames = Object.keys(nodeMap).sort();

const missingTargetsUnexpected = [];
const staleMissingAllowances = [];
for (const projectName of projectNames) {
  const projectNode = nodeMap[projectName];
  const projectRoot = projectNode?.data?.root ?? '';
  const targets = new Set(Object.keys(projectNode?.data?.targets ?? {}));
  const missing = requiredTargets.filter((target) => !targets.has(target));
  const allowed = new Set(allowedMissingTargets[projectName] ?? []);
  const unexpected = missing.filter((target) => !allowed.has(target));

  if (unexpected.length > 0) {
    missingTargetsUnexpected.push({
      project: projectName,
      root: projectRoot,
      missing: unexpected,
      allowed: [...allowed],
    });
  }

  const staleForProject = [...allowed].filter((target) => !missing.includes(target));
  if (staleForProject.length > 0) {
    staleMissingAllowances.push({ project: projectName, stale: staleForProject });
  }
}

for (const configuredProject of Object.keys(allowedMissingTargets)) {
  if (!nodeMap[configuredProject]) {
    staleMissingAllowances.push({
      project: configuredProject,
      stale: ['project-not-found'],
    });
  }
}

const inDegree = Object.fromEntries(projectNames.map((project) => [project, 0]));
const outDegree = Object.fromEntries(projectNames.map((project) => [project, 0]));
for (const [source, edges] of Object.entries(dependencyMap)) {
  outDegree[source] = edges.length;
  for (const edge of edges) {
    if (Object.prototype.hasOwnProperty.call(inDegree, edge.target)) {
      inDegree[edge.target] += 1;
    }
  }
}

const isolatedProjects =
  graphSource === 'nx-graph'
    ? projectNames.filter((project) => inDegree[project] === 0 && outDegree[project] === 0)
    : [];

const unexpectedIsolated =
  graphSource === 'nx-graph'
    ? isolatedProjects.filter((project) => {
        if (allowedIsolatedProjects.has(project)) {
          return false;
        }
        const tags = nodeMap[project]?.data?.tags ?? [];
        return !tags.some((tag) => allowedStandaloneTags.has(tag));
      })
    : [];

const staleIsolatedAllowances =
  graphSource === 'nx-graph'
    ? [...allowedIsolatedProjects].filter((project) => !isolatedProjects.includes(project))
    : [];

const workspaceDrift = [];
if (existsSync(workspaceStatePath)) {
  const workspaceState = readJson(workspaceStatePath);
  const declaredApps = Object.keys(workspaceState?.projects?.apps ?? {});
  const declaredPackages = Object.keys(workspaceState?.projects?.packages ?? {});
  const diskApps = safeDirectoryEntries(resolve(workspaceRoot, 'apps'))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const diskPackages = safeDirectoryEntries(resolve(workspaceRoot, 'packages'))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const declaredAppsMissingOnDisk = declaredApps.filter((app) => !diskApps.includes(app));
  const declaredPackagesMissingOnDisk = declaredPackages.filter(
    (pkg) => !diskPackages.includes(pkg),
  );

  if (declaredAppsMissingOnDisk.length > 0) {
    workspaceDrift.push({
      kind: 'declared-app-missing-on-disk',
      values: declaredAppsMissingOnDisk,
    });
  }
  if (declaredPackagesMissingOnDisk.length > 0) {
    workspaceDrift.push({
      kind: 'declared-package-missing-on-disk',
      values: declaredPackagesMissingOnDisk,
    });
  }
}

const packageJsonPath = resolve(workspaceRoot, 'package.json');
const packageScriptsIssues = [];
if (existsSync(packageJsonPath)) {
  const packageJson = readJson(packageJsonPath);
  const scripts = packageJson.scripts ?? {};
  const requiredCiScripts = ['sync:audit', 'ci:lint', 'ci:typecheck', 'ci:test', 'ci:build'];

  for (const scriptName of requiredCiScripts) {
    if (!scripts[scriptName]) {
      packageScriptsIssues.push({
        kind: 'missing-script',
        script: scriptName,
      });
    }
  }

  for (const scriptName of ['ci:lint', 'ci:typecheck', 'ci:test', 'ci:build']) {
    const value = scripts[scriptName];
    if (value && !value.includes('nx affected')) {
      packageScriptsIssues.push({
        kind: 'non-nx-affected-ci-script',
        script: scriptName,
        value,
      });
    }
  }
}

const rootArtifactCandidates = collectRootArtifacts(dirtyByPath);
const generatedArtifactCandidates = collectGeneratedArtifacts(dirtyByPath);
const cleanupCandidates = [...rootArtifactCandidates, ...generatedArtifactCandidates];
const pathPolicy = collectPathPolicyObservations();
const submodules = parseGitmodules();
const localToolState = collectLocalToolState();

const issues = {
  missingTargetsUnexpected,
  unexpectedIsolated,
  workspaceDrift,
  packageScriptsIssues,
};

const warnings = {
  staleMissingAllowances,
  staleIsolatedAllowances,
};

const observations = {
  dirtyWorktree: {
    changedEntries: dirtyEntries.length,
    error: gitStatusError,
  },
  graphSource,
  graphLoadWarning,
  submodules,
  localToolState,
  cleanupCandidates,
  pathPolicy,
};

const issueCount =
  missingTargetsUnexpected.length +
  unexpectedIsolated.length +
  workspaceDrift.length +
  packageScriptsIssues.length;

const warningCount =
  staleMissingAllowances.length +
  staleIsolatedAllowances.length +
  cleanupCandidates.length +
  pathPolicy.deprecatedLearning.length +
  pathPolicy.deprecatedCDrive.length;

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    projects: projectNames.length,
    requiredTargets,
    isolatedProjects: isolatedProjects.length,
    issues: issueCount,
    warnings: warningCount,
    cleanupCandidates: cleanupCandidates.length,
    deprecatedPathReferences:
      pathPolicy.deprecatedLearning.length + pathPolicy.deprecatedCDrive.length,
    submodules: submodules.length,
    dirtyEntries: gitStatusError ? null : dirtyEntries.length,
  },
  issues,
  warnings,
  observations,
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('\nMonorepo Sync Audit');
console.log(`- Projects analyzed: ${projectNames.length}`);
console.log(`- Unexpected target gaps: ${missingTargetsUnexpected.length}`);
console.log(`- Unexpected isolated projects: ${unexpectedIsolated.length}`);
console.log(`- Workspace metadata drift: ${workspaceDrift.length}`);
console.log(`- Root CI script issues: ${packageScriptsIssues.length}`);
console.log(`- Cleanup candidates: ${cleanupCandidates.length}`);
console.log(
  `- Deprecated path refs: ${pathPolicy.deprecatedLearning.length + pathPolicy.deprecatedCDrive.length}`,
);
console.log(`- Submodules: ${submodules.length}`);
console.log(
  `- Dirty worktree entries: ${gitStatusError ? 'unavailable' : dirtyEntries.length}`,
);
console.log(`- Graph source: ${graphSource}`);
console.log(`- Report: ${reportPath}`);

if (focus === 'cleanup') {
  console.log('\nCleanup Candidates');
  for (const candidate of cleanupCandidates.slice(0, 20)) {
    console.log(`- ${candidate.path} (${candidate.reason})`);
  }
  if (cleanupCandidates.length > 20) {
    console.log(`- ... and ${cleanupCandidates.length - 20} more`);
  }
}

if (issueCount > 0 && !reportOnly) {
  console.error('\nBlocking issues detected. See report for details.');
  process.exit(1);
}

if (reportOnly) {
  console.log('\nReport-only mode complete.');
} else {
  console.log('\nNo blocking synchronization issues detected.');
}
