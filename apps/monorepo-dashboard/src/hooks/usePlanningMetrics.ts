import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface PlanningSession {
	sessionId: string;
	projectName: string;
	objective: string;
	complexity: "low" | "medium" | "high";
	status: "in_progress" | "completed" | "blocked";
	startedAt: string;
	completedAt: string | null;
	goalMet: boolean | null;
	filesModified: number;
	errorsEncountered: number;
	contextRecoveries: number;
	phasesCompleted: number;
	totalPhases: number;
}

export interface DailyMetrics {
	date: string;
	completionRate: number;
	avgDuration: number;
	avgFilesModified: number;
	avgErrors: number;
	sessionsStarted: number;
	sessionsCompleted: number;
}

export interface TrialComparison {
	metric: string;
	baseline: number | null;
	current: number | null;
	change: number | null;
	target: number;
	status: "success" | "warning" | "pending";
}

export interface PlanningSummary {
	totalSessions: number;
	activeSessions: number;
	completedSessions: number;
	avgCompletionRate: number;
	avgGoalAdherence: number;
	avgContextRecovery: number;
	avgErrorRate: number;
	trialStartDate: string | null;
	trialEndDate: string | null;
	daysElapsed: number;
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = "http://localhost:3100/api";

// ============================================================================
// Hooks
// ============================================================================

/**
 * GET /api/planning/summary
 * Fetch overall planning metrics summary
 */
export function usePlanningSummary() {
	return useQuery<PlanningSummary, Error>({
		queryKey: ["planning", "summary"],
		queryFn: async () => {
			const res = await fetch(API_BASE_URL + "/planning/summary");
			if (!res.ok) {
				throw new Error("Failed to fetch planning summary: " + res.status + " " + res.statusText);
			}
			return res.json();
		},
		refetchInterval: 60000, // 1 minute
		staleTime: 30000, // 30 seconds
	});
}

/**
 * GET /api/planning/metrics?days=30
 * Fetch daily metrics for trend analysis
 */
export function usePlanningMetrics(days = 30) {
	return useQuery<DailyMetrics[], Error>({
		queryKey: ["planning", "metrics", days],
		queryFn: async () => {
			const res = await fetch(API_BASE_URL + "/planning/metrics?days=" + days);
			if (!res.ok) {
				throw new Error("Failed to fetch planning metrics: " + res.status + " " + res.statusText);
			}
			return res.json();
		},
		refetchInterval: 120000, // 2 minutes
		staleTime: 60000, // 1 minute
	});
}

/**
 * GET /api/planning/comparison
 * Fetch trial vs baseline comparison
 */
export function usePlanningComparison() {
	return useQuery<TrialComparison[], Error>({
		queryKey: ["planning", "comparison"],
		queryFn: async () => {
			const res = await fetch(API_BASE_URL + "/planning/comparison");
			if (!res.ok) {
				throw new Error("Failed to fetch planning comparison: " + res.status + " " + res.statusText);
			}
			return res.json();
		},
		refetchInterval: 300000, // 5 minutes
		staleTime: 120000, // 2 minutes
	});
}

/**
 * GET /api/planning/sessions/active
 * Fetch currently active planning sessions
 */
export function useActivePlanningSessions() {
	return useQuery<PlanningSession[], Error>({
		queryKey: ["planning", "sessions", "active"],
		queryFn: async () => {
			const res = await fetch(API_BASE_URL + "/planning/sessions/active");
			if (!res.ok) {
				throw new Error("Failed to fetch active sessions: " + res.status + " " + res.statusText);
			}
			return res.json();
		},
		refetchInterval: 30000, // 30 seconds
		staleTime: 15000, // 15 seconds
	});
}

/**
 * GET /api/planning/session/:sessionId
 * Fetch details for a specific session
 */
export function usePlanningSession(sessionId: string) {
	return useQuery<PlanningSession | null, Error>({
		queryKey: ["planning", "session", sessionId],
		queryFn: async () => {
			const res = await fetch(API_BASE_URL + "/planning/session/" + encodeURIComponent(sessionId));

			if (res.status === 404) {
				return null;
			}

			if (!res.ok) {
				throw new Error("Failed to fetch session: " + res.status + " " + res.statusText);
			}

			return res.json();
		},
		enabled: !!sessionId,
		refetchInterval: 60000, // 1 minute
		staleTime: 30000, // 30 seconds
	});
}
