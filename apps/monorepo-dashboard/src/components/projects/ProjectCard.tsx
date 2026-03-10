// Individual project status card
import { ExternalLink, FolderGit2, Tag, Target } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { Project, ProjectStatus } from "../../types";
import { StatusBadge } from "../shared/StatusBadge";

interface ProjectCardProps {
	project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
	const status = getProjectStatus(project);
	const targetCount = project.targets ? Object.keys(project.targets).length : 0;
	const tagCount = project.tags ? project.tags.length : 0;

	return (
		<div
			className={`bg-secondary/20 border rounded-lg p-5 transition-all hover:shadow-lg ${
				status === "healthy"
					? "border-emerald-500/20 hover:border-emerald-500/40"
					: status === "warning"
						? "border-amber-500/20 hover:border-amber-500/40"
						: "border-red-500/20 hover:border-red-500/40"
			}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-start gap-3">
					<div
						className={`p-2 rounded-lg ${
							status === "healthy"
								? "bg-emerald-500/20"
								: status === "warning"
									? "bg-amber-500/20"
									: "bg-red-500/20"
						}`}
					>
						<FolderGit2
							className={`w-5 h-5 ${
								status === "healthy"
									? "text-emerald-400"
									: status === "warning"
										? "text-amber-400"
										: "text-red-400"
							}`}
						/>
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-base mb-1">{project.name}</h3>
						{project.projectType && (
							<span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
								{project.projectType}
							</span>
						)}
					</div>
				</div>
				<StatusBadge status={status} size="sm" />
			</div>

			{/* Project Path */}
			<p className="text-xs text-muted-foreground font-mono mb-3 truncate">
				{project.root}
			</p>

			{/* Metrics Grid */}
			<div className="grid grid-cols-2 gap-2 mb-3">
				{/* Targets Count */}
				<div className="flex items-center gap-2 text-sm">
					<Target className="w-4 h-4 text-muted-foreground" />
					<span className="text-muted-foreground">Targets:</span>
					<span className="font-mono">{targetCount}</span>
				</div>

				{/* Tags Count */}
				<div className="flex items-center gap-2 text-sm">
					<Tag className="w-4 h-4 text-muted-foreground" />
					<span className="text-muted-foreground">Tags:</span>
					<span className="font-mono">{tagCount}</span>
				</div>
			</div>

			{/* Tags Display */}
			{project.tags && project.tags.length > 0 && (
				<div className="flex flex-wrap gap-1 mb-3">
					{project.tags.slice(0, 3).map((tag) => (
						<span
							key={tag}
							className="text-xs px-2 py-0.5 bg-secondary border border-border rounded"
						>
							{tag}
						</span>
					))}
					{project.tags.length > 3 && (
						<span className="text-xs px-2 py-0.5 text-muted-foreground">
							+{project.tags.length - 3} more
						</span>
					)}
				</div>
			)}

			{/* Available Targets */}
			{project.targets && Object.keys(project.targets).length > 0 && (
				<div className="border-t border-border pt-3">
					<p className="text-xs text-muted-foreground mb-2">
						Available Targets:
					</p>
					<div className="flex flex-wrap gap-1">
						{Object.keys(project.targets)
							.slice(0, 4)
							.map((target) => (
								<span
									key={target}
									className="text-xs px-2 py-1 bg-primary/5 border border-primary/20 rounded hover:bg-primary/10 transition-colors cursor-pointer"
									title={`Run: nx ${target} ${project.name}`}
								>
									{target}
								</span>
							))}
						{Object.keys(project.targets).length > 4 && (
							<span className="text-xs px-2 py-1 text-muted-foreground">
								+{Object.keys(project.targets).length - 4}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Quick Action: View in File Explorer */}
			<button
				onClick={() => {
					// Open project directory - would need actual implementation
					console.log(`Open ${project.root}`);
				}}
				onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						console.log(`Open ${project.root}`);
					}
				}}
				className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-colors"
				type="button"
				aria-label={`Open ${project.name} project directory at ${project.root}`}
			>
				<ExternalLink className="w-4 h-4" aria-hidden="true" />
				<span className="text-sm font-medium">View Project</span>
			</button>
		</div>
	);
}

// Helper function to get project status
function getProjectStatus(project: Project): ProjectStatus {
	// Enhanced status logic
	if (!project.targets || Object.keys(project.targets).length === 0) {
		return "warning"; // No build targets configured
	}

	// Check for critical indicators
	if (
		project.tags?.includes("deprecated") ||
		project.tags?.includes("archived")
	) {
		return "critical";
	}

	// Check for warning indicators
	if (
		project.tags?.includes("needs-migration") ||
		project.tags?.includes("legacy")
	) {
		return "warning";
	}

	return "healthy";
}
