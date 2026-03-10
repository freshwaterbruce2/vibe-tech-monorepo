import { useState } from "react";
import type { SystemActivity, SystemMetrics } from "./dashboard/types";
import { useDashboardRefresh } from "./dashboard/useDashboardRefresh";
import { useNotificationEffects } from "./dashboard/useNotificationEffects";
import { useSystemActions } from "./dashboard/useSystemActions";

const emptyMetrics: SystemMetrics = {
	activeContexts: 0,
	tasksCompleted: 0,
	uptime: "--",
	memoryUsage: "--",
	cpuUsage: "--",
};

export const useDashboardData = () => {
	// State declarations - start empty, populated by real backend calls
	const [activeTab, setActiveTab] = useState("overview");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activities, setActivities] = useState<SystemActivity[]>([]);
	const [metrics, setMetrics] = useState<SystemMetrics>(emptyMetrics);
	const [isPro, _setIsPro] = useState(true);

	// Custom hooks for different features
	const { clearActivity, runDiagnostics } = useSystemActions(
		activities,
		setActivities,
		setMetrics,
	);
	const { loadDashboardData, isInitialLoadRef, dataLoadedRef } =
		useDashboardRefresh(setActivities, setMetrics, setError, setIsLoading);

	// Setup notification effects
	useNotificationEffects(isInitialLoadRef, dataLoadedRef, loadDashboardData);

	return {
		activeTab,
		setActiveTab,
		isLoading,
		error,
		activities,
		metrics,
		loadDashboardData,
		clearActivity,
		runDiagnostics,
		isPro,
	};
};
