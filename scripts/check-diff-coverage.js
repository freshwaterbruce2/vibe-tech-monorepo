#!/usr/bin/env node

/**
 * Diff Coverage Gate — enforces 100% test coverage on NEW / CHANGED code.
 *
 * Policy (see .claude/rules/testing-strategy.md): every executable line a commit
 * ADDS or MODIFIES in application/library source must be covered by a test.
 * Legacy untouched code is grandfathered — the gate only inspects staged
 * additions, so it never retroactively blocks files you didn't touch.
 *
 * How it works:
 *   1. Reads the staged file list (passed as argv by the pre-commit hook).
 *   2. Keeps only in-scope product source: apps/<p>/.../src, packages/<p>/.../src,
 *      backend/.../src — excluding tests, .d.ts, configs, generated code.
 *   3. For each file, derives the ADDED line numbers from `git diff --cached -U0`.
 *   4. Loads per-project Istanbul coverage (coverage-final.json) produced by the
 *      preceding `nx affected -t test:coverage` run.
 *   5. Fails if any added executable line is uncovered, or if an in-scope file
 *      with executable additions has no coverage report at all (= no test).
 *
 * Usage:
 *   node scripts/check-diff-coverage.js <file> [<file> ...]
 *
 * Escape hatches:
 *   COVERAGE_GATE=off   — skip entirely (incremental rollout / emergencies)
 *   git commit --no-verify — bypass all pre-commit gates
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

// Legacy projects grandfathered out of the 100% diff-coverage gate.
// These pre-date the coverage policy and are migrated incrementally.
const LEGACY_PROJECTS = new Set([
	"apps/nova-agent",
]);

function isLegacyProject(rel) {
	for (const legacy of LEGACY_PROJECTS) {
		if (rel === legacy || rel.startsWith(`${legacy}/`)) return true;
	}
	return false;
}

// Extensions that can carry executable, coverable code.
const COVERABLE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// Paths never subject to the coverage gate (mirror of validate-file-size.js plus
// coverage-config excludes: type-only files, configs, setup/test scaffolding).
const EXCLUDE_PATTERNS = [
	/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i,
	/(^|\/)(__tests__|tests|e2e)\//i,
	/(^|\/)__mocks__\//i,
	/(^|\/)migrations\//i,
	/(^|\/)generated\//i,
	/(^|\/)\.prisma\//i,
	/\.d\.ts$/i,
	/\.gen\.ts$/i,
	/\.generated\./i,
	/(^|\/)vendor\//i,
	/\.config\.[cm]?[jt]s$/i, // *.config.ts / vite.config.mts / eslint.config.js ...
	/(^|\/)types\.ts$/i, // type-only modules (coverage-excluded by convention)
	/\.types\.ts$/i,
	/(^|\/)test\//i, // src/test/ setup helpers
	/(^|\/)__fixtures__\//i,
	/^plugins\/factory\/src\/generators\/.+\/files\//i,
];

function isExcluded(rel) {
	return EXCLUDE_PATTERNS.some((re) => re.test(rel));
}

/**
 * In scope = product source under an app/package/backend `src/` tree.
 * Tooling (scripts/, tools/), root configs, and test files are out of scope.
 */
function isInScope(rel) {
	if (!COVERABLE_EXT.has(path.extname(rel).toLowerCase())) return false;
	if (isExcluded(rel)) return false;
	const productRoot =
		/^(apps|packages)\/[^/]+\/(.*\/)?src\//.test(rel) || /^backend\/(.*\/)?src\//.test(rel);
	return productRoot;
}

/** Added (new-file) line numbers for a staged file, from a zero-context diff. */
function addedLines(rel) {
	let out;
	try {
		out = execFileSync(
			"git",
			["diff", "--cached", "--unified=0", "--no-color", "--", rel],
			{ cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
		);
	} catch {
		return new Set();
	}
	const lines = new Set();
	const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
	for (const line of out.split("\n")) {
		const m = hunk.exec(line);
		if (!m) continue;
		const start = parseInt(m[1], 10);
		const count = m[2] === undefined ? 1 : parseInt(m[2], 10);
		for (let i = 0; i < count; i++) lines.add(start + i);
	}
	return lines;
}

/** Cheap "does this added line look executable?" check for the no-report case. */
function looksExecutable(text) {
	const t = text.trim();
	if (!t) return false;
	if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("*/")) return false;
	if (/^[{}()[\],;]+$/.test(t)) return false; // lone punctuation
	if (/^import\b/.test(t) || /^export\s+(type|interface|\*|\{)/.test(t)) return false;
	if (/^(type|interface)\b/.test(t)) return false;
	if (/^export\s+default\s*$/.test(t)) return false;
	return true;
}

function rawAddedLineText(rel) {
	// Map of new-line-number -> source text, for the no-coverage heuristic.
	const map = new Map();
	let out;
	try {
		out = execFileSync(
			"git",
			["diff", "--cached", "--unified=0", "--no-color", "--", rel],
			{ cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
		);
	} catch {
		return map;
	}
	const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
	let cur = 0;
	for (const line of out.split("\n")) {
		const m = hunk.exec(line);
		if (m) {
			cur = parseInt(m[1], 10);
			continue;
		}
		if (line.startsWith("+") && !line.startsWith("+++")) {
			map.set(cur, line.slice(1));
			cur++;
		}
	}
	return map;
}

function normalizeKey(absPath) {
	return path.resolve(absPath).split(path.sep).join("/").toLowerCase();
}

/** Discover coverage-final.json reports written by `vitest run --coverage`. */
function findCoverageReports() {
	const candidates = [];
	const scanDirs = ["apps", "packages"];
	for (const base of scanDirs) {
		const baseAbs = path.join(ROOT, base);
		if (!fs.existsSync(baseAbs)) continue;
		for (const entry of fs.readdirSync(baseAbs, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			candidates.push(path.join(baseAbs, entry.name, "coverage", "coverage-final.json"));
			candidates.push(path.join(baseAbs, entry.name, "frontend", "coverage", "coverage-final.json"));
		}
	}
	candidates.push(path.join(ROOT, "backend", "coverage", "coverage-final.json"));
	candidates.push(path.join(ROOT, "coverage", "coverage-final.json"));
	return candidates.filter((c) => fs.existsSync(c));
}

/**
 * Build covered/executable line sets per source file from all coverage reports.
 * Istanbul JSON: { [file]: { statementMap: {id:{start:{line}}}, s:{id:count} } }.
 */
function loadCoverage(reports) {
	const byFile = new Map(); // key -> { executable:Set<number>, covered:Set<number> }
	for (const report of reports) {
		let json;
		try {
			json = JSON.parse(fs.readFileSync(report, "utf8"));
		} catch {
			continue;
		}
		for (const entry of Object.values(json)) {
			if (!entry || !entry.path || !entry.statementMap || !entry.s) continue;
			const key = normalizeKey(entry.path);
			let rec = byFile.get(key);
			if (!rec) {
				rec = { executable: new Set(), covered: new Set() };
				byFile.set(key, rec);
			}
			for (const [id, loc] of Object.entries(entry.statementMap)) {
				const line = loc?.start?.line;
				if (!Number.isInteger(line)) continue;
				rec.executable.add(line);
				if ((entry.s[id] ?? 0) > 0) rec.covered.add(line);
			}
		}
	}
	return byFile;
}

function main() {
	if (process.env.COVERAGE_GATE === "off") {
		console.log("Diff coverage gate skipped (COVERAGE_GATE=off).");
		return 0;
	}

	const staged = process.argv.slice(2).map((f) => f.replace(/\\/g, "/"));
	const targets = staged.filter(isInScope);

	const legacyTargets = targets.filter(isLegacyProject);
	const activeTargets = targets.filter((t) => !isLegacyProject(t));

	if (legacyTargets.length > 0) {
		console.log(
			`Diff coverage: skipping ${legacyTargets.length} legacy project file(s) (${[...new Set(legacyTargets.map((t) => t.split("/").slice(0, 2).join("/")))].join(", ")}).`,
		);
	}

	if (activeTargets.length === 0) {
		console.log("Diff coverage: no in-scope source changes.");
		return 0;
	}

	const coverage = loadCoverage(findCoverageReports());
	const violations = [];

	for (const rel of activeTargets) {
		const added = addedLines(rel);
		if (added.size === 0) continue;

		const rec = coverage.get(normalizeKey(path.join(ROOT, rel)));

		if (!rec) {
			// No coverage report includes this file -> likely no test exercises it.
			// Only flag when the additions actually contain executable-looking code.
			const texts = rawAddedLineText(rel);
			const execAdds = [...added].filter((ln) => looksExecutable(texts.get(ln) ?? ""));
			if (execAdds.length > 0) {
				violations.push({
					file: rel,
					reason: "no coverage report — add a test that exercises this file",
					lines: execAdds.slice(0, 20),
				});
			}
			continue;
		}

		const uncovered = [...added]
			.filter((ln) => rec.executable.has(ln) && !rec.covered.has(ln))
			.sort((a, b) => a - b);

		if (uncovered.length > 0) {
			violations.push({
				file: rel,
				reason: "added lines not covered by any test",
				lines: uncovered,
			});
		}
	}

	if (violations.length === 0) {
		console.log(`Diff coverage: 100% on ${targets.length} changed source file(s).`);
		return 0;
	}

	console.error("\nDiff coverage gate FAILED — new/changed code must be 100% covered:\n");
	for (const v of violations) {
		console.error(`  ${v.file}`);
		console.error(`    ${v.reason}`);
		console.error(`    line(s): ${v.lines.join(", ")}${v.lines.length >= 20 ? " …" : ""}`);
	}
	console.error("\n  Fix: add/extend tests so the lines above execute, then re-stage and commit.");
	console.error("  Rollout/emergency escape: COVERAGE_GATE=off  (or git commit --no-verify)\n");
	return 1;
}

process.exit(main());
