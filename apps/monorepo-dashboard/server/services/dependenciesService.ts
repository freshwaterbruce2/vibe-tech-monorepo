// Dependencies Service - Check npm registry for available updates
// Scans all package.json files and compares versions with npm registry

import { execSync } from "child_process";
import fs from "fs/promises";
import { glob } from "glob";
import path from "path";
import { config } from "../config.js";

// Configuration (from shared config)
const NPM_REGISTRY = "https://registry.npmjs.org";

interface DependencyUpdate {
	name: string;
	current: string;
	latest: string;
	severity: "critical" | "recommended" | "optional";
	category: "dependencies" | "devDependencies" | "peerDependencies";
	affectedProjects: string[];
}

interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

interface Vulnerability {
	packageName: string;
	severity: "critical" | "high" | "moderate" | "low" | "info";
	title: string;
	vulnerable_versions: string;
	patched_versions: string;
	recommendation: string;
}

interface VulnerabilityReport {
	totalVulnerabilities: number;
	critical: number;
	high: number;
	moderate: number;
	low: number;
	info: number;
	vulnerabilities: Vulnerability[];
}

// Cache registry responses for 5 minutes
const registryCache = new Map<string, { version: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch latest version from npm registry
 */
async function fetchLatestVersion(packageName: string): Promise<string | null> {
	const cached = registryCache.get(packageName);
	const now = Date.now();

	if (cached && now - cached.timestamp < CACHE_TTL) {
		return cached.version;
	}

	try {
		const response = await fetch(`${NPM_REGISTRY}/${packageName}`, {
			headers: { Accept: "application/json" },
		});

		if (!response.ok) {
			console.warn(
				`[DependenciesService] Failed to fetch ${packageName}: ${response.status}`,
			);
			return null;
		}

		const data = (await response.json()) as { "dist-tags": { latest: string } };
		const latest = data["dist-tags"]?.latest;

		if (latest) {
			registryCache.set(packageName, { version: latest, timestamp: now });
		}

		return latest || null;
	} catch (error) {
		console.error(
			`[DependenciesService] Error fetching ${packageName}:`,
			error,
		);
		return null;
	}
}

/**
 * Determine severity of update based on semver difference
 */
function calculateSeverity(
	current: string,
	latest: string,
): "critical" | "recommended" | "optional" {
	const cleanCurrent = current.replace(/[\^~><=]/, "").trim();
	const cleanLatest = latest.trim();

	const [currentMajor = 0, currentMinor = 0, currentPatch = 0] = cleanCurrent
		.split(".")
		.map((n) => parseInt(n, 10) || 0);
	const [latestMajor = 0, latestMinor = 0, latestPatch = 0] = cleanLatest
		.split(".")
		.map((n) => parseInt(n, 10) || 0);

	// Major version difference = critical
	if (latestMajor > currentMajor) {
		return "critical";
	}

	// Minor version difference = recommended
	if (latestMinor > currentMinor) {
		return "recommended";
	}

	// Patch version difference = optional
	if (latestPatch > currentPatch) {
		return "optional";
	}

	return "optional"; // Same version
}

/**
 * Check npm registry for dependency updates across all projects
 */
export async function checkDependencyUpdates(): Promise<DependencyUpdate[]> {
	try {
		console.log(
			"[DependenciesService] Scanning workspace for package.json files...",
		);

		// Find all package.json files
		const packageFiles = await glob("**/package.json", {
			cwd: config.WORKSPACE_ROOT,
			ignore: ["**/node_modules/**", "**/.nx/**", "**/dist/**"],
			absolute: false,
		});

		console.log(
			`[DependenciesService] Found ${packageFiles.length} package.json files`,
		);

		// Aggregate dependencies across all projects
		const dependencyMap = new Map<
			string,
			{
				versions: Set<string>;
				category: "dependencies" | "devDependencies" | "peerDependencies";
				projects: Set<string>;
			}
		>();

		for (const file of packageFiles) {
			try {
				const fullPath = path.join(config.WORKSPACE_ROOT, file);
				const content = await fs.readFile(fullPath, "utf-8");
				const pkg: PackageJson = JSON.parse(content);
				const projectName = pkg.name || path.dirname(file);

				// Process each category
				const categories = [
					"dependencies",
					"devDependencies",
					"peerDependencies",
				] as const;

				for (const category of categories) {
					const deps = pkg[category];
					if (!deps) continue;

					for (const [name, version] of Object.entries(deps)) {
						if (!dependencyMap.has(name)) {
							dependencyMap.set(name, {
								versions: new Set(),
								category,
								projects: new Set(),
							});
						}

						const entry = dependencyMap.get(name)!;
						entry.versions.add(version);
						entry.projects.add(projectName);
					}
				}
			} catch (error) {
				console.warn(`[DependenciesService] Failed to parse ${file}:`, error);
			}
		}

		console.log(
			`[DependenciesService] Found ${dependencyMap.size} unique dependencies`,
		);

		// Check registry for updates
		const updates: DependencyUpdate[] = [];

		for (const [name, data] of dependencyMap.entries()) {
			// Use the most common version
			const current = Array.from(data.versions)[0];

			if (!current) continue;

			const latest = await fetchLatestVersion(name);
			if (!latest) continue;

			const cleanCurrent = current.replace(/[\^~><=]/, "").trim();
			if (cleanCurrent !== latest) {
				const severity = calculateSeverity(current, latest);

				updates.push({
					name,
					current,
					latest,
					severity,
					category: data.category,
					affectedProjects: Array.from(data.projects),
				});
			}
		}

		console.log(
			`[DependenciesService] Found ${updates.length} available updates`,
		);

		// Sort by severity: critical > recommended > optional
		const severityOrder = { critical: 0, recommended: 1, optional: 2 };
		updates.sort(
			(a, b) => severityOrder[a.severity] - severityOrder[b.severity],
		);

		return updates;
	} catch (error) {
		console.error(
			"[DependenciesService] Failed to check dependency updates:",
			error,
		);
		return [];
	}
}

/**
 * Scan workspace for security vulnerabilities using pnpm audit
 */
export async function getVulnerabilities(): Promise<VulnerabilityReport> {
	try {
		console.log("[DependenciesService] Running pnpm audit...");

		// Run pnpm audit --json from workspace root
		// Note: pnpm audit returns non-zero exit code when vulnerabilities exist, which is expected
		let auditOutput: string;
		try {
			auditOutput = execSync("pnpm audit --json", {
				cwd: config.WORKSPACE_ROOT,
				encoding: "utf-8",
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
			});
		} catch (error: any) {
			// pnpm audit returns exit code 1 when vulnerabilities are found
			// This is normal behavior, so we use the output from the error
			if (error.stdout) {
				auditOutput = error.stdout;
			} else {
				throw error;
			}
		}

		// Parse the JSON output
		const auditData = JSON.parse(auditOutput);

		// Initialize counters
		const severityCounts = {
			critical: 0,
			high: 0,
			moderate: 0,
			low: 0,
			info: 0,
		};

		const vulnerabilities: Vulnerability[] = [];

		// Extract vulnerabilities from advisories
		if (auditData.advisories) {
			for (const advisory of Object.values(auditData.advisories)) {
				const vuln = advisory as any;

				const severity = (vuln.severity?.toLowerCase() ||
					"info") as Vulnerability["severity"];
				severityCounts[severity]++;

				vulnerabilities.push({
					packageName: vuln.module_name || vuln.name || "unknown",
					severity,
					title: vuln.title || "No title provided",
					vulnerable_versions:
						vuln.vulnerable_versions ||
						vuln.findings?.[0]?.version ||
						"unknown",
					patched_versions: vuln.patched_versions || "unknown",
					recommendation:
						vuln.recommendation || "Upgrade to latest patched version",
				});
			}
		}

		// Also check for vulnerabilities in metadata format (newer pnpm versions)
		if (auditData.metadata?.vulnerabilities) {
			const meta = auditData.metadata.vulnerabilities;
			if (typeof meta === "object") {
				for (const [severity, count] of Object.entries(meta)) {
					if (typeof count === "number" && severity in severityCounts) {
						severityCounts[severity as keyof typeof severityCounts] = count;
					}
				}
			}
		}

		const totalVulnerabilities =
			severityCounts.critical +
			severityCounts.high +
			severityCounts.moderate +
			severityCounts.low +
			severityCounts.info;

		console.log(
			`[DependenciesService] Found ${totalVulnerabilities} vulnerabilities`,
		);

		// Sort vulnerabilities by severity (critical first)
		const severityOrder = {
			critical: 0,
			high: 1,
			moderate: 2,
			low: 3,
			info: 4,
		};
		vulnerabilities.sort(
			(a, b) => severityOrder[a.severity] - severityOrder[b.severity],
		);

		return {
			totalVulnerabilities,
			critical: severityCounts.critical,
			high: severityCounts.high,
			moderate: severityCounts.moderate,
			low: severityCounts.low,
			info: severityCounts.info,
			vulnerabilities,
		};
	} catch (error) {
		console.error("[DependenciesService] Failed to run pnpm audit:", error);

		// Return empty report on error
		return {
			totalVulnerabilities: 0,
			critical: 0,
			high: 0,
			moderate: 0,
			low: 0,
			info: 0,
			vulnerabilities: [],
		};
	}
}
