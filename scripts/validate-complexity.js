#!/usr/bin/env node

/**
 * Cyclomatic Complexity Validation (cross-language backstop)
 *
 * The complexity companion to validate-file-size.js. Enforces a single
 * cyclomatic-complexity cap (CCN <= 15) using real parsers, not a hand-rolled
 * one:
 *   - JS/TS  -> the `complexity` rule in eslint.config.js (runs in the main
 *              pre-commit lint step; NOT re-run here — avoids a second, slow
 *              ESLint cold-start per commit).
 *   - .py/.rs/other backend langs -> Lizard (`pip install lizard`), invoked here.
 *
 * This script owns ONE cross-language grandfathering baseline
 * (complexity-baseline.json) for the Lizard languages. The model mirrors the
 * ESLint bulk-suppressions baseline exactly: a per-file COUNT of functions over
 * the cap is frozen. Existing debt passes; a NEW over-cap function in the same
 * file raises the count above the baseline and fails. Counts only ever shrink
 * (`--prune`), never grow — matching the "shrink, never grow" rule in
 * .claude/rules/code-size-limits.md.
 *
 * Usage:
 *   node scripts/validate-complexity.js                 # walk the whole tree, enforce
 *   node scripts/validate-complexity.js <file> [<file>] # check only given files
 *                                                       # (pre-commit passes staged list)
 *   node scripts/validate-complexity.js --update-baseline  # (re)seed baseline = current
 *   node scripts/validate-complexity.js --prune            # lower counts where improved
 *
 * If Lizard is not installed, the gate SKIPS with a loud warning rather than
 * blocking every commit (a missing dev tool must not wedge the repo). Install it
 * with `pip install lizard` to activate the gate.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const CCN_THRESHOLD = 15;
const BASELINE_FILE = "complexity-baseline.json";

// Languages handled HERE via Lizard. JS/TS are intentionally absent — ESLint's
// `complexity` rule owns them (accurate AST, already runs in the lint step).
const LIZARD_EXTENSIONS = new Set([
	".py",
	".rs",
	".java",
	".cs",
	".cpp",
	".cc",
	".c",
	".rb",
	".php",
	".kt",
	".swift",
	".scala",
	".lua",
	".go",
]);

// Roots walked in whole-tree / baseline modes.
const SCAN_ROOTS = ["apps", "packages", "backend"];

// Excluded paths (never subject to the cap). Matched against forward-slash
// relative paths. Kept in sync with validate-file-size.js EXCLUDE_PATTERNS,
// plus vendored Python envs that Lizard would otherwise crawl.
const EXCLUDE_PATTERNS = [
	/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|py|rs)$/i,
	/(^|\/)(__tests__|tests|e2e)\//i,
	/(^|\/)migrations\//i,
	/(^|\/)generated\//i,
	/(^|\/)\.prisma\//i,
	/(^|\/)vendor\//i,
	/(^|\/)\.venv\//i,
	/(^|\/)site-packages\//i,
	/(^|\/)__pycache__\//i,
	/(^|\/)node_modules\//i,
	/(^|\/)(dist|build|out|coverage|target|\.next|\.nx|\.turbo)\//i,
	/(^|\/)_(archived|backups)\//i,
];

function toRelPosix(filePath) {
	return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function isExcluded(relPosix) {
	return EXCLUDE_PATTERNS.some((p) => p.test(relPosix));
}

function isLizardFile(filePath) {
	return LIZARD_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function loadBaseline() {
	try {
		const raw = fs.readFileSync(BASELINE_FILE, "utf8");
		const parsed = JSON.parse(raw);
		return { threshold: parsed.threshold ?? CCN_THRESHOLD, files: parsed.files ?? {} };
	} catch {
		return { threshold: CCN_THRESHOLD, files: {} };
	}
}

function writeBaseline(files) {
	// Sort keys for a stable, review-friendly diff.
	const sorted = {};
	for (const key of Object.keys(files).sort()) {
		if (files[key] > 0) sorted[key] = files[key];
	}
	const payload = {
		$schema: "./complexity-baseline.schema.json",
		description:
			"Frozen per-file counts of functions over the CCN cap (Lizard langs only). " +
			"Shrinks via --prune; never grows. JS/TS complexity is enforced by ESLint.",
		threshold: CCN_THRESHOLD,
		files: sorted,
	};
	fs.writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + "\n");
	return Object.keys(sorted).length;
}

function lizardAvailable() {
	const probe = spawnSync("python", ["-m", "lizard", "--version"], {
		encoding: "utf8",
	});
	return probe.status === 0;
}

/**
 * Run Lizard over the given paths and return a Map<relPosixPath, count> of
 * functions exceeding the CCN threshold. `-w` prints one warning line per
 * over-cap function: "path:line: warning: name has ... N CCN ...".
 */
function runLizard(paths) {
	if (paths.length === 0) return new Map();

	const args = ["-m", "lizard", "-C", String(CCN_THRESHOLD), "-w", ...paths];
	const res = spawnSync("python", args, {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});

	const counts = new Map();
	const offenders = new Map(); // path -> [warning lines] for reporting
	const lines = (res.stdout || "").split(/\r?\n/);
	for (const line of lines) {
		const match = line.match(/^(.*?):(\d+): warning:/);
		if (!match) continue;
		const relPosix = match[1].split(path.sep).join("/").replace(/\\/g, "/");
		if (isExcluded(relPosix)) continue;
		counts.set(relPosix, (counts.get(relPosix) ?? 0) + 1);
		if (!offenders.has(relPosix)) offenders.set(relPosix, []);
		offenders.get(relPosix).push(line.trim());
	}
	return { counts, offenders };
}

function walkLizardFiles(dir, acc) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		const relPosix = toRelPosix(full);
		if (isExcluded(relPosix + "/") || isExcluded(relPosix)) continue;
		if (entry.isDirectory()) {
			walkLizardFiles(full, acc);
		} else if (entry.isFile() && isLizardFile(full)) {
			acc.push(relPosix);
		}
	}
}

function collectTargetFiles(fileArgs) {
	if (fileArgs.length > 0) {
		return fileArgs
			.map((f) => toRelPosix(path.resolve(process.cwd(), f)))
			.filter((rel) => isLizardFile(rel) && !isExcluded(rel))
			.filter((rel) => fs.existsSync(rel) && fs.statSync(rel).isFile());
	}
	const acc = [];
	for (const root of SCAN_ROOTS) {
		if (fs.existsSync(root)) walkLizardFiles(root, acc);
	}
	return acc;
}

// -------- main --------

const rawArgs = process.argv.slice(2);
const updateBaseline = rawArgs.includes("--update-baseline");
const prune = rawArgs.includes("--prune");
const fileArgs = rawArgs.filter((a) => !a.startsWith("--"));

console.log("🔍 Validating cyclomatic complexity (Lizard langs)...");
console.log(`📏 Cap: CCN <= ${CCN_THRESHOLD} | Baseline: ${BASELINE_FILE}\n`);

if (!lizardAvailable()) {
	console.log("⚠️  Lizard not found — complexity gate SKIPPED for .py/.rs/etc.");
	console.log("   Activate it with: pip install lizard\n");
	process.exit(0);
}

const targets = collectTargetFiles(fileArgs);
if (targets.length === 0) {
	console.log("✨ No Lizard-language files in scope.\n");
	process.exit(0);
}

const { counts, offenders } = runLizard(targets);

// --- baseline write modes ---
if (updateBaseline) {
	const current = {};
	for (const [file, count] of counts) current[file] = count;
	const n = writeBaseline(current);
	console.log(`✅ Baseline re-seeded: ${n} file(s) with grandfathered complexity debt.\n`);
	process.exit(0);
}

const baseline = loadBaseline();

if (prune) {
	const next = { ...baseline.files };
	let lowered = 0;
	for (const key of Object.keys(next)) {
		const cur = counts.get(key) ?? 0;
		if (cur < next[key]) {
			next[key] = cur;
			lowered++;
		}
	}
	const n = writeBaseline(next);
	console.log(`✅ Pruned baseline: lowered ${lowered} file(s); ${n} remain.\n`);
	process.exit(0);
}

// --- enforce ---
const violations = [];
for (const [file, current] of counts) {
	const allowed = baseline.files[file] ?? 0;
	if (current > allowed) {
		violations.push({ file, current, allowed, offenders: offenders.get(file) ?? [] });
	}
}

console.log(`✅ Checked ${targets.length} file(s)\n`);

if (violations.length === 0) {
	console.log(`✨ No new complexity over the CCN ${CCN_THRESHOLD} cap.\n`);
	process.exit(0);
}

console.log("❌ COMPLEXITY VIOLATIONS (new functions over the cap):");
console.log("═".repeat(64));
for (const v of violations) {
	const delta = v.current - v.allowed;
	console.log(`  ${v.file}`);
	console.log(`    ${v.current} over-cap fn(s), baseline allows ${v.allowed} (+${delta} new)`);
	for (const line of v.offenders) console.log(`      • ${line}`);
}
console.log("");
console.log(`🚫 ${violations.length} file(s) added functions over CCN ${CCN_THRESHOLD}.`);
console.log("   Simplify the function, or split its branches into helpers.");
console.log(`   (Intentional legacy debt: re-baseline with`);
console.log(`    'node scripts/validate-complexity.js --update-baseline'.)\n`);
process.exit(1);
