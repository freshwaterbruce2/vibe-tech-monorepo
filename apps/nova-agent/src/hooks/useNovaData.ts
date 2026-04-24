/**
 * Hook for fetching Nova Agent data from Tauri backend
 */
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

// Re-export helpers so existing imports keep working
export {
	useDbHealth,
	useActivityLogger,
	useTaskManager,
	parseTaskMetadata,
	getTaskGroundingState,
	formatRelativeTime,
} from "./useNovaHelpers";

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
			const [
				tasks, activities, learningEvents, focusState,
				agentStatus, taskStats, todayCount, context,
				memoryOverview, storageHealth,
			] = await Promise.all([
				invoke<Task[]>("get_tasks", { statusFilter: null, limit: 20 }).catch(() => []),
				invoke<Activity[]>("get_recent_activities", { limit: 20, activityTypeFilter: null }).catch(() => []),
				invoke<LearningEvent[]>("get_learning_events", { limit: 10, eventTypeFilter: null }).catch(() => []),
				invoke<FocusState | null>("get_focus_state").catch(() => null),
				invoke<AgentStatus>("get_agent_status").catch(() => null),
				invoke<TaskStats>("get_task_stats").catch(() => ({})),
				invoke<number>("get_today_activity_count").catch(() => 0),
				invoke<SystemContext>("get_context_snapshot").catch(() => null),
				invoke<MemoryOverview>("get_memory_overview", { limit: 5 }).catch(() => null),
				invoke<StorageHealth>("get_storage_health").catch(() => null),
			]);

			setData({
				tasks, activities, learningEvents, focusState,
				agentStatus, taskStats, todayActivityCount: todayCount,
				context, isLoading: false, error: null,
				memoryOverview, storageHealth,
			});
		} catch (err) {
			console.error("Failed to fetch Nova data:", err);
			setData((prev) => ({ ...prev, isLoading: false, error: String(err) }));
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
