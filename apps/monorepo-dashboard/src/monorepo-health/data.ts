import type { LucideIcon } from "lucide-react";
import {
	Bot,
	FolderTree,
	Globe,
	Monitor,
	Package,
	Terminal,
	TrendingUp,
} from "lucide-react";

export type ProjectStatus = "healthy" | "warning" | "critical";
export type ConfigStatus = "aligned" | "drift";
export type Severity = "patch" | "minor" | "major";

export interface ProjectItem {
	name: string;
	path: string;
	status: ProjectStatus;
	deps: number;
	issues: number;
	type: string;
}

export interface ConfigBaseline {
	name: string;
	status: ConfigStatus;
	apps: number;
	drift: number;
}

export interface DependencyUpdate {
	name: string;
	current: string;
	latest: string;
	severity: Severity;
	category: string;
}

export interface CategoryStyle {
	icon: LucideIcon;
	color: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
	AI: { icon: Bot, color: "from-purple-500/30 to-violet-500/30" },
	Desktop: { icon: Monitor, color: "from-blue-500/30 to-cyan-500/30" },
	Trading: { icon: TrendingUp, color: "from-emerald-500/30 to-green-500/30" },
	Web: { icon: Globe, color: "from-orange-500/30 to-amber-500/30" },
	External: { icon: Terminal, color: "from-pink-500/30 to-rose-500/30" },
	Libs: { icon: Package, color: "from-slate-500/30 to-gray-500/30" },
};

export const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
	icon: FolderTree,
	color: "from-slate-500/30 to-gray-500/30",
};

// Note: Config drift now fetched from /api/configs/drift (real filesystem analysis)
// Placeholder data removed - use useConfigDrift() hook in components

// Note: Dependency updates now fetched from /api/dependencies/check (real npm registry data)
// Placeholder data removed - use useDependencies() hook in components
