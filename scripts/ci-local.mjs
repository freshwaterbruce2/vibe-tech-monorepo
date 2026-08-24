#!/usr/bin/env node
// Local equivalent of the CI "Quality Gates" job: same project-selection
// script (select-changed-projects.mjs), same nx targets, same skip rules.
// A green run here should predict a green Quality Gates check on GitHub.
// Used by `pnpm run ci:local` and the pre-push hook (scripts/pre-push.ps1).
//
// Usage: node scripts/ci-local.mjs [--base <ref>] [--head <ref>]

import { execSync } from 'node:child_process';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function projectsWithTarget(target, projectList) {
  return execSync(
    `pnpm nx show projects --withTarget ${target} --projects "${projectList}" --sep=","`,
    { encoding: 'utf8' },
  ).trim();
}

function gateTarget(target, projectList, extraFlags = '') {
  const projects = projectsWithTarget(target, projectList);
  if (!projects) {
    console.log(`${target}: skipped (no gated projects expose this target)`);
    return;
  }
  run(
    `pnpm nx run-many -t ${target} --projects="${projects}" --parallel=2 --outputStyle=static${extraFlags}`,
  );
}

function main() {
  const base = arg('--base', 'origin/main');
  const head = arg('--head', 'HEAD');

  run('pnpm run ci:sync');

  const projectList = execSync(
    `node scripts/select-changed-projects.mjs --base ${base} --head ${head}`,
    { encoding: 'utf8' },
  ).trim();

  if (!projectList) {
    console.log('\nNo project-owned source changes; ci:local has nothing to gate.');
    return;
  }

  console.log(`\nGating directly changed Nx projects: ${projectList}`);
  gateTarget('lint', projectList);
  gateTarget('typecheck', projectList);
  // Excludes vibe-justice: its `test` target needs a Python toolchain not
  // provided here — see .github/workflows/ci.yml's "Test (affected)" step.
  gateTarget('test', projectList, ' --exclude=vibe-justice');

  console.log('\nci:local passed — this matches what CI Quality Gates will check.');
}

try {
  main();
} catch (err) {
  console.error(`\nci:local FAILED: ${err.message}`);
  process.exit(1);
}
