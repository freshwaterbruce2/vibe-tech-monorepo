import { checkConfigDrift } from "./configsService.js";
import { checkDependencyUpdates } from "./dependenciesService.js";

export interface AuditReport {
	timestamp: string;
	summary: {
		totalIssues: number;
		criticalIssues: number;
		dependencies: {
			totalUpdates: number;
			critical: number;
			recommended: number;
			optional: number;
		};
		configs: {
			totalDrifts: number;
			majorDrifts: number;
			minorDrifts: number;
		};
	};
	dependencies: Awaited<ReturnType<typeof checkDependencyUpdates>>;
	configs: Awaited<ReturnType<typeof checkConfigDrift>>;
}

export interface ProposedAction {
	type: "dependency_update" | "config_fix";
	severity: "critical" | "recommended" | "optional";
	title: string;
	description: string;
	command: string;
	affectedProjects?: string[];
}

export interface ProposalReport {
	timestamp: string;
	summary: {
		totalActions: number;
		criticalActions: number;
		recommendedActions: number;
		optionalActions: number;
	};
	actions: ProposedAction[];
}

export async function auditWorkspace(): Promise<AuditReport> {
	console.log("[Workflow] Starting workspace audit...");

	// Run dependency and config checks in parallel
	const [dependencies, configs] = await Promise.all([
		checkDependencyUpdates(),
		checkConfigDrift(),
	]);

	// Calculate summary statistics
	const depStats = {
		totalUpdates: dependencies.length,
		critical: dependencies.filter((d) => d.severity === "critical").length,
		recommended: dependencies.filter((d) => d.severity === "recommended")
			.length,
		optional: dependencies.filter((d) => d.severity === "optional").length,
	};

	const configStats = {
		totalDrifts: configs.reduce((sum, c) => sum + c.driftingProjects, 0),
		majorDrifts: configs.filter((c) =>
			c.drifts.some((d) => d.severity === "major"),
		).length,
		minorDrifts: configs.filter((c) =>
			c.drifts.every((d) => d.severity === "minor"),
		).length,
	};

	const totalIssues = depStats.totalUpdates + configStats.totalDrifts;
	const criticalIssues = depStats.critical + configStats.majorDrifts;

	console.log(
		`[Workflow] Audit complete: ${totalIssues} issues (${criticalIssues} critical)`,
	);

	return {
		timestamp: new Date().toISOString(),
		summary: {
			totalIssues,
			criticalIssues,
			dependencies: depStats,
			configs: configStats,
		},
		dependencies,
		configs,
	};
}

export interface ExecutionResult {
	action: ProposedAction;
	success: boolean;
	output?: string;
	error?: string;
}

export interface ExecutionReport {
	timestamp: string;
	backupCreated: boolean;
	backupPath?: string;
	summary: {
		totalAttempted: number;
		successful: number;
		failed: number;
	};
	results: ExecutionResult[];
}

export async function proposeActions(): Promise<ProposalReport> {
	console.log("[Workflow] Generating action proposals...");

	// First run audit to get current state
	const audit = await auditWorkspace();
	const actions: ProposedAction[] = [];

	// Generate dependency update actions
	for (const dep of audit.dependencies) {
		actions.push({
			type: "dependency_update",
			severity: dep.severity,
			title: `Update ${dep.name} (${dep.category})`,
			description: `Update from ${dep.current} to ${dep.latest}`,
			command: `pnpm update ${dep.name}@${dep.latest}`,
			affectedProjects: dep.affectedProjects,
		});
	}

	// Generate config fix actions
	for (const config of audit.configs) {
		if (config.driftingProjects === 0) continue;

		const severity = config.drifts.some((d) => d.severity === "major")
			? "critical"
			: "recommended";

		actions.push({
			type: "config_fix",
			severity,
			title: `Align ${config.configFile} across projects`,
			description: `${config.driftingProjects} projects have drift (${config.drifts.map((d) => d.projectName).join(", ")})`,
			command: `# Manual review required for ${config.configFile}`,
			affectedProjects: config.drifts.map((d) => d.projectName),
		});
	}

	// Sort by severity: critical first, then recommended, then optional
	actions.sort((a, b) => {
		const severityOrder = { critical: 0, recommended: 1, optional: 2 };
		return severityOrder[a.severity] - severityOrder[b.severity];
	});

	// Calculate summary
	const summary = {
		totalActions: actions.length,
		criticalActions: actions.filter((a) => a.severity === "critical").length,
		recommendedActions: actions.filter((a) => a.severity === "recommended")
			.length,
		optionalActions: actions.filter((a) => a.severity === "optional").length,
	};

	console.log(
		`[Workflow] Proposed ${summary.totalActions} actions (${summary.criticalActions} critical)`,
	);

	return {
		timestamp: new Date().toISOString(),
		summary,
		actions,
	};
}

export async function executeActions(
	actionIndices: number[],
): Promise<ExecutionReport> {
	console.log(`[Workflow] Executing ${actionIndices.length} actions...`);

	// First get the current proposals to know what to execute
	const proposal = await proposeActions();
	const actionsToExecute = actionIndices
		.map((idx) => proposal.actions[idx])
		.filter((action): action is ProposedAction => action !== undefined);

	if (actionsToExecute.length === 0) {
		throw new Error("No valid actions to execute");
	}

	const results: ExecutionResult[] = [];

	// Note: For safety, we only execute dependency updates, not config fixes
	// Config fixes require manual review and shouldn't be automated
	for (const action of actionsToExecute) {
		if (action.type === "config_fix") {
			results.push({
				action,
				success: false,
				error:
					"Config fixes require manual review - not executed automatically",
			});
			continue;
		}

		// Execute dependency update
		if (
			action.type === "dependency_update" &&
			action.command.startsWith("pnpm update")
		) {
			try {
				// For now, we just report what would be executed
				// In production, this would use child_process.exec
				results.push({
					action,
					success: true,
					output: `Would execute: ${action.command}\n(Actual execution disabled for safety - run commands manually)`,
				});
			} catch (error: any) {
				results.push({
					action,
					success: false,
					error: error.message || "Execution failed",
				});
			}
		}
	}

	const summary = {
		totalAttempted: results.length,
		successful: results.filter((r) => r.success).length,
		failed: results.filter((r) => !r.success).length,
	};

	console.log(
		`[Workflow] Execution complete: ${summary.successful}/${summary.totalAttempted} successful`,
	);

	return {
		timestamp: new Date().toISOString(),
		backupCreated: false, // Backup creation would be implemented in production
		summary,
		results,
	};
}
