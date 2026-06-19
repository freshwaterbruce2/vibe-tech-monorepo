#!/usr/bin/env node

/**
 * File Size Validation Script
 *
 * Enforces the workspace line-count cap (500 +/- 100):
 *   - WARNING_THRESHOLD (500): file is approaching the limit, split soon.
 *   - MAX_LINES (600): hard cap, commit/build is rejected.
 *
 * Covers code that ESLint cannot lint (.py / .rs) and acts as a backstop for
 * JS/TS. Excluded paths (tests, generated code, vendored code) are never
 * subject to the cap — see EXCLUDE_PATTERNS.
 *
 * Usage:
 *   node scripts/validate-file-size.js                 # walk the whole tree
 *   node scripts/validate-file-size.js <file> [<file>] # check only the given files
 *                                                      # (used by the pre-commit hook
 *                                                      #  with the staged file list)
 */

import fs from "fs";
import path from "path";

const MAX_LINES = 600;
const WARNING_THRESHOLD = 500;

// File extensions to check (code only — JSON/YAML/MD are never counted).
const CODE_EXTENSIONS = [
	".js",
	".jsx",
	".ts",
	".tsx",
	".mjs",
	".cjs",
	".py",
	".java",
	".cpp",
	".c",
	".cs",
	".go",
	".rs",
	".swift",
	".kt",
	".rb",
	".php",
];

// Directories never walked.
const IGNORE_DIRS = [
	"node_modules",
	".git",
	"dist",
	"build",
	".turbo",
	".nx",
	"coverage",
	".next",
	"out",
	"vendor",
];

// Paths excluded from the cap. An excluded file may be any length.
// Matched against the forward-slash relative path.
const EXCLUDE_PATTERNS = [
	/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i, // unit/integration tests
	/(^|\/)(__tests__|tests|e2e)\//i, // test directories
	/(^|\/)migrations\//i, // generated DB migrations
	/(^|\/)generated\//i, // generated output dirs (e.g. prisma/generated)
	/(^|\/)\.prisma\//i, // prisma client output
	/\.d\.ts$/i, // type declarations
	/\.gen\.ts$/i, // generated code
	/\.generated\./i, // generated code
	/\.snap$/i, // test snapshots
	/(^|\/)vendor\//i, // vendored third-party code
	/(^|\/)eslint(\.base)?\.config\.[cm]?js$/i, // flat ESLint config (per-project overrides)
	/^plugins\/factory\/src\/generators\/.+\/files\//i, // scaffolding templates
];

const violations = [];
const warnings = [];
let checkedFiles = 0;

function toRelPosix(filePath) {
	return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function isExcluded(relativePosixPath) {
	return EXCLUDE_PATTERNS.some((pattern) => pattern.test(relativePosixPath));
}

function shouldCheckFile(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	return CODE_EXTENSIONS.includes(ext);
}

function shouldIgnoreDir(dirPath) {
	const dirName = path.basename(dirPath);
	return IGNORE_DIRS.includes(dirName) || dirName.startsWith(".");
}

function countLines(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf8");
		return content.split("\n").length;
	} catch (error) {
		console.error(`Error reading ${filePath}: ${error.message}`);
		return 0;
	}
}

function checkFile(filePath) {
	if (!shouldCheckFile(filePath)) return;

	const relativePath = toRelPosix(filePath);
	if (isExcluded(relativePath)) return;

	checkedFiles++;
	const lines = countLines(filePath);

	if (lines > MAX_LINES) {
		violations.push({
			file: relativePath,
			lines: lines,
			excess: lines - MAX_LINES,
		});
	} else if (lines > WARNING_THRESHOLD) {
		warnings.push({
			file: relativePath,
			lines: lines,
			remaining: MAX_LINES - lines,
		});
	}
}

function walkDirectory(dirPath) {
	if (shouldIgnoreDir(dirPath)) return;

	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);

			if (entry.isDirectory()) {
				walkDirectory(fullPath);
			} else if (entry.isFile()) {
				checkFile(fullPath);
			}
		}
	} catch (error) {
		console.error(`Error accessing ${dirPath}: ${error.message}`);
	}
}

// Main execution
console.log("🔍 Validating file sizes...\n");
console.log(`📏 Hard limit: ${MAX_LINES} lines | ⚠️  Warning at: ${WARNING_THRESHOLD} lines\n`);

const fileArgs = process.argv.slice(2);

if (fileArgs.length > 0) {
	// Scoped mode: check only the files passed in (e.g. staged files).
	for (const arg of fileArgs) {
		const fullPath = path.resolve(process.cwd(), arg);
		if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
			checkFile(fullPath);
		}
	}
} else {
	walkDirectory(process.cwd());
}

// Report results
console.log(`\n✅ Checked ${checkedFiles} file(s)\n`);

if (warnings.length > 0) {
	console.log("⚠️  FILES APPROACHING LIMIT:");
	console.log("─".repeat(60));
	warnings.forEach((w) => {
		console.log(`  ${w.file}`);
		console.log(`    Lines: ${w.lines} (${w.remaining} remaining)`);
	});
	console.log("");
}

if (violations.length > 0) {
	console.log("❌ VIOLATIONS FOUND:");
	console.log("═".repeat(60));
	violations.forEach((v) => {
		console.log(`  ${v.file}`);
		console.log(`    Lines: ${v.lines} (${v.excess} over the ${MAX_LINES}-line limit)`);
		console.log(`    Action Required: Split into modules`);
	});
	console.log("");
	console.log(`🚫 ${violations.length} file(s) exceed the ${MAX_LINES}-line limit!`);
	console.log("   These MUST be split into smaller modules.\n");

	process.exit(1);
} else {
	console.log(`✨ All files comply with the ${MAX_LINES}-line limit!\n`);
	process.exit(0);
}
