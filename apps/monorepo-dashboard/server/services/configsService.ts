// Config Drift Detection Service
// Compares configuration files across projects to find misalignments

import fs from "fs/promises";
import { glob } from "glob";
import path from "path";

const WORKSPACE_ROOT = "C:\\dev";

interface ConfigFile {
	path: string;
	projectName: string;
	content: any; // Parsed JSON content
	rawContent: string;
}

interface ConfigDrift {
	configFile: string; // e.g., "tsconfig.json"
	totalProjects: number;
	alignedProjects: number;
	driftingProjects: number;
	drifts: ConfigFileDrift[];
}

interface ConfigFileDrift {
	projectName: string;
	differences: string[];
	severity: "minor" | "major";
}

/**
 * Find all instances of a config file across projects
 */
async function findConfigFiles(filename: string): Promise<ConfigFile[]> {
	try {
		const pattern = `**/${filename}`;
		const files = await glob(pattern, {
			cwd: WORKSPACE_ROOT,
			ignore: ["**/node_modules/**", "**/.nx/**", "**/dist/**", "**/build/**"],
			absolute: false,
		});

		console.log(`[ConfigsService] Found ${files.length} ${filename} files`);

		const configFiles: ConfigFile[] = [];

		for (const file of files) {
			try {
				const fullPath = path.join(WORKSPACE_ROOT, file);
				const rawContent = await fs.readFile(fullPath, "utf-8");

				// Try to parse as JSON (works for tsconfig.json, .eslintrc.json, etc.)
				let content: any;
				try {
					// Remove comments for JSON5/JSONC support (tsconfig allows comments)
					const cleanedContent = rawContent.replace(
						/\/\*[\s\S]*?\*\/|\/\/.*/g,
						"",
					);
					content = JSON.parse(cleanedContent);
				} catch {
					// If not JSON, store as string
					content = rawContent;
				}

				// Extract project name from path
				const projectRoot = path.dirname(file);
				const projectName =
					projectRoot.split(path.sep)[0] || path.basename(projectRoot);

				configFiles.push({
					path: file,
					projectName,
					content,
					rawContent,
				});
			} catch (error) {
				console.warn(`[ConfigsService] Failed to read ${file}:`, error);
			}
		}

		return configFiles;
	} catch (error) {
		console.error(`[ConfigsService] Failed to find ${filename} files:`, error);
		return [];
	}
}

/**
 * Compare config objects and find differences
 */
function compareConfigs(baseline: any, compare: any, path = ""): string[] {
	const differences: string[] = [];

	if (typeof baseline !== typeof compare) {
		differences.push(`${path || "root"}: type mismatch`);
		return differences;
	}

	if (typeof baseline === "object" && baseline !== null) {
		// Check for missing keys in compare
		for (const key of Object.keys(baseline)) {
			if (!(key in compare)) {
				differences.push(`${path}.${key}: missing in this project`);
			} else {
				const subDiffs = compareConfigs(
					baseline[key],
					compare[key],
					path ? `${path}.${key}` : key,
				);
				differences.push(...subDiffs);
			}
		}

		// Check for extra keys in compare
		for (const key of Object.keys(compare)) {
			if (!(key in baseline)) {
				differences.push(`${path}.${key}: extra key not in baseline`);
			}
		}
	} else if (baseline !== compare) {
		differences.push(`${path || "root"}: "${baseline}" vs "${compare}"`);
	}

	return differences;
}

/**
 * Detect drift for a specific config file type
 */
async function detectDriftForConfig(
	filename: string,
): Promise<ConfigDrift | null> {
	const configFiles = await findConfigFiles(filename);

	if (configFiles.length === 0) {
		return null;
	}

	// Use the most common config as baseline (simple heuristic: first one found in apps/)
	const appsConfigs = configFiles.filter((c) => c.path.startsWith("apps"));
	const baseline = appsConfigs.length > 0 ? appsConfigs[0] : configFiles[0];

	if (!baseline) return null;

	console.log(`[ConfigsService] Using baseline: ${baseline.path}`);

	const drifts: ConfigFileDrift[] = [];

	for (const config of configFiles) {
		if (config.path === baseline.path) continue; // Skip baseline itself

		const differences = compareConfigs(baseline.content, config.content);

		if (differences.length > 0) {
			// Determine severity based on number of differences
			const severity = differences.length > 5 ? "major" : "minor";

			drifts.push({
				projectName: config.projectName,
				differences,
				severity,
			});
		}
	}

	return {
		configFile: filename,
		totalProjects: configFiles.length,
		alignedProjects: configFiles.length - drifts.length,
		driftingProjects: drifts.length,
		drifts,
	};
}

/**
 * Check config drift for multiple config file types
 */
export async function checkConfigDrift(): Promise<ConfigDrift[]> {
	try {
		console.log("[ConfigsService] Starting config drift detection...");

		const configTypes = [
			"tsconfig.json",
			"tsconfig.base.json",
			".eslintrc.json",
			"eslintrc.json",
			".prettierrc",
			"prettier.config.js",
		];

		const results: ConfigDrift[] = [];

		for (const configType of configTypes) {
			const drift = await detectDriftForConfig(configType);
			if (drift) {
				results.push(drift);
			}
		}

		console.log(
			`[ConfigsService] Found drift in ${results.filter((r) => r.driftingProjects > 0).length} config types`,
		);

		return results;
	} catch (error) {
		console.error("[ConfigsService] Failed to check config drift:", error);
		return [];
	}
}

/**
 * Get specific config file drift details
 */
export async function getConfigFileDrift(
	filename: string,
): Promise<ConfigDrift | null> {
	return detectDriftForConfig(filename);
}
