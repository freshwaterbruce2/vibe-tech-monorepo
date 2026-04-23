#!/usr/bin/env node
/**
 * AI Code Review — Local Quality Gate
 *
 * A solo-developer substitute for CI-based code review bots.
 * Runs 5 phases of quality checks and produces a structured verdict.
 *
 * Usage:
 *   pnpm review              # Review staged files only
 *   pnpm review:all          # Review entire workspace
 *   pnpm review:strict       # Heuristics become blocking
 *
 * Exit codes:
 *   0 = All phases passed
 *   1 = Blocking failure(s)
 *   2 = Passed with warnings
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';

// ─── CLI Flags ───────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = args.includes('--all') ? 'all' : 'staged';
const STRICT_HEURISTICS = args.includes('--strict-heuristics');
const SKIP_PHASE = new Set(
  args.filter((a) => a.startsWith('--skip=')).map((a) => a.replace('--skip=', '')),
);

// ─── Helpers ─────────────────────────────────────────────────
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const NX = 'node ./node_modules/nx/bin/nx.js';

function heading(text) {
  console.log(`\n${BOLD}${CYAN}━━━ ${text} ━━━${RESET}`);
}

function pass(msg) {
  console.log(`  ${GREEN}✔${RESET} ${msg}`);
}

function fail(msg) {
  console.log(`  ${RED}✘${RESET} ${msg}`);
}

function warn(msg) {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
}

function info(msg) {
  console.log(`  ${DIM}${msg}${RESET}`);
}

function timer() {
  const start = performance.now();
  return () => ((performance.now() - start) / 1000).toFixed(2);
}

function run(cmd, opts = {}) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: opts.capture ? 'pipe' : ['pipe', 'pipe', 'pipe'],
      timeout: opts.timeout ?? 120_000,
      ...opts,
    });
    return { ok: true, output: output ?? '', code: 0 };
  } catch (err) {
    return {
      ok: false,
      output: (err.stdout ?? '') + (err.stderr ?? ''),
      code: err.status ?? 1,
    };
  }
}

function getStagedFiles() {
  const result = run('git diff --cached --name-only --diff-filter=ACM', { capture: true });
  if (!result.ok) return [];
  return result.output
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
}

function getAllTrackedFiles() {
  const result = run('git ls-files', { capture: true });
  if (!result.ok) return [];
  return result.output
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
}

function getStagedSourceFiles() {
  return getStagedFiles().filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
}

function runNxTarget(target, files = []) {
  if (MODE === 'staged') {
    if (files.length === 0) {
      return { ok: true, output: '', code: 0 };
    }
    const fileList = files.join(',');
    return run(`${NX} affected -t ${target} --files="${fileList}" --output-style=static`, {
      capture: true,
      timeout: 300_000,
    });
  }

  return run(`${NX} run-many -t ${target} --all --output-style=static`, {
    capture: true,
    timeout: 300_000,
  });
}

// ─── Phase Results Collector ─────────────────────────────────
const results = [];

function phaseResult(name, status, duration, details = '') {
  results.push({ name, status, duration, details });
}

// ─── Phase 1: Biome Format Check ─────────────────────────────
function phaseBiomeFormat() {
  if (SKIP_PHASE.has('biome')) {
    phaseResult('Biome Format', 'skipped', '0.00');
    return;
  }
  heading('Phase 1 · Biome Format Check');
  const elapsed = timer();

  // Biome 2.x: `biome format .` exits non-zero if files need formatting
  // Use --staged for staged mode to scope the check
  const cmd = MODE === 'staged' ? 'npx biome format --staged' : 'npx biome format .';
  const result = run(cmd, { capture: true });

  if (result.ok) {
    pass('All files correctly formatted');
    phaseResult('Biome Format', 'pass', elapsed());
  } else {
    const lines = result.output.split('\n').filter((l) => l.trim().length > 0);
    const fileCount = lines.filter((l) => /^(Formatter|\s)/.test(l)).length || lines.length;
    fail(`${fileCount || 'Some'} formatting issue(s) found`);
    info('Run: pnpm format   to auto-fix');
    phaseResult('Biome Format', 'fail', elapsed(), `${fileCount} issues`);
  }
}

// ─── Phase 2: ESLint Strict ──────────────────────────────────
function phaseEslintStrict() {
  if (SKIP_PHASE.has('eslint')) {
    phaseResult('ESLint Strict', 'skipped', '0.00');
    return;
  }
  heading('Phase 2 · ESLint Strict (--max-warnings 0)');
  const elapsed = timer();

  let cmd;
  if (MODE === 'staged') {
    const staged = getStagedSourceFiles();
    if (staged.length === 0) {
      pass('No staged JS/TS files to lint');
      phaseResult('ESLint Strict', 'pass', elapsed());
      return;
    }
    cmd = staged;
  }

  const result = runNxTarget('lint', cmd ?? []);

  if (result.ok) {
    pass('Zero warnings, zero errors');
    phaseResult('ESLint Strict', 'pass', elapsed());
  } else {
    const lines = result.output.split('\n');
    const summaryLine = lines.find((l) => /\d+ problems?/.test(l)) ?? '';
    fail(summaryLine || 'ESLint found issues');
    info('Run: pnpm lint:fix   for auto-fixable issues');
    phaseResult('ESLint Strict', 'fail', elapsed(), summaryLine);
  }
}

// ─── Phase 3: TypeScript Strict ──────────────────────────────
function phaseTypescriptStrict() {
  if (SKIP_PHASE.has('typecheck')) {
    phaseResult('TypeScript Strict', 'skipped', '0.00');
    return;
  }
  heading('Phase 3 · TypeScript Strict (tsc --noEmit)');
  const elapsed = timer();

  const staged = getStagedSourceFiles();
  if (MODE === 'staged' && staged.length === 0) {
    pass('No staged JS/TS files to typecheck');
    phaseResult('TypeScript Strict', 'pass', elapsed());
    return;
  }

  const result = runNxTarget('typecheck', staged);

  if (result.ok) {
    pass('Zero type errors');
    phaseResult('TypeScript Strict', 'pass', elapsed());
  } else {
    const errorLines = result.output.split('\n').filter((l) => l.includes('error TS'));
    const errorCount = errorLines.length;
    fail(`${errorCount} type error(s) found`);
    // Show first 5 errors for context
    errorLines.slice(0, 5).forEach((l) => info(l.trim()));
    if (errorCount > 5) info(`  ... and ${errorCount - 5} more`);
    phaseResult('TypeScript Strict', 'fail', elapsed(), `${errorCount} errors`);
  }
}

// ─── Phase 4: Line Limits ────────────────────────────────────
function phaseLineLimits() {
  if (SKIP_PHASE.has('lines')) {
    phaseResult('Line Limits', 'skipped', '0.00');
    return;
  }
  heading('Phase 4 · Line Limits (360 max)');
  const elapsed = timer();

  const flag = MODE === 'all' ? '--all' : '--staged';
  const result = run(`node scripts/check-line-limits.mjs ${flag} --max 360`, {
    capture: true,
  });

  if (result.ok) {
    pass('All files within 360-line limit');
    phaseResult('Line Limits', 'pass', elapsed());
  } else {
    const offenders = result.output
      .split('\n')
      .filter((l) => l.trim().startsWith('-'))
      .map((l) => l.trim());
    fail(`${offenders.length || 'Some'} file(s) exceed line limit`);
    offenders.slice(0, 5).forEach((l) => info(l));
    if (offenders.length > 5) info(`  ... and ${offenders.length - 5} more`);
    phaseResult('Line Limits', 'fail', elapsed(), `${offenders.length} offenders`);
  }
}

// ─── Phase 5: Custom Heuristics ──────────────────────────────
function phaseHeuristics() {
  if (SKIP_PHASE.has('heuristics')) {
    phaseResult('Heuristics', 'skipped', '0.00');
    return;
  }
  heading('Phase 5 · Custom Heuristics');
  const elapsed = timer();

  const files = MODE === 'all' ? getAllTrackedFiles() : getStagedFiles();

  const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
  const IGNORE_PATHS = ['node_modules', 'dist', 'build', '.nx', 'coverage', '.turbo', '__pycache__'];

  const sourceFiles = files.filter((f) => {
    const ext = extname(f).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) return false;
    if (IGNORE_PATHS.some((p) => f.includes(p))) return false;
    return true;
  });

  const findings = [];

  for (const file of sourceFiles) {
    const abs = resolve(file);
    if (!existsSync(abs)) continue;

    const stat = statSync(abs);
    if (stat.size > 500_000) continue; // skip huge files

    const content = readFileSync(abs, 'utf8');
    const lines = content.split(/\r?\n/);
    const isTest =
      file.includes('.test.') ||
      file.includes('.spec.') ||
      file.includes('__tests__') ||
      file.includes('/test/');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // 1. console.log in non-test source files
      if (!isTest && /\bconsole\.log\b/.test(line) && !/\/\/\s*eslint-disable/.test(line)) {
        findings.push({
          file,
          line: lineNum,
          rule: 'no-console-log',
          msg: 'console.log in source code',
          severity: 'warn',
        });
      }

      // 2. TODO without ticket reference
      if (/\/\/\s*TODO(?!\s*[\[(][\w-]+[\])])/.test(line) && !/TODO\s*\(/.test(line)) {
        findings.push({
          file,
          line: lineNum,
          rule: 'todo-needs-ticket',
          msg: 'TODO without ticket reference (use TODO(TICKET-123) format)',
          severity: 'warn',
        });
      }

      // 3. Hardcoded localhost URLs (not in test/config)
      if (
        !isTest &&
        !file.includes('.config.') &&
        !file.includes('.env') &&
        /https?:\/\/localhost[:/]/.test(line)
      ) {
        findings.push({
          file,
          line: lineNum,
          rule: 'no-hardcoded-localhost',
          msg: 'Hardcoded localhost URL — use environment variable',
          severity: 'warn',
        });
      }

      // 4. Explicit `any` type annotation (catches what ESLint may miss with relaxed rules)
      if (
        !isTest &&
        /:\s*any\b/.test(line) &&
        !/\/\/\s*eslint-disable/.test(line) &&
        !/as\s+any/.test(line)
      ) {
        findings.push({
          file,
          line: lineNum,
          rule: 'no-explicit-any',
          msg: 'Explicit `any` type — prefer a specific type',
          severity: 'warn',
        });
      }

      // 5. Sensitive patterns (API keys, tokens)
      if (
        /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(line) &&
        !file.includes('.example') &&
        !file.includes('.test.')
      ) {
        findings.push({
          file,
          line: lineNum,
          rule: 'no-hardcoded-secret',
          msg: 'Possible hardcoded secret — use environment variable',
          severity: 'error',
        });
      }
    }
  }

  if (findings.length === 0) {
    pass('No heuristic issues found');
    phaseResult('Heuristics', 'pass', elapsed());
    return;
  }

  // Group by severity
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warn');

  // Display
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, items] of byFile) {
    console.log(`\n  ${DIM}${file}${RESET}`);
    for (const item of items) {
      const icon = item.severity === 'error' ? `${RED}✘` : `${YELLOW}⚠`;
      console.log(
        `    ${icon}${RESET} L${item.line}: ${item.msg} ${DIM}(${item.rule})${RESET}`,
      );
    }
  }

  const hasErrors = errors.length > 0;
  const blocking = STRICT_HEURISTICS ? findings.length > 0 : hasErrors;

  console.log('');
  if (hasErrors) {
    fail(`${errors.length} error(s), ${warnings.length} warning(s)`);
  } else {
    warn(`${warnings.length} warning(s) — non-blocking`);
  }

  phaseResult(
    'Heuristics',
    blocking ? 'fail' : 'warn',
    elapsed(),
    `${errors.length} errors, ${warnings.length} warnings`,
  );
}

// ─── Main ────────────────────────────────────────────────────
console.log(
  `\n${BOLD}${MAGENTA}╔══════════════════════════════════════════╗${RESET}`,
);
console.log(
  `${BOLD}${MAGENTA}║       🔍 AI CODE REVIEW — LOCAL GATE     ║${RESET}`,
);
console.log(
  `${BOLD}${MAGENTA}╚══════════════════════════════════════════╝${RESET}`,
);
info(`Mode: ${MODE === 'all' ? 'Full workspace' : 'Staged files only'}`);
info(`Strict heuristics: ${STRICT_HEURISTICS ? 'ON' : 'OFF'}`);
info(`Time: ${new Date().toLocaleString()}`);

const totalTimer = timer();

// Run all phases
phaseBiomeFormat();
phaseEslintStrict();
phaseTypescriptStrict();
phaseLineLimits();
phaseHeuristics();

// ─── Verdict ─────────────────────────────────────────────────
const totalTime = totalTimer();

console.log(`\n${BOLD}${CYAN}━━━ REVIEW SUMMARY ━━━${RESET}\n`);

const maxNameLen = Math.max(...results.map((r) => r.name.length));

for (const r of results) {
  const icon =
    r.status === 'pass'
      ? `${GREEN}✔ PASS${RESET}`
      : r.status === 'fail'
        ? `${RED}✘ FAIL${RESET}`
        : r.status === 'warn'
          ? `${YELLOW}⚠ WARN${RESET}`
          : `${DIM}⊘ SKIP${RESET}`;
  const name = r.name.padEnd(maxNameLen);
  const time = `${DIM}${r.duration}s${RESET}`;
  const detail = r.details ? `  ${DIM}${r.details}${RESET}` : '';
  console.log(`  ${icon}  ${name}  ${time}${detail}`);
}

const failures = results.filter((r) => r.status === 'fail');
const warnings = results.filter((r) => r.status === 'warn');

console.log(`\n  ${DIM}Total time: ${totalTime}s${RESET}\n`);

if (failures.length > 0) {
  console.log(
    `${BOLD}${RED}  ❌ CHANGES REQUESTED — ${failures.length} phase(s) failed${RESET}`,
  );
  console.log(`${DIM}  Fix the issues above before pushing.${RESET}\n`);
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(
    `${BOLD}${YELLOW}  ⚠️  APPROVED WITH WARNINGS — ${warnings.length} non-blocking issue(s)${RESET}`,
  );
  console.log(`${DIM}  Consider addressing warnings before pushing.${RESET}\n`);
  process.exit(2);
} else {
  console.log(`${BOLD}${GREEN}  ✅ APPROVED — Ready to push to GitHub${RESET}\n`);
  process.exit(0);
}
