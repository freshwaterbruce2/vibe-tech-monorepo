#!/usr/bin/env node
// Resolves the set of Nx projects "directly" touched by source-file changes
// between two refs. This is the single source of truth for CI's Quality
// Gates project-selection logic AND the local parity gate (ci-local.mjs /
// pre-push hook) — keeping them as one script is what makes "green locally"
// mean "green in CI".
//
// Usage: node scripts/select-changed-projects.mjs [--base <ref>] [--head <ref>]
// Prints a comma-separated project list (possibly empty) to stdout.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const OWNER_ROOTS = ['apps', 'packages', 'plugins', 'backend', 'tools'];
const SKIP = ['node_modules', 'dist', 'build', '.vercel'];
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const OWNED_PATH = /^(apps|packages|plugins|backend|tools)\//;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

function changedFiles(base, head) {
  const out = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((f) => OWNED_PATH.test(f) && SOURCE_EXT.test(f));
}

function walkProjects(dir, projects) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkProjects(full, projects);
    } else if (entry === 'project.json') {
      const project = JSON.parse(readFileSync(full, 'utf8'));
      if (!project.name) continue;
      const root = relative(ROOT, join(full, '..')).replace(/\\/g, '/');
      projects.push({ name: project.name, root });
    }
  }
}

function findProjects() {
  const projects = [];
  for (const r of OWNER_ROOTS) {
    const base = join(ROOT, r);
    try {
      if (statSync(base).isDirectory()) walkProjects(base, projects);
    } catch {
      /* root absent */
    }
  }
  // Deepest root first, so a nested project wins over an ancestor project.
  return projects.sort((a, b) => b.root.length - a.root.length);
}

function ownerOf(file, projects) {
  return projects.find((p) => file === p.root || file.startsWith(`${p.root}/`));
}

function main() {
  const base = arg('--base', 'origin/main');
  const head = arg('--head', 'HEAD');
  const files = changedFiles(base, head);

  if (files.length === 0) {
    process.stdout.write('');
    return;
  }

  const projects = findProjects();
  const names = new Set();
  for (const file of files) {
    const owner = ownerOf(file, projects);
    if (owner) names.add(owner.name);
  }

  process.stdout.write([...names].sort().join(','));
}

main();
