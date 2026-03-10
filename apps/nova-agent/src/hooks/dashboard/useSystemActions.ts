import { useNotifications } from "@/context/NotificationsContext";
import { toast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { SystemActivity, SystemMetrics } from "./types";

export const useSystemActions = (
	activities: SystemActivity[],
	setActivities: React.Dispatch<React.SetStateAction<SystemActivity[]>>,
	setMetrics: React.Dispatch<React.SetStateAction<SystemMetrics>>,
) => {
	const { addNotification } = useNotifications();
	const { trackEvent } = useAnalytics();

	// Clear activity function
	const clearActivity = (activityId: number) => {
		try {
			// Find the activity to be cleared
			const activityToClear = activities.find((a) => a.id === activityId);

			// Filter out the activity
			setActivities((prev) => prev.filter((a) => a.id !== activityId));

			// Track action
			if (activityToClear) {
				trackEvent("system_action", {
					category: "System",
					label: "clear_activity",
					customDimensions: { id: activityId, type: activityToClear.type },
				});
			}

			// Show success notification
			toast({
				title: "Activity Cleared",
				description: "The system activity log has been updated.",
			});

			return true;
		} catch (error) {
			console.error("Failed to clear activity:", error);
			return false;
		}
	};

	// Run diagnostics function (simulated)
	const runDiagnostics = async () => {
		try {
			toast({
				title: "Running Diagnostics",
				description: "Analyzing system performance...",
			});

			// Simulate diagnostics delay
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Update metrics with "new" values
			setMetrics((prev) => ({
				...prev,
				cpuUsage: "15%", // Simulated change
				memoryUsage: "460MB",
			}));

			// Add new activity log
			const newActivity: SystemActivity = {
				id: Date.now(),
				description: "Manual diagnostics run",
				type: "analysis",
				timestamp: new Date().toISOString(),
				status: "success",
			};

			setActivities((prev) => [newActivity, ...prev]);

			addNotification({
				title: "Diagnostics Complete",
				message: "System is running within optimal parameters.",
				type: "success",
			});

			return true;
		} catch (error) {
			console.error("Failed to run diagnostics:", error);
			return false;
		}
	};

	return { clearActivity, runDiagnostics };
};
