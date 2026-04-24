import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AgentService } from "@/services/AgentService";
import {
	GuidancePanel,
	type GuidanceItem,
	type GuidanceResponse,
} from "@/components/context/GuidancePanel";
import { BridgeStatus } from "@/components/context/BridgeStatus";
import { ProjectCreator } from "@/components/context/ProjectCreator";

export default function ContextGuide() {
	const [guidance, setGuidance] = useState<GuidanceResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadGuidance = async () => {
		try {
			setError(null);
			const result = await invoke<GuidanceResponse>("request_guidance", {
				context: {},
			});
			setGuidance(result);
		} catch (err) {
			console.error("Failed to load guidance:", err);
			setError(String(err));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadGuidance();
		const interval = setInterval(() => {
			void loadGuidance();
		}, 30000);
		return () => clearInterval(interval);
	}, []);

	const handleAction = async (item: GuidanceItem) => {
		if (!item.action) return;

		try {
			toast.info("Executing action...");
			switch (item.action.action_type) {
				case "run_command": {
					console.log("Running command:", item.action.payload);
					const cmd = item.action.payload.command ?? item.action.payload.code;
					if (typeof cmd === "string") {
						try {
							const _output = await AgentService.executeCode("powershell", cmd);
							toast.success("Action completed successfully");
							await loadGuidance();
						} catch (e) {
							console.error("Command execution failed", e);
							toast.error(`Action failed: ${String(e)}`);
						}
					}
					break;
				}
				case "start_task":
					await invoke("update_task_status", {
						taskId: String(item.action.payload.task_id),
						newStatus: "in_progress",
					});
					toast.success("Task started");
					await loadGuidance();
					break;
				default:
					console.log("Unknown action:", item.action);
					toast.warning(`Unknown action type: ${item.action.action_type}`);
			}
		} catch (e) {
			console.error("Action failed:", e);
			toast.error("Action failed unexpectedly");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-xl text-gray-400">Loading guidance...</p>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-7xl mx-auto space-y-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
					Desktop Context Aware Guide
				</h1>
				<button
					onClick={() => {
						void loadGuidance();
					}}
					className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded transition-colors"
				>
					Refresh
				</button>
			</div>

			{error && (
				<div className="p-4 bg-red-500/10 border border-red-500/30 rounded text-red-300">
					Error: {error}
				</div>
			)}

			{guidance && (
				<>
					<div className="p-4 bg-white/5 border border-white/10 rounded text-sm text-gray-300">
						{guidance.context_summary || "Context loading..."}
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<GuidancePanel
							title="Next Steps"
							items={guidance.next_steps}
							onAction={(item) => {
								void handleAction(item);
							}}
						/>
						<GuidancePanel
							title="Doing Right ✓"
							items={guidance.doing_right}
							type="success"
						/>
					</div>

					{guidance.at_risk.length > 0 && (
						<GuidancePanel
							title="At Risk / Blocked ⚠"
							items={guidance.at_risk}
							type="warning"
							onAction={(item) => {
								void handleAction(item);
							}}
						/>
					)}
				</>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<BridgeStatus />
				<ProjectCreator />
			</div>
		</div>
	);
}
