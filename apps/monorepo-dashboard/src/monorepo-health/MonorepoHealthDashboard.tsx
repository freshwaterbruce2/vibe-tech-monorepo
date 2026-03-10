import {
	Activity,
	ChevronDown,
	Clock,
	Database,
	Layers,
	Package,
	RefreshCw,
	Server,
	Settings,
	Shield,
	Zap,
} from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useMemo,
	useState,
} from "react";
import { BundlesTab } from "../components/bundles";
import { CoverageTab } from "../components/coverage";
import { NxCloudTab } from "../components/nx-cloud";
import { PlanningTab } from "../components/planning/PlanningTab";
import { SecurityTab } from "../components/security";
import { useConfigDrift } from "../hooks/useConfigDrift";
import { useDatabases } from "../hooks/useDatabases";
import { useDependencies } from "../hooks/useDependencies";
import { useProjects } from "../hooks/useProjects";
import { useServices } from "../hooks/useServices";
import { useWorkflow } from "../hooks/useWorkflow";
import { AnimatedCounter } from "./components/AnimatedCounter";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { PhaseCard } from "./components/PhaseCard";
import { ProjectTree } from "./components/ProjectTree";
import { SeverityBadge } from "./components/SeverityBadge";
import { StatusBadge } from "./components/StatusBadge";
import {
	CATEGORY_STYLES,
	DEFAULT_CATEGORY_STYLE,
	type ProjectItem,
} from "./data";

function projectToItem(name: string, project: any): ProjectItem {
	return {
		name,
		path: project.root ?? name,
		status: "healthy",
		deps: Array.isArray(project.implicitDependencies)
			? project.implicitDependencies.length
			: 0,
		issues: 0,
		type: project.projectType ?? "project",
	};
}

export function MonorepoHealthDashboard() {
	const [activeTab, setActiveTab] = useState<
		| "overview"
		| "coverage"
		| "bundles"
		| "security"
		| "dependencies"
		| "configs"
		| "nx-cloud"
		| "workflow"
		| "planning"
	>("overview");
	const [expandedCategories, setExpandedCategories] = useState<
		Record<string, boolean>
	>({});
	const [severityFilter, setSeverityFilter] = useState<
		"all" | "critical" | "recommended" | "optional"
	>("all");
	const [expandedDeps, setExpandedDeps] = useState<Set<string>>(new Set());
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [selectedActions, setSelectedActions] = useState<number[]>([]);

	const { metrics, categorizedProjects } = useProjects();
	const {
		metrics: serviceMetrics,
		services,
		error: servicesError,
	} = useServices();
	const { metrics: dbMetrics, databases, error: dbError } = useDatabases();
	const {
		updates: dependencyUpdates,
		loading: depsLoading,
		error: depsError,
	} = useDependencies();
	const {
		drifts: configDrifts,
		loading: configsLoading,
		error: configsError,
	} = useConfigDrift();
	const {
		phase,
		loading: workflowLoading,
		error: workflowError,
		proposal,
		executionReport,
		runAudit,
		runExecute,
		reset,
	} = useWorkflow();

	const defaultExpandedCategories = useMemo(
		() =>
			Object.fromEntries(
				Object.keys(categorizedProjects || {})
					.slice(0, 2)
					.map((k) => [k, true]),
			),
		[categorizedProjects],
	);

	const resolvedExpandedCategories =
		Object.keys(expandedCategories).length > 0
			? expandedCategories
			: defaultExpandedCategories;

	const totalProjects = metrics.totalProjects;

	const toggleCategory = (cat: string) => {
		setExpandedCategories((prev) => {
			const base =
				Object.keys(prev).length > 0 ? prev : defaultExpandedCategories;
			return { ...base, [cat]: !base[cat] };
		});
	};

	const healthScore = useMemo(() => {
		const projectScore = metrics.totalProjects
			? Math.round((metrics.healthyProjects / metrics.totalProjects) * 100)
			: 100;
		const serviceScore = serviceMetrics.totalServices
			? Math.round(
					(serviceMetrics.runningServices / serviceMetrics.totalServices) * 100,
				)
			: 100;
		const dbScore = dbMetrics.totalDatabases
			? Math.round(
					(dbMetrics.connectedDatabases / dbMetrics.totalDatabases) * 100,
				)
			: 100;

		return Math.round((projectScore + serviceScore + dbScore) / 3);
	}, [metrics, serviceMetrics, dbMetrics]);

	const statCards = useMemo(
		() => [
			{
				label: "Health Score",
				value: healthScore,
				suffix: "%",
				icon: Activity,
				iconClass: "text-emerald-400",
				cardClass:
					"bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20 hover:border-emerald-500/40",
			},
			{
				label: "Total Projects",
				value: totalProjects,
				icon: Layers,
				iconClass: "text-cyan-300",
				cardClass:
					"bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20 hover:border-blue-500/40",
			},
			{
				label: "Dependencies",
				value: metrics.totalDependencies,
				icon: Package,
				iconClass: "text-violet-400",
				cardClass:
					"bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20 hover:border-violet-500/40",
			},
			{
				label: "Config Issues",
				value: metrics.configIssues,
				icon: Settings,
				iconClass: "text-amber-400",
				cardClass:
					"bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 hover:border-amber-500/40",
			},
		],
		[
			healthScore,
			totalProjects,
			metrics.totalDependencies,
			metrics.configIssues,
		],
	);

	const handleStartWorkflow = useCallback(() => {
		runAudit();
	}, [runAudit]);

	const handleConfirmExecution = useCallback(() => {
		setShowConfirmModal(false);
		runExecute(selectedActions);
	}, [runExecute, selectedActions]);

	const handleCancelExecution = useCallback(() => {
		setShowConfirmModal(false);
		setSelectedActions([]);
	}, []);

	const categories = useMemo(() => {
		const keys = Object.keys(categorizedProjects || {});
		return keys.map((key) => ({
			key,
			...(CATEGORY_STYLES[key] || DEFAULT_CATEGORY_STYLE),
		}));
	}, [categorizedProjects]);

	const projectItemsByCategory = useMemo(() => {
		const result: Record<string, ProjectItem[]> = {};

		for (const [category, projects] of Object.entries(
			categorizedProjects || {},
		)) {
			result[category] = projects.map((p: any) =>
				projectToItem(p.name ?? p.projectName ?? p.id ?? "unknown", p),
			);
		}

		return result;
	}, [categorizedProjects]);

	const runningServices = serviceMetrics.runningServices;
	const connectedDatabases = dbMetrics.connectedDatabases;

	const filteredDependencies = useMemo(() => {
		if (severityFilter === "all") return dependencyUpdates;
		return dependencyUpdates.filter((dep) => dep.severity === severityFilter);
	}, [dependencyUpdates, severityFilter]);

	const toggleDepExpanded = useCallback((depName: string) => {
		setExpandedDeps((prev) => {
			const next = new Set(prev);
			if (next.has(depName)) {
				next.delete(depName);
			} else {
				next.add(depName);
			}
			return next;
		});
	}, []);

	const handleUpdateDependency = useCallback(
		(depName: string, latest: string) => {
			// Copy command to clipboard for user to run
			const command = `pnpm update ${depName}@${latest}`;
			navigator.clipboard
				.writeText(command)
				.then(() => {
					alert(
						`Update command copied to clipboard:\n\n${command}\n\nRun this in your terminal to update the dependency.`,
					);
				})
				.catch(() => {
					alert(
						`Run this command to update:\n\npnpm update ${depName}@${latest}`,
					);
				});
		},
		[],
	);

	return (
		<div
			className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6"
			role="main"
		>
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
							<Layers size={24} />
						</div>
						<div>
							<h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
								@vibetech/workspace
							</h1>
							<p className="text-slate-400 text-sm">
								Monorepo Health Dashboard
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-sm text-slate-400">
							<Clock size={14} />
							{phase === 0
								? "Ready"
								: phase === 1
									? "Auditing..."
									: phase === 2
										? "Proposal ready"
										: phase === 3
											? "Executing..."
											: "Complete"}
						</div>
						<button
							onClick={phase === 0 ? handleStartWorkflow : reset}
							disabled={workflowLoading}
							onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									if (phase === 0) {
										handleStartWorkflow();
									} else {
										reset();
									}
								}
							}}
							className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
								workflowLoading
									? "bg-violet-500/50 cursor-not-allowed"
									: phase > 0 && phase < 4
										? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
										: "bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/30"
							}`}
							type="button"
							aria-label={
								phase === 0
									? "Run workspace audit"
									: phase === 4
										? "Reset workflow"
										: "Cancel workflow"
							}
							aria-busy={workflowLoading}
						>
							<RefreshCw
								size={16}
								className={workflowLoading ? "animate-spin" : ""}
							/>
							{phase === 0 ? "Run Audit" : phase === 4 ? "Reset" : "Cancel"}
						</button>
					</div>
				</div>

				{workflowError && (
					<div className="mt-4 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-3">
						Workflow error: {workflowError}
					</div>
				)}
			</div>

			<div className="grid grid-cols-4 gap-4 mb-8">
				{statCards.map((stat) => (
					<div
						key={stat.label}
						className={`p-4 rounded-xl border transition-all group ${stat.cardClass}`}
					>
						<div className="flex items-center justify-between mb-2">
							<stat.icon size={20} className={stat.iconClass} />
							<span className="text-xs text-slate-400">{stat.label}</span>
						</div>
						<div className="text-3xl font-bold">
							<AnimatedCounter value={stat.value} />
							{stat.suffix}
						</div>
					</div>
				))}
			</div>

			<div
				className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg w-fit"
				role="tablist"
				aria-label="Dashboard tabs"
			>
				{(
					[
						"overview",
						"coverage",
						"bundles",
						"security",
						"dependencies",
						"configs",
						"nx-cloud",
						"workflow",
						"planning",
					] as const
				).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								setActiveTab(tab);
							}
						}}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
							activeTab === tab
								? "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
								: "text-slate-400 hover:text-white"
						}`}
						type="button"
						role="tab"
						aria-selected={activeTab === tab}
						aria-controls={`${tab}-panel`}
						tabIndex={activeTab === tab ? 0 : -1}
						aria-label={`${tab} tab`}
					>
						{tab}
					</button>
				))}
			</div>

			<div className="grid grid-cols-3 gap-6">
				{activeTab === "overview" && (
					<>
						<div className="col-span-2 bg-white/5 rounded-xl p-4 border border-white/10">
							<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
								<Layers size={20} className="text-violet-400" />
								Project Structure
							</h3>
							{categories.map(({ key, icon, color }) => (
								<ProjectTree
									key={key}
									category={key}
									icon={icon}
									items={projectItemsByCategory[key] ?? []}
									color={color}
									expanded={Boolean(resolvedExpandedCategories[key])}
									onToggle={() => toggleCategory(key)}
								/>
							))}
						</div>

						<div className="space-y-4">
							<div className="bg-white/5 rounded-xl p-4 border border-white/10">
								<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
									<Server size={20} className="text-cyan-300" />
									Runtime Reachability
								</h3>

								<div className="space-y-3">
									<div className="flex items-center justify-between text-sm">
										<span className="text-slate-300">Services running</span>
										<div className="flex items-center gap-2">
											<span className="text-slate-400">
												{runningServices}/{serviceMetrics.totalServices}
											</span>
											<StatusBadge
												status={
													runningServices === serviceMetrics.totalServices
														? "aligned"
														: "drift"
												}
											/>
										</div>
									</div>

									<div className="flex items-center justify-between text-sm">
										<span className="text-slate-300">Databases connected</span>
										<div className="flex items-center gap-2">
											<span className="text-slate-400">
												{connectedDatabases}/{dbMetrics.totalDatabases}
											</span>
											<StatusBadge
												status={
													connectedDatabases === dbMetrics.totalDatabases
														? "aligned"
														: "drift"
												}
											/>
										</div>
									</div>

									{(servicesError ?? dbError) && (
										<div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2">
											Backend not reachable (start API with `pnpm --filter
											monorepo-dashboard dev:server` or `dev:all`).
										</div>
									)}

									<div className="pt-2 border-t border-white/10">
										<p className="text-xs text-slate-500 mb-2">Live checks</p>
										<div className="space-y-1">
											{services.slice(0, 6).map((s) => (
												<div
													key={s.port}
													className="flex items-center justify-between text-xs"
												>
													<span className="text-slate-400">{s.name}</span>
													<span
														className={
															s.status === "running"
																? "text-emerald-400"
																: "text-slate-500"
														}
													>
														{s.status}
													</span>
												</div>
											))}
											{services.length > 6 && (
												<div className="text-xs text-slate-600">
													+{services.length - 6} more
												</div>
											)}
										</div>
										<div className="space-y-1 mt-3">
											{databases.slice(0, 5).map((d) => (
												<div
													key={d.path}
													className="flex items-center justify-between text-xs"
												>
													<span className="text-slate-400">{d.name}</span>
													<span
														className={
															d.status === "connected"
																? "text-emerald-400"
																: "text-amber-300"
														}
													>
														{d.status}
													</span>
												</div>
											))}
											{databases.length > 5 && (
												<div className="text-xs text-slate-600">
													+{databases.length - 5} more
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="bg-white/5 rounded-xl p-4 border border-white/10">
								<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
									<Shield size={20} className="text-emerald-400" />
									Stack Versions
								</h3>
								<div className="space-y-3">
									{[
										{ name: "React", version: "19.0.0", target: "19.x ✓" },
										{ name: "TypeScript", version: "5.9.0", target: "5.9.x ✓" },
										{ name: "Nx", version: "—", target: "workspace" },
										{ name: "pnpm", version: "9.15.0", target: "workspace" },
									].map((item) => (
										<div
											key={item.name}
											className="flex items-center justify-between text-sm"
										>
											<span className="text-slate-300">{item.name}</span>
											<div className="flex items-center gap-2">
												<span className="text-slate-400">{item.version}</span>
												<span className="text-xs text-emerald-400">
													{item.target}
												</span>
											</div>
										</div>
									))}
								</div>
							</div>

							<div className="bg-white/5 rounded-xl p-4 border border-white/10">
								<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
									<Zap size={20} className="text-amber-400" />
									Conventions
								</h3>
								<div className="space-y-2 text-sm">
									{[
										"360-line file limit",
										"pnpm workspace protocol",
										"Code on C: / Data on D:",
										"Local-only development",
									].map((t) => (
										<div key={t} className="flex items-center gap-2">
											<Database size={14} className="text-emerald-400" />
											<span>{t}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</>
				)}

				{activeTab === "coverage" && (
					<div className="col-span-3">
						<CoverageTab />
					</div>
				)}

				{activeTab === "bundles" && (
					<div className="col-span-3">
						<BundlesTab />
					</div>
				)}

				{activeTab === "security" && (
					<div className="col-span-3">
						<SecurityTab />
					</div>
				)}

				{activeTab === "nx-cloud" && (
					<div className="col-span-3">
						<NxCloudTab />
					</div>
				)}

				{activeTab === "dependencies" && (
					<div className="col-span-3 bg-white/5 rounded-xl p-4 border border-white/10">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<Package size={20} className="text-violet-400" />
								Dependency Updates Available {depsLoading && "(scanning...)"}
							</h3>

							<div
								className="flex gap-2"
								role="group"
								aria-label="Filter by severity"
							>
								{(["all", "critical", "recommended", "optional"] as const).map(
									(filter) => {
										const count =
											filter === "all"
												? dependencyUpdates.length
												: dependencyUpdates.filter((d) => d.severity === filter)
														.length;

										return (
											<button
												key={filter}
												onClick={() => setSeverityFilter(filter)}
												onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														setSeverityFilter(filter);
													}
												}}
												className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
													severityFilter === filter
														? filter === "critical"
															? "bg-red-500/20 text-red-300 border border-red-500/40"
															: filter === "recommended"
																? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
																: filter === "optional"
																	? "bg-slate-500/20 text-slate-300 border border-slate-500/40"
																	: "bg-violet-500/20 text-violet-300 border border-violet-500/40"
														: "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
												}`}
												type="button"
												role="radio"
												aria-checked={severityFilter === filter}
												aria-label={`Filter by ${filter} ${count > 0 ? `(${count})` : ""}`}
											>
												{filter} {count > 0 && `(${count})`}
											</button>
										);
									},
								)}
							</div>
						</div>

						{depsError && (
							<div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-3 mb-4">
								Failed to fetch dependency updates: {depsError}. Make sure the
								backend is running with{" "}
								<code className="bg-black/20 px-1 py-0.5 rounded">
									pnpm --filter monorepo-dashboard dev:server
								</code>
								.
							</div>
						)}

						<div className="space-y-2">
							{filteredDependencies.length === 0 && !depsLoading && (
								<div className="text-center py-8 text-slate-400">
									{depsError
										? "Could not load dependency updates"
										: severityFilter === "all"
											? "All dependencies are up to date! 🎉"
											: `No ${severityFilter} updates found`}
								</div>
							)}

							{filteredDependencies.map((dep) => {
								const isExpanded = expandedDeps.has(dep.name);
								const hasProjects =
									dep.affectedProjects && dep.affectedProjects.length > 0;

								return (
									<div
										key={dep.name}
										className="rounded-lg bg-white/5 overflow-hidden"
									>
										<div
											className={`flex items-center justify-between p-3 transition-all ${
												hasProjects ? "cursor-pointer hover:bg-white/10" : ""
											}`}
											onClick={() => hasProjects && toggleDepExpanded(dep.name)}
											onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
												if (
													hasProjects &&
													(e.key === "Enter" || e.key === " ")
												) {
													e.preventDefault();
													toggleDepExpanded(dep.name);
												}
											}}
											role={hasProjects ? "button" : undefined}
											tabIndex={hasProjects ? 0 : undefined}
											aria-expanded={hasProjects ? isExpanded : undefined}
											aria-label={
												hasProjects
													? `Toggle projects using ${dep.name}`
													: undefined
											}
										>
											<div className="flex items-center gap-4">
												{hasProjects && (
													<ChevronDown
														size={16}
														className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
													/>
												)}
												<span className="font-medium">{dep.name}</span>
												<span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
													{dep.category}
												</span>
												{hasProjects && (
													<span className="text-xs text-slate-600">
														({dep.affectedProjects.length} project
														{dep.affectedProjects.length !== 1 ? "s" : ""})
													</span>
												)}
											</div>
											<div className="flex items-center gap-3">
												<span className="text-slate-400">{dep.current}</span>
												<span className="text-slate-600">→</span>
												<span className="text-emerald-400">{dep.latest}</span>
												<SeverityBadge
													severity={
														dep.severity === "critical"
															? "major"
															: dep.severity === "recommended"
																? "minor"
																: "patch"
													}
												/>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleUpdateDependency(dep.name, dep.latest);
													}}
													onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															e.stopPropagation();
															handleUpdateDependency(dep.name, dep.latest);
														}
													}}
													className="px-2 py-1 text-xs font-medium rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-all"
													type="button"
													aria-label={`Update ${dep.name} from ${dep.current} to ${dep.latest}`}
												>
													Update
												</button>
											</div>
										</div>

										{isExpanded && hasProjects && (
											<div className="px-3 pb-3 pt-0">
												<div className="ml-6 pl-4 border-l border-white/10">
													<p className="text-xs text-slate-500 mb-2">
														Used by:
													</p>
													<div className="space-y-1">
														{dep.affectedProjects.map((project) => (
															<div
																key={project}
																className="text-sm text-slate-300 flex items-center gap-2"
															>
																<span className="w-1 h-1 bg-violet-400 rounded-full" />
																{project}
															</div>
														))}
													</div>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{!depsError && dependencyUpdates.length > 0 && (
							<p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
								<span className="inline-block w-2 h-2 bg-emerald-400 rounded-full" />
								Live data from npm registry
							</p>
						)}
					</div>
				)}

				{activeTab === "configs" && (
					<div className="col-span-3 bg-white/5 rounded-xl p-4 border border-white/10">
						<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
							<Settings size={20} className="text-violet-400" />
							Config Alignment Status {configsLoading && "(analyzing...)"}
						</h3>

						{configsError && (
							<div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-3 mb-4">
								Failed to fetch config drift: {configsError}. Make sure the
								backend is running.
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							{configDrifts.length === 0 && !configsLoading && (
								<div className="col-span-2 text-center py-8 text-slate-400">
									{configsError
										? "Could not load config drift data"
										: "No config files found"}
								</div>
							)}

							{configDrifts.map((config) => {
								const status =
									config.driftingProjects === 0 ? "aligned" : "drift";

								return (
									<div
										key={config.configFile}
										className="p-4 rounded-lg bg-white/5 border border-white/10"
									>
										<div className="flex items-center justify-between mb-2">
											<span className="font-medium">{config.configFile}</span>
											<StatusBadge status={status} />
										</div>
										<div className="flex items-center justify-between text-sm text-slate-400 mb-2">
											<span>{config.totalProjects} projects checked</span>
											<span>
												{config.driftingProjects} drift
												{config.driftingProjects !== 1 ? "s" : ""}
											</span>
										</div>

										{config.driftingProjects > 0 && (
											<div className="mt-2 pt-2 border-t border-white/10">
												<p className="text-xs text-slate-500 mb-1">
													Projects with drift:
												</p>
												<div className="space-y-1">
													{config.drifts.slice(0, 3).map((drift) => (
														<div
															key={drift.projectName}
															className="text-xs text-slate-400 flex items-center gap-2"
														>
															<span className="w-1 h-1 bg-amber-400 rounded-full" />
															{drift.projectName} ({drift.differences.length}{" "}
															diff{drift.differences.length !== 1 ? "s" : ""})
														</div>
													))}
													{config.drifts.length > 3 && (
														<div className="text-xs text-slate-600">
															+{config.drifts.length - 3} more
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{!configsError && configDrifts.length > 0 && (
							<p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
								<span className="inline-block w-2 h-2 bg-emerald-400 rounded-full" />
								Live data from filesystem config analysis
							</p>
						)}
					</div>
				)}

				{activeTab === "workflow" && (
					<div className="col-span-3">
						<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
							<Activity size={20} className="text-violet-400" />
							Weekly Maintenance Workflow
						</h3>

						{/* Phase Cards */}
						<div className="grid grid-cols-3 gap-4 mb-6">
							<PhaseCard
								phase={1}
								title="Audit"
								description="Scan and analyze"
								active={phase === 1}
								completed={phase > 1}
								items={[
									"Run dependency audit",
									"Compare configs against baselines",
									"Check for framework updates",
									"Identify drift between apps",
								]}
							/>
							<PhaseCard
								phase={2}
								title="Propose"
								description="Generate report"
								active={phase === 2}
								completed={phase > 2}
								items={[
									"Critical security updates",
									"Recommended updates",
									"Config alignment issues",
									"Proposed actions",
								]}
							/>
							<PhaseCard
								phase={3}
								title="Execute"
								description="Apply changes"
								active={phase === 3}
								completed={phase > 3}
								items={[
									"Create backup state",
									"Execute approved changes",
									"Run pnpm install",
									"Verify with nx affected:build",
								]}
							/>
						</div>

						{/* Proposal Results */}
						{proposal && phase >= 2 && (
							<div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
								<div className="flex items-center justify-between mb-4">
									<h4 className="text-lg font-semibold">Proposed Actions</h4>
									<div className="flex gap-2 text-sm">
										<span className="text-red-300">
											{proposal.summary.criticalActions} critical
										</span>
										<span className="text-amber-300">
											{proposal.summary.recommendedActions} recommended
										</span>
										<span className="text-slate-400">
											{proposal.summary.optionalActions} optional
										</span>
									</div>
								</div>

								<div className="space-y-2 max-h-64 overflow-y-auto">
									{proposal.actions.map((action, idx) => (
										<div
											key={idx}
											className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-start justify-between"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<SeverityBadge
														severity={
															action.severity === "critical"
																? "major"
																: action.severity === "recommended"
																	? "minor"
																	: "patch"
														}
													/>
													<span className="font-medium text-sm">
														{action.title}
													</span>
												</div>
												<p className="text-xs text-slate-400 mb-1">
													{action.description}
												</p>
												<code className="text-xs text-violet-300 bg-black/30 px-2 py-0.5 rounded">
													{action.command}
												</code>
											</div>
											<input
												type="checkbox"
												checked={selectedActions.includes(idx)}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedActions((prev) => [...prev, idx]);
													} else {
														setSelectedActions((prev) =>
															prev.filter((i) => i !== idx),
														);
													}
												}}
												className="mt-1"
											/>
										</div>
									))}
								</div>

								{phase === 2 && (
									<div className="mt-4 flex justify-end gap-3">
										<button
											onClick={reset}
											className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all font-medium"
											type="button"
										>
											Cancel
										</button>
										<button
											onClick={() => {
												if (selectedActions.length === 0) {
													alert("Please select at least one action to execute");
													return;
												}
												setShowConfirmModal(true);
											}}
											disabled={selectedActions.length === 0}
											className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
											type="button"
										>
											Execute Selected ({selectedActions.length})
										</button>
									</div>
								)}
							</div>
						)}

						{/* Execution Results */}
						{executionReport && phase >= 3 && (
							<div className="bg-white/5 rounded-xl p-4 border border-white/10">
								<h4 className="text-lg font-semibold mb-4">
									Execution Results
								</h4>

								<div className="flex gap-4 mb-4 text-sm">
									<span className="text-slate-300">
										Total: {executionReport.summary.totalAttempted}
									</span>
									<span className="text-emerald-300">
										Successful: {executionReport.summary.successful}
									</span>
									<span className="text-red-300">
										Failed: {executionReport.summary.failed}
									</span>
								</div>

								<div className="space-y-2 max-h-64 overflow-y-auto">
									{executionReport.results.map((result, idx) => (
										<div
											key={idx}
											className={`p-3 rounded-lg border ${
												result.success
													? "bg-emerald-500/5 border-emerald-500/30"
													: "bg-red-500/5 border-red-500/30"
											}`}
										>
											<div className="flex items-center gap-2 mb-1">
												<span
													className={
														result.success ? "text-emerald-400" : "text-red-400"
													}
												>
													{result.success ? "✓" : "✗"}
												</span>
												<span className="font-medium text-sm">
													{result.action.title}
												</span>
											</div>
											{result.output && (
												<p className="text-xs text-slate-400 mt-1">
													{result.output}
												</p>
											)}
											{result.error && (
												<p className="text-xs text-red-300 mt-1">
													Error: {result.error}
												</p>
											)}
										</div>
									))}
								</div>

								{phase === 4 && (
									<div className="mt-4 flex justify-end">
										<button
											onClick={reset}
											className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/30 font-medium transition-all"
											type="button"
										>
											Start New Workflow
										</button>
									</div>
								)}
							</div>
						)}

						{/* Confirmation Modal */}
						<ConfirmationDialog
							isOpen={showConfirmModal}
							title="Confirm Workflow Execution"
							message={`You are about to execute ${selectedActions.length} action${selectedActions.length !== 1 ? "s" : ""}. This will make changes to your monorepo. Continue?`}
							confirmText="Execute"
							cancelText="Cancel"
							onConfirm={handleConfirmExecution}
							onCancel={handleCancelExecution}
							danger={true}
						/>
					</div>
				)}

				{activeTab === "planning" && (
					<div className="col-span-3">
						<PlanningTab />
					</div>
				)}
			</div>

			<div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-slate-500">
				<span>Built with the monorepo-maintenance skill</span>
				<div className="flex items-center gap-4">
					<span>React • TypeScript • Nx</span>
				</div>
			</div>
		</div>
	);
}
