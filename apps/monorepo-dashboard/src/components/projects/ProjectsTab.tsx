// Projects monitoring tab with 52+ project status cards
import { Filter, FolderGit2, RefreshCw, Search } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { useProjects } from "../../hooks/useProjects";
import { AnimatedCounter } from "../shared/AnimatedCounter";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { StatusBadge } from "../shared/StatusBadge";
import { ProjectCard } from "./ProjectCard";

export function ProjectsTab() {
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState<
		"all" | "healthy" | "warning" | "critical"
	>("all");

	const {
		projects,
		categorizedProjects,
		affectedProjects,
		metrics,
		isLoading,
		error,
		refetch,
	} = useProjects();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LoadingSpinner size="lg" message="Loading projects data..." />
			</div>
		);
	}

	if (error) {
		return (
			<div
				className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg"
				role="alert"
			>
				<h2 className="text-xl font-semibold text-red-400 mb-2">
					Error Loading Projects
				</h2>
				<p className="text-red-300 mb-4">
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
				<button
					onClick={() => refetch()}
					onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							refetch();
						}
					}}
					className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
					type="button"
					aria-label="Retry loading projects"
				>
					Retry
				</button>
			</div>
		);
	}

	// Convert projects object to array
	const projectsArray = Object.values(projects);

	// Filter projects
	const filteredProjects = projectsArray.filter((project) => {
		const matchesSearch =
			searchQuery === "" ||
			project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			project.root.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesFilter =
			filterStatus === "all" || getProjectStatus(project) === filterStatus;

		return matchesSearch && matchesFilter;
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold mb-2">Project Monitor</h1>
					<p className="text-muted-foreground">
						Monitoring {projectsArray.length} project
						{projectsArray.length !== 1 ? "s" : ""} across the workspace
					</p>
				</div>
				<button
					onClick={() => refetch()}
					onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							refetch();
						}
					}}
					className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
					type="button"
					aria-label="Refresh project data"
				>
					<RefreshCw className="w-4 h-4" aria-hidden="true" />
					Refresh
				</button>
			</div>

			{/* Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Total Projects
						</p>
						<FolderGit2 className="w-5 h-5 text-blue-400" />
					</div>
					<p className="text-3xl font-bold text-blue-400">
						<AnimatedCounter value={metrics.totalProjects} />
					</p>
				</div>

				<div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">Healthy</p>
						<StatusBadge status="healthy" size="sm" showLabel={false} />
					</div>
					<p className="text-3xl font-bold text-emerald-400">
						<AnimatedCounter value={metrics.healthyProjects} />
					</p>
				</div>

				<div className="bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Warnings
						</p>
						<StatusBadge status="warning" size="sm" showLabel={false} />
					</div>
					<p className="text-3xl font-bold text-amber-400">
						<AnimatedCounter value={metrics.warningProjects} />
					</p>
				</div>

				<div className="bg-gradient-to-br from-red-500/20 to-red-600/5 border border-red-500/30 rounded-lg p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm font-medium text-muted-foreground">
							Critical
						</p>
						<StatusBadge status="critical" size="sm" showLabel={false} />
					</div>
					<p className="text-3xl font-bold text-red-400">
						<AnimatedCounter value={metrics.criticalProjects} />
					</p>
				</div>
			</div>

			{/* Search and Filter Bar */}
			<div className="flex items-center gap-4" role="search">
				{/* Search */}
				<div className="relative flex-1">
					<label htmlFor="project-search" className="sr-only">
						Search projects by name or path
					</label>
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
						aria-hidden="true"
					/>
					<input
						id="project-search"
						type="text"
						placeholder="Search projects..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
							if (e.key === "Escape") {
								setSearchQuery("");
							}
						}}
						className="w-full pl-10 pr-4 py-2 bg-secondary/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
						aria-label="Search projects by name or path"
					/>
				</div>

				{/* Filter */}
				<div className="flex items-center gap-2">
					<Filter
						className="w-4 h-4 text-muted-foreground"
						aria-hidden="true"
					/>
					<label htmlFor="status-filter" className="sr-only">
						Filter projects by status
					</label>
					<select
						id="status-filter"
						value={filterStatus}
						onChange={(e) => setFilterStatus(e.target.value as any)}
						className="px-4 py-2 bg-secondary/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
						aria-label="Filter projects by status"
					>
						<option value="all">All Status</option>
						<option value="healthy">Healthy</option>
						<option value="warning">Warning</option>
						<option value="critical">Critical</option>
					</select>
				</div>
			</div>

			{/* Affected Projects Alert */}
			{affectedProjects && affectedProjects.projects.length > 0 && (
				<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
					<h3 className="font-semibold text-blue-400 mb-2">
						{affectedProjects.projects.length} Affected Project
						{affectedProjects.projects.length !== 1 ? "s" : ""}
					</h3>
					<p className="text-sm text-blue-300">
						These projects have changes since main branch. Consider running
						build/test.
					</p>
				</div>
			)}

			{/* Projects Grid */}
			{Object.entries(categorizedProjects).map(
				([category, categoryProjects]) => {
					const filteredCategoryProjects = categoryProjects.filter((p) =>
						filteredProjects.some((fp) => fp.name === p.name),
					);

					if (filteredCategoryProjects.length === 0) return null;

					return (
						<div key={category}>
							<h2 className="text-xl font-semibold mb-4">
								{category} ({filteredCategoryProjects.length})
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{filteredCategoryProjects.map((project) => (
									<ProjectCard key={project.name} project={project} />
								))}
							</div>
						</div>
					);
				},
			)}

			{/* Empty State */}
			{filteredProjects.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					<FolderGit2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
					<p className="text-lg font-medium">No Projects Found</p>
					<p className="text-sm mt-2">
						{searchQuery || filterStatus !== "all"
							? "Try adjusting your filters"
							: "No projects detected in workspace"}
					</p>
				</div>
			)}
		</div>
	);
}

// Helper function to get project status
function getProjectStatus(project: any): "healthy" | "warning" | "critical" {
	// Simplified status logic (can be enhanced based on actual metrics)
	if (!project.targets || Object.keys(project.targets).length === 0) {
		return "warning";
	}
	return "healthy";
}
