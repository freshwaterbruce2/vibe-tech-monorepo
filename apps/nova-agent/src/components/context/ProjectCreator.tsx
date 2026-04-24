import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ProjectTemplate {
	id: string;
	name: string;
	description: string;
	project_type: string;
	command: string;
	args: string[];
}

export function ProjectCreator() {
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
