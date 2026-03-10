/**
 * Hook for fetching Nova Agent data from Tauri backend
 */
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

// Types matching Rust backend
export interface Task {
	id: string;
	title: string;
	status: string;
	created_at: number;
	updated_at: number;
	metadata: string | null;
}

export interface TaskReviewMetadata {
	description?: string;
	project_path?: string;
	review_artifact_path?: string;
	review_completed?: boolean;
	review_target_path?: string;
	review_evidence_count?: number;
	reviewed_at?: string;
	review_version?: string;
	plan_grounded?: boolean;
	generic_plan_flags?: string[];
	auto_execute?: boolean;
	requires_approval?: boolean;
	approved_for_execution?: boolean;
	risk?: string;
}

export interface Activity {
	id: number;
	timestamp: number;
	activity_type: string;
	details: string | null;
	metadata: string | null;
}

export interface LearningEvent {
	id: number;
	timestamp: number;
	event_type: string;
	context: string | null;
	outcome: string | null;
	metadata: string | null;
}

export interface FocusState {
	last_seen: number;
	focus_started_at: number;
	process_name: string;
	window_title: string;
	process_id: number;
}

export interface AgentMessage {
	id?: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: number;
	citations?: Array<string | { title: string }>;
}

export interface AgentStatus {
	active_conversations: string[];
	memory_count: number;
	capabilities: string[];
	current_project: string | null;
	ipc_connected?: boolean;
	active_model: string;
}

export type TaskStats = Record<string, number>;

export interface SystemContext {
	timestamp: number;
	workspace_root: string;
	git_status: {
		branch: string;
		modified_files: string[];
		staged_files: string[];
		behind: number;
		ahead: number;
	} | null;
	active_processes: string[];
	current_project: {
		name: string;
		path: string;
		project_type: string;
	} | null;
	recent_files: Array<{
		path: string;
		language: string;
		last_modified: number;
	}>;
	deep_work_minutes: number;
}

export interface MemoryEntry {
	id: string;
	memory_type: string;
	content: string;
	context: string | null;
	importance: number;
	access_count: number;
	created_at: number;
	last_accessed: number;
	expires_at: number | null;
	tags: string[];
}

export interface MemoryOverview {
	count: number;
	recent: MemoryEntry[];
}

export interface StorageHealth {
	database_path: string;
	on_d_drive: boolean;
	db_initialized: boolean;
	message: string;
}

export interface NovaData {
	tasks: Task[];
	activities: Activity[];
	learningEvents: LearningEvent[];
	focusState: FocusState | null;
	agentStatus: AgentStatus | null;
	taskStats: TaskStats;
	todayActivityCount: number;
	context: SystemContext | null;
	isLoading: boolean;
	error: string | null;
	memoryOverview: MemoryOverview | null;
	storageHealth: StorageHealth | null;
}

export function useNovaData(
	autoRefresh: boolean = true,
	refreshInterval: number = 30000,
) {
	const [data, setData] = useState<NovaData>({
		tasks: [],
		activities: [],
		learningEvents: [],
		focusState: null,
		agentStatus: null,
		taskStats: {},
		todayActivityCount: 0,
		context: null,
		isLoading: true,
		error: null,
		memoryOverview: null,
		storageHealth: null,
	});

	const fetchData = useCallback(async () => {
		try {
			// Fetch all data in parallel
			const [
				tasks,
				activities,
				learningEvents,
				focusState,
				agentStatus,
				taskStats,
				todayCount,
				context,
				memoryOverview,
				storageHealth,
			] = await Promise.all([
				invoke<Task[]>("get_tasks", { statusFilter: null, limit: 20 }).catch(
					() => [],
				),
				invoke<Activity[]>("get_recent_activities", {
					limit: 20,
					activityTypeFilter: null,
				}).catch(() => []),
				invoke<LearningEvent[]>("get_learning_events", {
					limit: 10,
					eventTypeFilter: null,
				}).catch(() => []),
				invoke<FocusState | null>("get_focus_state").catch(() => null),
				invoke<AgentStatus>("get_agent_status").catch(() => null),
				invoke<TaskStats>("get_task_stats").catch(() => ({})),
				invoke<number>("get_today_activity_count").catch(() => 0),
				invoke<SystemContext>("get_context_snapshot").catch(() => null),
				invoke<MemoryOverview>("get_memory_overview", { limit: 5 }).catch(
					() => null,
				),
				invoke<StorageHealth>("get_storage_health").catch(() => null),
			]);

			setData({
				tasks,
				activities,
				learningEvents,
				focusState,
				agentStatus,
				taskStats,
				todayActivityCount: todayCount,
				context,
				isLoading: false,
				error: null,
				memoryOverview,
				storageHealth,
			});
		} catch (err) {
			console.error("Failed to fetch Nova data:", err);
			setData((prev) => ({
				...prev,
				isLoading: false,
				error: String(err),
			}));
		}
	}, []);

	useEffect(() => {
		void fetchData();

		if (autoRefresh) {
			const interval = setInterval(() => {
				void fetchData();
			}, refreshInterval);
			return () => clearInterval(interval);
		}
		return undefined;
	}, [fetchData, autoRefresh, refreshInterval]);

	return { ...data, refresh: fetchData };
}

/**
 * Hook for database health monitoring
 */
export function useDbHealth() {
	const [isHealthy, setIsHealthy] = useState(false);
	const [lastCheck, setLastCheck] = useState<Date | null>(null);

	const checkHealth = useCallback(async () => {
		try {
			const result = await invoke<boolean>("db_health_check");
			setIsHealthy(result);
			setLastCheck(new Date());
		} catch (err) {
			console.error("Database health check failed:", err);
			setIsHealthy(false);
		}
	}, []);

	useEffect(() => {
		void checkHealth();
		const interval = setInterval(() => {
			void checkHealth();
		}, 30000);
		return () => clearInterval(interval);
	}, [checkHealth]);

	return { isHealthy, lastCheck };
}

/**
 * Hook for real-time activity logging
 */
export function useActivityLogger() {
	const logActivity = useCallback(
		async (activityType: string, details: string) => {
			try {
				await invoke("log_activity", { activityType, details });
			} catch (err) {
				console.error("Failed to log activity:", err);
			}
		},
		[],
	);

	return { logActivity };
}

/**
 * Hook for task management
 */
export function useTaskManager() {
	const updateTaskStatus = useCallback(
		async (taskId: string, newStatus: string) => {
			try {
				const result = await invoke<boolean>("update_task_status", {
					taskId,
					newStatus,
				});
				return result;
			} catch (err) {
				console.error("Failed to update task:", err);
				return false;
			}
		},
		[],
	);

	const getTask = useCallback(async (taskId: string) => {
		try {
			return await invoke<Task | null>("get_task_by_id", { taskId });
		} catch (err) {
			console.error("Failed to get task:", err);
			return null;
		}
	}, []);

	const createTask = useCallback(
		async (data: {
			title: string;
			description?: string;
			priority?: string;
			tags?: string[];
			parentTaskId?: string;
			estimatedMinutes?: number;
			projectPath?: string;
		}) => {
			try {
				const result = await invoke<{
					taskId: string;
					isDuplicate: boolean;
					duplicateOf?: string;
				}>("create_task", {
					request: {
						title: data.title,
						description: data.description,
						priority: data.priority,
						tags: data.tags,
						parent_task_id: data.parentTaskId,
						estimated_minutes: data.estimatedMinutes,
						project_path: data.projectPath,
					},
				});
				return result;
			} catch (err) {
				console.error("Failed to create task:", err);
				throw err;
			}
		},
		[],
	);

	return { updateTaskStatus, getTask, createTask };
}

export function parseTaskMetadata(metadata: string | null): TaskReviewMetadata | null {
	if (!metadata) {
		return null;
	}

	try {
		return JSON.parse(metadata) as TaskReviewMetadata;
	} catch (error) {
		console.error("Failed to parse task metadata:", error);
		return null;
	}
}

export function getTaskGroundingState(task: Task): {
	label: "grounded" | "blocked_review" | "awaiting_approval" | "ungrounded" | "unknown";
	detail: string;
} {
	const metadata = parseTaskMetadata(task.metadata);
	if (!metadata) {
		return {
			label: "unknown",
			detail: "No structured task metadata is available.",
		};
	}

	if (task.status === "blocked_review") {
		return {
			label: "blocked_review",
			detail: "Blocked until a grounded project review exists for the target path.",
		};
	}

	if (metadata.review_completed && metadata.plan_grounded) {
		return {
			label: "grounded",
			detail: metadata.review_artifact_path
				? `Grounded by ${metadata.review_artifact_path}`
				: "Grounded by a validated project review.",
		};
	}

	if (task.status === "awaiting_approval" || metadata.requires_approval) {
		return {
			label: "awaiting_approval",
			detail: "Grounded task is waiting for explicit approval before execution.",
		};
	}

	if (metadata.review_completed === false || metadata.plan_grounded === false) {
		const flags = metadata.generic_plan_flags?.length
			? metadata.generic_plan_flags.join(" | ")
			: "Review metadata is incomplete.";
		return {
			label: "ungrounded",
			detail: flags,
		};
	}

	return {
		label: "unknown",
		detail: "Grounding status could not be determined from task metadata.",
	};
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
	const now = Math.floor(Date.now() / 1000);
	const diff = now - timestamp;

	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
	return `${Math.floor(diff / 86400)} days ago`;
}
