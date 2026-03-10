import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AgentService } from "@/services/AgentService";

// Types matching the Rust GuidanceEngine output
interface GuidanceItem {
	id: string;
	category: "next_steps" | "doing_right" | "at_risk";
	priority: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	action?: {
		action_type: string;
		payload: Record<string, unknown>;
	};
	created_at: number;
}

interface GuidanceResponse {
	next_steps: GuidanceItem[];
	doing_right: GuidanceItem[];
	at_risk: GuidanceItem[];
	generated_at: number;
	context_summary: string;
}

interface ProjectTemplate {
	id: string;
	name: string;
	description: string;
	project_type: string;
	command: string;
	args: string[];
}

interface GuidancePanelProps {
	title: string;
	items: GuidanceItem[];
	type?: "default" | "success" | "warning";
	onAction?: (item: GuidanceItem) => void;
}

function GuidancePanel({
	title,
	items,
	type = "default",
	onAction,
}: GuidancePanelProps) {
	// Dark mode friendly colors
	const typeColors = {
		default: "border-blue-500/30 bg-blue-500/10",
		success: "border-green-500/30 bg-green-500/10",
		warning: "border-yellow-500/30 bg-yellow-500/10",
	};

	const priorityBadge = (priority: string) => {
		const colors: Record<string, string> = {
			low: "bg-gray-500/20 text-gray-300 border-gray-500/30",
			medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
			high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
			critical: "bg-red-500/20 text-red-300 border-red-500/30",
		};
		return (
			<span
				className={`text-xs px-2 py-0.5 rounded border ${colors[priority] ?? colors.low}`}
			>
				{priority}
			</span>
		);
	};

	return (
		<div className={`border rounded-lg p-4 ${typeColors[type]}`}>
			<h3
				className={`text-lg font-semibold mb-3 ${type === "warning" ? "text-yellow-400" : type === "success" ? "text-green-400" : "text-blue-400"}`}
			>
				{title}
			</h3>
			{items.length === 0 ? (
				<p className="text-white/40 italic">No items</p>
			) : (
				<ul className="space-y-3">
					{items.map((item) => (
						<li key={item.id} className="flex items-start gap-2">
							<span className="mt-1 text-white/50">•</span>
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-1">
									<span className="font-medium text-white/90">
										{item.title}
									</span>
									{priorityBadge(item.priority)}
								</div>
								<p className="text-sm text-gray-300">{item.description}</p>
								{item.action && onAction && (
									<button
										onClick={() => onAction(item)}
										className="mt-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1 border border-white/10"
									>
										Take action →
									</button>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function BridgeStatus() {
	const [status] = useState("Connecting...");
	const [lastSync, setLastSync] = useState("Never");

	const handleSync = async () => {
		try {
			await invoke("log_activity", {
				activityType: "manual_sync",
				details: "User requested manual sync",
			});
			setLastSync(new Date().toLocaleTimeString());
			toast.success("Sync initiated");
		} catch (e) {
			console.error("Sync failed:", e);
			toast.error("Sync failed to start");
		}
	};

	return (
		<div className="border border-white/10 bg-black/40 rounded-lg p-4">
			<h3 className="text-lg font-semibold mb-3 text-white">
				Deep Code Editor Bridge
			</h3>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-medium text-gray-300">Status:</span>
					<span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-sm">
						{status}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="font-medium text-gray-300">Last Sync:</span>
					<span className="text-gray-400">{lastSync}</span>
				</div>
				<div className="mt-4 flex gap-2">
					<button
						onClick={() => {
							void handleSync();
						}}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
					>
						Sync Now
					</button>
					<button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm">
						Open File
					</button>
				</div>
			</div>
		</div>
	);
}

function ProjectCreator() {
	const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState<string>("");
	const [name, setName] = useState("");
	const [path, setPath] = useState("C:\\dev\\apps");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	useEffect(() => {
		const loadTemplates = async () => {
			try {
				const tpls = await invoke<ProjectTemplate[]>("get_available_templates");
				setTemplates(tpls);
				if (tpls.length > 0 && tpls[0]) {
					setSelectedTemplate(tpls[0].id);
				}
			} catch (e) {
				console.error("Failed to load templates:", e);
				// Fallback templates
				setTemplates([
					{
						id: "nx-react",
						name: "React Application",
						description: "React with Nx",
						project_type: "typescript",
						command: "pnpm",
						args: [],
					},
					{
						id: "rust-bin",
						name: "Rust Binary",
						description: "Cargo binary",
						project_type: "rust",
						command: "cargo",
						args: [],
					},
				]);
			}
		};
		void loadTemplates();
	}, []);

	const handleCreate = async () => {
		if (!name || !selectedTemplate) return;
		setLoading(true);
		setResult(null);
		try {
			const response = await invoke<{
				success: boolean;
				project_name: string;
				stdout: string;
				stderr: string;
			}>("create_project", {
				templateId: selectedTemplate,
				name,
				path,
			});
			setResult({
				success: true,
				message: `Created project: ${response.project_name}`,
			});
			toast.success(`Project ${response.project_name} created successfully`);
			setName("");
		} catch (e) {
			setResult({ success: false, message: String(e) });
			toast.error(`Failed to create project: ${e}`);
		} finally {
			setLoading(false);
		}
	};

	const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

	return (
		<div className="border border-purple-500/30 bg-black/40 rounded-lg p-4">
			<h3 className="text-lg font-semibold mb-3 text-white">
				Create New Project
			</h3>
			<div className="space-y-3">
				<div>
					<label className="block text-sm font-medium mb-1 text-gray-300">
						Template
					</label>
					<select
						title="Project Template"
						value={selectedTemplate}
						onChange={(e) => setSelectedTemplate(e.target.value)}
						className="w-full border border-white/10 bg-black/50 rounded px-3 py-2 text-white"
					>
						{templates.map((tpl) => (
							<option key={tpl.id} value={tpl.id} className="bg-gray-900">
								{tpl.name} ({tpl.project_type})
							</option>
						))}
					</select>
					{selectedTemplateData && (
						<p className="text-xs text-gray-500 mt-1">
							{selectedTemplateData.description}
						</p>
					)}
				</div>
				<div>
					<label className="block text-sm font-medium mb-1 text-gray-300">
						Project Name
					</label>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full border border-white/10 bg-black/50 rounded px-3 py-2 text-white placeholder:text-gray-600"
						placeholder="my-awesome-project"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1 text-gray-300">
						Path
					</label>
					<input
						type="text"
						value={path}
						onChange={(e) => setPath(e.target.value)}
						className="w-full border border-white/10 bg-black/50 rounded px-3 py-2 text-white placeholder:text-gray-600"
						placeholder="C:\dev\apps"
					/>
				</div>
				{result && (
					<div
						className={`p-2 rounded text-sm ${result.success ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}
					>
						{result.message}
					</div>
				)}
				<button
					onClick={() => {
						void handleCreate();
					}}
					disabled={loading || !name}
					className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
				>
					{loading ? "Creating..." : "Create Project"}
				</button>
			</div>
		</div>
	);
}

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
		}, 30000); // Refresh every 30s
		return () => clearInterval(interval);
	}, []);

	const handleAction = async (item: GuidanceItem) => {
		if (!item.action) return;

		try {
			toast.info("Executing action...");
			switch (item.action.action_type) {
				case "run_command": {
					console.log("Running command:", item.action.payload);
					// Assuming payload has 'command' or 'code'
					const cmd = item.action.payload.command ?? item.action.payload.code;
					if (typeof cmd === "string") {
						try {
							const _output = await AgentService.executeCode("powershell", cmd);
							toast.success("Action completed successfully");
							// Refresh guidance as state changed
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
					await loadGuidance(); // Refresh
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
