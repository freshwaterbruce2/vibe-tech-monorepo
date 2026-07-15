#!/usr/bin/env node
// Fails if any workspace manifest hardcodes a version for a dependency that is
// defined in the pnpm `catalog:` — those must be referenced as `catalog:`.
// Complements `catalogMode: strict` (which only governs `pnpm add`) by catching
// hand-edited package.json drift. Wire into CI / pre-commit.
//
// Usage: node scripts/check-catalog-drift.mjs   (exit 1 on drift)

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ROOTS = ['apps', 'packages', 'backend', 'tools', 'plugins'];
const SKIP = ['node_modules', 'dist', 'build', '.nx', '.git', '.claude'];
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const PASSTHROUGH = ['catalog:', 'workspace:', 'link:', 'file:', 'npm:'];

/** Parse the default `catalog:` block of pnpm-workspace.yaml into a name set. */
function readCatalogNames() {
  const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const names = new Set();
  let inCatalog = false;
  for (const line of yaml.split(/\r?\n/)) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true;
      continue;
    }
    if (inCatalog) {
      if (/^\S/.test(line)) break; // dedent -> end of block
      const m = line.match(/^\s+'?([^':]+)'?\s*:/);
      if (m) names.add(m[1]);
    }
  }
  return names;
}

/** Recursively collect package.json paths under the given roots + repo root. */
function findManifests() {
  const found = [join(ROOT, 'package.json')];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP.includes(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry === 'package.json') found.push(full);
    }
  };
  for (const r of ROOTS) {
    const base = join(ROOT, r);
    try {
      if (statSync(base).isDirectory()) walk(base);
    } catch {
      /* absent */
    }
  }
  return found;
}

const catalogNames = readCatalogNames();
const violations = [];
for (const file of findManifests()) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (!catalogNames.has(name)) continue;
      if (PASSTHROUGH.some((p) => String(spec).startsWith(p))) continue;
      violations.push(`${relative(ROOT, file)} :: ${field}.${name} = "${spec}"`);
    }
  }
}

if (violations.length > 0) {
  console.error('Catalog drift — these must be "catalog:" (see pnpm-workspace.yaml):');
  for (const v of violations) console.error(`  ${v}`);
  console.error(`\n${violations.length} violation(s). Fix by setting the specifier to "catalog:".`);
  process.exit(1);
}
console.log(`Catalog OK — ${catalogNames.size} cataloged deps, no drift across manifests.`);
