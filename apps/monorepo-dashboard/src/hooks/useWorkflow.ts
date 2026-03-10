import { useState } from "react";

interface ProposedAction {
	type: "dependency_update" | "config_fix";
	severity: "critical" | "recommended" | "optional";
	title: string;
	description: string;
	command: string;
	affectedProjects?: string[];
}

interface ProposalReport {
	timestamp: string;
	summary: {
		totalActions: number;
		criticalActions: number;
		recommendedActions: number;
		optionalActions: number;
	};
	actions: ProposedAction[];
}

interface ExecutionResult {
	action: ProposedAction;
	success: boolean;
	output?: string;
	error?: string;
}

interface ExecutionReport {
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

export function useWorkflow() {
	const [phase, setPhase] = useState(0); // 0=idle, 1=audit, 2=propose, 3=execute
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [proposal, setProposal] = useState<ProposalReport | null>(null);
	const [executionReport, setExecutionReport] =
		useState<ExecutionReport | null>(null);

	const runAudit = async () => {
		try {
			setLoading(true);
			setError(null);
			setPhase(1);

			const response = await fetch("http://localhost:5177/api/workflow/audit", {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			console.log("[Workflow] Audit complete:", data);

			// Move to propose phase automatically
			setTimeout(async () => runPropose(), 1000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to run audit");
			setPhase(0);
		} finally {
			setLoading(false);
		}
	};

	const runPropose = async () => {
		try {
			setLoading(true);
			setError(null);
			setPhase(2);

			const response = await fetch(
				"http://localhost:5177/api/workflow/propose",
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			setProposal(data);
			console.log("[Workflow] Proposal ready:", data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to generate proposal",
			);
			setPhase(0);
		} finally {
			setLoading(false);
		}
	};

	const runExecute = async (actionIndices: number[]) => {
		try {
			setLoading(true);
			setError(null);
			setPhase(3);

			const response = await fetch(
				"http://localhost:5177/api/workflow/execute",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ actionIndices }),
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			setExecutionReport(data);
			console.log("[Workflow] Execution complete:", data);

			// Mark workflow as complete
			setTimeout(() => setPhase(4), 1000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to execute actions",
			);
			setPhase(2); // Return to propose phase on error
		} finally {
			setLoading(false);
		}
	};

	const reset = () => {
		setPhase(0);
		setProposal(null);
		setExecutionReport(null);
		setError(null);
	};

	return {
		phase,
		loading,
		error,
		proposal,
		executionReport,
		runAudit,
		runPropose,
		runExecute,
		reset,
	};
}
