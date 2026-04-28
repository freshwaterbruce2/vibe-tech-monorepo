#!/usr/bin/env node
/**
 * Checks staged (default) or all tracked files for line counts over a limit.
 * Default: staged files, 500 lines +/- 100 max.
 *
 * Usage:
 *   node scripts/check-line-limits.mjs --staged --max 600
 *   node scripts/check-line-limits.mjs --all --max 600
 *   node scripts/check-line-limits.mjs --all --include-untracked --max 500 --path apps/nova-agent/src-tauri/src --include-ext .rs
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const mode = args.includes('--all') ? 'all' : 'staged';
const maxIndex = args.findIndex((a) => a === '--max');
const max = maxIndex !== -1 && args[maxIndex + 1] ? Number.parseInt(args[maxIndex + 1], 10) : 600;
const pathIndex = args.findIndex((a) => a === '--path');
const pathFilter = pathIndex !== -1 && args[pathIndex + 1] ? normalizePath(args[pathIndex + 1]) : null;
const includeUntracked = args.includes('--include-untracked');
const includeExtIndex = args.findIndex((a) => a === '--include-ext');
const includeExts =
  includeExtIndex !== -1 && args[includeExtIndex + 1]
    ? args[includeExtIndex + 1]
        .split(',')
        .map((ext) => ext.trim().toLowerCase())
        .filter(Boolean)
        .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
    : [];

if (!Number.isFinite(max) || max <= 0) {
  console.error('❌ Invalid max lines value.');
  process.exit(1);
}

const allowedExt = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.sass',
  '.ps1',
  '.py',
  '.cs',
]);

for (const ext of includeExts) {
  allowedExt.add(ext);
}

const ignoreFragments = [
  'node_modules',
  '.turbo',
  '.nx',
  'dist',
  'build',
  'coverage',
  '.git',
  '.vite-cache',
];

function listFiles() {
  const cmd = mode === 'all' ? 'git ls-files' : 'git diff --cached --name-only --diff-filter=ACM';
  try {
    const files = execSync(cmd, { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (includeUntracked) {
      const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return [...new Set([...files, ...untracked])];
    }
    return files;
  } catch (err) {
    console.error('❌ Failed to list files. Ensure git is available.', err?.message || err);
    process.exit(1);
  }
}

function hasIgnoredPath(file) {
  return ignoreFragments.some((fragment) => file.includes(fragment));
}

function hasAllowedExt(file) {
  const dot = file.lastIndexOf('.');
  if (dot === -1) return false;
  return allowedExt.has(file.slice(dot).toLowerCase());
}

function normalizePath(file) {
  return file.replaceAll('\\', '/').replace(/\/+$/, '');
}

function isUnderPathFilter(file) {
  if (!pathFilter) return true;

  const normalized = normalizePath(file);
  const resolvedFile = normalizePath(resolve(file).split(sep).join('/'));
  const resolvedFilter = normalizePath(resolve(pathFilter).split(sep).join('/'));

  return (
    normalized === pathFilter ||
    normalized.startsWith(`${pathFilter}/`) ||
    resolvedFile === resolvedFilter ||
    resolvedFile.startsWith(`${resolvedFilter}/`)
  );
}

const files = listFiles()
  .filter((file) => isUnderPathFilter(file))
  .filter((file) => hasAllowedExt(file))
  .filter((file) => !hasIgnoredPath(file));

if (files.length === 0) {
  console.log('✅ No relevant files to check.');
  process.exit(0);
}

const offenders = [];

for (const file of files) {
  const abs = resolve(file);
  if (!existsSync(abs)) continue;

  const size = statSync(abs).size;
  // Skip extremely large files to avoid slow hooks; adjust if needed.
  if (size > 1_500_000) continue;

  const content = readFileSync(abs, 'utf8');
  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > max) {
    offenders.push({ file, lineCount });
  }
}

if (offenders.length > 0) {
  console.error(`❌ ${offenders.length} file(s) exceed ${max} lines:`);
  offenders
    .sort((a, b) => b.lineCount - a.lineCount)
    .forEach(({ file, lineCount }) => {
      console.error(` - ${file} (${lineCount} lines)`);
    });
  console.error(
    'Split large files into smaller modules/components to stay within the 500 lines +/- 100 target.',
  );
  process.exit(1);
}

console.log(`✅ All checked files are within ${max} lines.`);
