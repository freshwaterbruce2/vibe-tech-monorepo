#!/usr/bin/env node
/**
 * Unicode Path Sanitizer
 *
 * Scans directories for files with non-ASCII characters and either:
 * 1. Reports them (default)
 * 2. Renames them to ASCII-safe names (with --fix flag)
 *
 * Usage:
 *   node sanitize-unicode-paths.js <directory>
 *   node sanitize-unicode-paths.js <directory> --fix
 */

const fs = require("fs");
const path = require("path");

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if a string contains non-ASCII characters
 */
function hasNonASCII(str) {
	return /[^\x20-\x7E]/.test(str);
}

/**
 * Sanitize a filename to ASCII-safe characters
 */
function sanitizeFilename(filename) {
	// Remove non-ASCII characters
	let sanitized = filename.replace(/[^\x20-\x7E]/g, "");

	// Remove unsafe Windows characters
	sanitized = sanitized.replace(/[<>:"|?*]/g, "");

	// Replace multiple spaces with single space
	sanitized = sanitized.replace(/\s+/g, " ");

	// Trim spaces
	sanitized = sanitized.trim();

	// If completely empty, use placeholder
	if (!sanitized) {
		sanitized = "sanitized-file";
	}

	return sanitized;
}

/**
 * Recursively scan directory for files with non-ASCII names
 */
function scanDirectory(dirPath, issues = [], depth = 0, maxDepth = 10) {
	if (depth > maxDepth) {
		log(`  Max depth ${maxDepth} reached, skipping deeper recursion`, "yellow");
		return issues;
	}

	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);

			// Skip common ignore directories
			if (
				entry.isDirectory() &&
				["node_modules", ".git", ".nx", "dist", "build"].includes(entry.name)
			) {
				continue;
			}

			// Check if name has non-ASCII characters
			if (hasNonASCII(entry.name)) {
				const sanitized = sanitizeFilename(entry.name);
				issues.push({
					type: entry.isDirectory() ? "directory" : "file",
					original: fullPath,
					name: entry.name,
					sanitized: sanitized,
					parentDir: dirPath,
				});
			}

			// Recurse into directories
			if (entry.isDirectory()) {
				scanDirectory(fullPath, issues, depth + 1, maxDepth);
			}
		}
	} catch (error) {
		log(`  Error scanning ${dirPath}: ${error.message}`, "red");
	}

	return issues;
}

/**
 * Rename files/directories to sanitized names
 */
function fixIssues(issues) {
	let fixed = 0;
	let errors = 0;

	for (const issue of issues) {
		const originalPath = issue.original;
		const newName = issue.sanitized;
		const newPath = path.join(issue.parentDir, newName);

		try {
			// Check if target already exists
			if (fs.existsSync(newPath)) {
				log(`  SKIP: ${originalPath}`, "yellow");
				log(`        Target already exists: ${newPath}`, "yellow");
				continue;
			}

			// Rename
			fs.renameSync(originalPath, newPath);
			log(`  FIXED: ${issue.name} → ${newName}`, "green");
			fixed++;
		} catch (error) {
			log(`  ERROR: ${originalPath}`, "red");
			log(`         ${error.message}`, "red");
			errors++;
		}
	}

	return { fixed, errors };
}

/**
 * Main execution
 */
function main() {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		console.log(`
Unicode Path Sanitizer

Usage:
  node sanitize-unicode-paths.js <directory>         # Report issues
  node sanitize-unicode-paths.js <directory> --fix   # Fix issues

Options:
  --fix     Rename files/directories to ASCII-safe names
  --help    Show this help message

Examples:
  # Scan and report
  node sanitize-unicode-paths.js projects/active/desktop-apps/deepcode-editor

  # Scan and fix
  node sanitize-unicode-paths.js projects/active/desktop-apps/deepcode-editor --fix
    `);
		process.exit(0);
	}

	const targetDir = args[0];
	const shouldFix = args.includes("--fix");

	// Validate directory
	if (!fs.existsSync(targetDir)) {
		log(`ERROR: Directory not found: ${targetDir}`, "red");
		process.exit(1);
	}

	if (!fs.statSync(targetDir).isDirectory()) {
		log(`ERROR: Not a directory: ${targetDir}`, "red");
		process.exit(1);
	}

	log("═".repeat(60), "cyan");
	log("  Unicode Path Sanitizer", "cyan");
	log("═".repeat(60), "cyan");
	log("");
	log(`Directory: ${path.resolve(targetDir)}`, "blue");
	log(
		`Mode: ${shouldFix ? "FIX" : "REPORT ONLY"}`,
		shouldFix ? "green" : "yellow",
	);
	log("");

	// Scan directory
	log("Scanning for non-ASCII file/directory names...", "cyan");
	const issues = scanDirectory(targetDir);

	if (issues.length === 0) {
		log("");
		log("✓ No issues found! All paths use ASCII characters.", "green");
		log("");
		process.exit(0);
	}

	// Report issues
	log("");
	log(`Found ${issues.length} items with non-ASCII characters:`, "yellow");
	log("");

	issues.forEach((issue, index) => {
		log(`${index + 1}. ${issue.type.toUpperCase()}: ${issue.name}`, "yellow");
		log(`   Path: ${issue.original}`, "cyan");
		log(`   Sanitized: ${issue.sanitized}`, "green");
		log("");
	});

	// Fix if requested
	if (shouldFix) {
		log("═".repeat(60), "cyan");
		log("Applying fixes...", "cyan");
		log("");

		const { fixed, errors } = fixIssues(issues);

		log("");
		log("═".repeat(60), "cyan");
		log("Summary:", "cyan");
		log(`  Fixed: ${fixed}`, "green");
		log(`  Errors: ${errors}`, errors > 0 ? "red" : "green");
		log(`  Total: ${issues.length}`, "blue");
		log("");

		if (errors > 0) {
			log("⚠ Some issues could not be fixed. Review errors above.", "yellow");
			process.exit(1);
		} else {
			log("✓ All issues fixed successfully!", "green");
			process.exit(0);
		}
	} else {
		log("═".repeat(60), "cyan");
		log("Report complete. Run with --fix to rename files.", "yellow");
		log("");
		process.exit(0);
	}
}

// Run
main();
