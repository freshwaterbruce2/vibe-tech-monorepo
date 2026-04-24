/**
 * Supplementary hooks for Nova Agent data operations.
 * Split from useNovaData to keep each file focused.
 */
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { Task, TaskReviewMetadata } from "./useNovaData";

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

/**
 * Parse task metadata JSON string into typed object.
 */
export function parseTaskMetadata(metadata: string | null): TaskReviewMetadata | null {
	if (!metadata) return null;
	try {
		return JSON.parse(metadata) as TaskReviewMetadata;
	} catch (error) {
		console.error("Failed to parse task metadata:", error);
		return null;
	}
}

/**
 * Determine the grounding state of a task based on its metadata.
 */
export function getTaskGroundingState(task: Task): {
	label: "grounded" | "blocked_review" | "awaiting_approval" | "ungrounded" | "unknown";
	detail: string;
} {
	const metadata = parseTaskMetadata(task.metadata);
	if (!metadata) {
		return { label: "unknown", detail: "No structured task metadata is available." };
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
		return { label: "ungrounded", detail: flags };
	}

	return { label: "unknown", detail: "Grounding status could not be determined from task metadata." };
}

/**
 * Format a unix timestamp to relative time string.
 */
export function formatRelativeTime(timestamp: number): string {
	const now = Math.floor(Date.now() / 1000);
	const diff = now - timestamp;

	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
	return `${Math.floor(diff / 86400)} days ago`;
}
