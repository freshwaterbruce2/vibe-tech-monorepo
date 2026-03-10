#!/usr/bin/env node

import { exec } from "child_process";
import { readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Bundle size thresholds (in KB)
const THRESHOLDS = {
	total: 500,
	mainBundle: 200,
	vendorBundle: 250,
	cssBundle: 50,
	criticalChunks: {
		index: 100,
		vendor: 250,
		app: 150,
	},
	increase: {
		warning: 5, // 5% increase triggers warning
		error: 10, // 10% increase triggers error
	},
};

// ANSI color codes
const colors = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	reset: "\x1b[0m",
};

// Logger utility
const log = {
	error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
	success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
	warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
	info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
	section: (msg) =>
		console.log(`\n${colors.blue}=== ${msg} ===${colors.reset}\n`),
};

// Format bytes to human readable
function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / k ** i).toFixed(dm)) + " " + sizes[i];
}

// Get file size
async function getFileSize(filePath) {
	try {
		const stats = await stat(filePath);
		return stats.size;
	} catch (error) {
		return 0;
	}
}

// Analyze bundle sizes
async function analyzeBundleSizes() {
	log.section("Bundle Size Analysis");

	const distPath = path.join(process.cwd(), "dist");
	const assetsPath = path.join(distPath, "assets");

	try {
		// Get all JS and CSS files
		const { stdout } = await execAsync(
			`find ${assetsPath} -name "*.js" -o -name "*.css" | sort`,
		);
		const files = stdout.trim().split("\n").filter(Boolean);

		const bundles = {
			js: [],
			css: [],
			total: 0,
		};

		// Analyze each file
		for (const file of files) {
			const size = await getFileSize(file);
			const fileName = path.basename(file);
			const fileInfo = {
				name: fileName,
				path: file,
				size: size,
				sizeKB: size / 1024,
				sizeFormatted: formatBytes(size),
			};

			if (file.endsWith(".js")) {
				bundles.js.push(fileInfo);
			} else if (file.endsWith(".css")) {
				bundles.css.push(fileInfo);
			}

			bundles.total += size;
		}

		// Display results
		log.info("JavaScript Bundles:");
		bundles.js.forEach((file) => {
			const status = file.sizeKB > THRESHOLDS.mainBundle ? "⚠️ " : "✅ ";
			log.info(`  ${status}${file.name}: ${file.sizeFormatted}`);
		});

		log.info("\nCSS Bundles:");
		bundles.css.forEach((file) => {
			const status = file.sizeKB > THRESHOLDS.cssBundle ? "⚠️ " : "✅ ";
			log.info(`  ${status}${file.name}: ${file.sizeFormatted}`);
		});

		const totalKB = bundles.total / 1024;
		log.info(
			`\nTotal Bundle Size: ${formatBytes(bundles.total)} (${totalKB.toFixed(2)} KB)`,
		);

		// Check thresholds
		const issues = [];

		if (totalKB > THRESHOLDS.total) {
			issues.push(
				`Total bundle size (${totalKB.toFixed(2)} KB) exceeds threshold (${THRESHOLDS.total} KB)`,
			);
		}

		// Check for large individual bundles
		[...bundles.js, ...bundles.css].forEach((file) => {
			if (file.sizeKB > THRESHOLDS.mainBundle) {
				issues.push(
					`${file.name} (${file.sizeKB.toFixed(2)} KB) is larger than recommended`,
				);
			}
		});

		return {
			bundles,
			totalKB,
			issues,
			passed: issues.length === 0,
		};
	} catch (error) {
		log.error(`Bundle analysis failed: ${error.message}`);
		return { passed: false, error: error.message };
	}
}

// Compare with previous build
async function compareBundleSizes(currentBundles) {
	log.section("Bundle Size Comparison");

	const historyPath = path.join(process.cwd(), ".bundle-size-history.json");

	try {
		// Read previous data
		const historyData = await readFile(historyPath, "utf-8");
		const history = JSON.parse(historyData);
		const lastBuild = history[history.length - 1];

		if (!lastBuild) {
			log.info("No previous build data for comparison");
			return { passed: true, isFirstBuild: true };
		}

		// Calculate differences
		const currentTotal = currentBundles.totalKB;
		const previousTotal = lastBuild.totalKB;
		const difference = currentTotal - previousTotal;
		const percentChange = ((difference / previousTotal) * 100).toFixed(2);

		log.info(`Previous build: ${previousTotal.toFixed(2)} KB`);
		log.info(`Current build: ${currentTotal.toFixed(2)} KB`);
		log.info(
			`Change: ${difference > 0 ? "+" : ""}${difference.toFixed(2)} KB (${percentChange}%)`,
		);

		// Check thresholds
		const issues = [];

		if (percentChange > THRESHOLDS.increase.error) {
			issues.push(
				`Bundle size increased by ${percentChange}% (threshold: ${THRESHOLDS.increase.error}%)`,
			);
		} else if (percentChange > THRESHOLDS.increase.warning) {
			log.warning(
				`Bundle size increased by ${percentChange}% (warning threshold: ${THRESHOLDS.increase.warning}%)`,
			);
		}

		// Update history
		history.push({
			timestamp: new Date().toISOString(),
			totalKB: currentTotal,
			bundles: currentBundles.bundles,
		});

		// Keep only last 10 builds
		if (history.length > 10) {
			history.shift();
		}

		await writeFile(historyPath, JSON.stringify(history, null, 2));

		return {
			passed: issues.length === 0,
			issues,
			percentChange: parseFloat(percentChange),
		};
	} catch (error) {
		// First build, create history file
		const history = [
			{
				timestamp: new Date().toISOString(),
				totalKB: currentBundles.totalKB,
				bundles: currentBundles.bundles,
			},
		];

		await writeFile(historyPath, JSON.stringify(history, null, 2));
		log.info("Created bundle size history file");

		return { passed: true, isFirstBuild: true };
	}
}

// Analyze code splitting
async function analyzeCodeSplitting() {
	log.section("Code Splitting Analysis");

	try {
		const distPath = path.join(process.cwd(), "dist");
		const { stdout } = await execAsync(
			`find ${distPath} -name "*.js" | grep -E "(chunk|vendor)" | wc -l`,
		);
		const chunkCount = parseInt(stdout.trim());

		if (chunkCount === 0) {
			log.warning("No code splitting detected");
			return { passed: false, chunks: 0 };
		}

		log.success(`Found ${chunkCount} code-split chunks`);

		// Analyze lazy-loaded routes
		const srcPath = path.join(process.cwd(), "src");
		const { stdout: lazyRoutes } = await execAsync(
			`grep -r "lazy(" ${srcPath} | wc -l`,
		);
		const lazyRouteCount = parseInt(lazyRoutes.trim());

		if (lazyRouteCount > 0) {
			log.success(`Found ${lazyRouteCount} lazy-loaded components`);
		} else {
			log.warning("No lazy-loaded components found");
		}

		return {
			passed: chunkCount > 0,
			chunks: chunkCount,
			lazyRoutes: lazyRouteCount,
		};
	} catch (error) {
		log.error(`Code splitting analysis failed: ${error.message}`);
		return { passed: false, error: error.message };
	}
}

// Analyze dependencies
async function analyzeDependencies() {
	log.section("Dependency Analysis");

	try {
		// Check for duplicate dependencies
		const { stdout: duplicates } = await execAsync(
			'npm ls --depth=0 | grep "deduped" | wc -l',
		);
		const duplicateCount = parseInt(duplicates.trim());

		if (duplicateCount > 0) {
			log.warning(
				`Found ${duplicateCount} duplicate dependencies that could be deduped`,
			);
			log.info('Run "npm dedupe" to optimize');
		} else {
			log.success("No duplicate dependencies found");
		}

		// Check for unused dependencies
		const packageJson = JSON.parse(await readFile("package.json", "utf-8"));
		const dependencies = Object.keys(packageJson.dependencies || {});

		// Simple check for imports (not perfect but gives an idea)
		const unusedDeps = [];
		for (const dep of dependencies) {
			const { stdout } = await execAsync(
				`grep -r "from ['"]${dep}" src/ || true`,
			);
			if (!stdout.trim()) {
				unusedDeps.push(dep);
			}
		}

		if (unusedDeps.length > 0) {
			log.warning(`Potentially unused dependencies: ${unusedDeps.join(", ")}`);
		} else {
			log.success("All dependencies appear to be in use");
		}

		return {
			passed: true,
			duplicates: duplicateCount,
			unused: unusedDeps,
		};
	} catch (error) {
		log.error(`Dependency analysis failed: ${error.message}`);
		return { passed: false, error: error.message };
	}
}

// Generate bundle report
async function generateReport(results) {
	log.section("Bundle Analysis Report");

	const report = {
		timestamp: new Date().toISOString(),
		summary: {
			totalSize: results.bundleAnalysis.totalKB,
			passed: Object.values(results).every((r) => r.passed),
			issues: [],
		},
		details: results,
	};

	// Collect all issues
	Object.entries(results).forEach(([key, result]) => {
		if (result.issues && result.issues.length > 0) {
			report.summary.issues.push(...result.issues);
		}
	});

	// Save report
	const reportPath = path.join(process.cwd(), "bundle-analysis-report.json");
	await writeFile(reportPath, JSON.stringify(report, null, 2));

	// Display summary
	if (report.summary.passed) {
		log.success("Bundle analysis passed all checks!");
	} else {
		log.error("Bundle analysis found issues:");
		report.summary.issues.forEach((issue) => {
			log.error(`  - ${issue}`);
		});
	}

	log.info(`\nFull report saved to: ${reportPath}`);

	return report;
}

// Main execution
async function main() {
	console.log("\n📦 Running Bundle Analysis for Hotel Booking Application\n");

	// Ensure build exists
	try {
		await stat(path.join(process.cwd(), "dist"));
	} catch (error) {
		log.error('No build found. Run "npm run build" first.');
		process.exit(1);
	}

	const results = {
		bundleAnalysis: await analyzeBundleSizes(),
		comparison: null,
		codeSplitting: await analyzeCodeSplitting(),
		dependencies: await analyzeDependencies(),
	};

	// Compare with previous build
	if (results.bundleAnalysis.passed !== false) {
		results.comparison = await compareBundleSizes(results.bundleAnalysis);
	}

	// Generate report
	const report = await generateReport(results);

	// Exit with error if failed
	if (!report.summary.passed) {
		process.exit(1);
	}
}

// Run the analysis
main().catch((error) => {
	log.error(`Bundle analysis error: ${error.message}`);
	process.exit(1);
});
