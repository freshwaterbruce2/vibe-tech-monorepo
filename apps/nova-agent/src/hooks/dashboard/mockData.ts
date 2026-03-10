import type { SystemActivity, SystemMetrics } from "./types";

// Mock data for demonstration purposes
export const mockActivities: SystemActivity[] = [
	{
		id: 1,
		description: "Analyzed project structure",
		type: "analysis",
		timestamp: "2025-01-11T10:00:00Z",
		status: "success",
	},
	{
		id: 2,
		description: "Optimized database queries",
		type: "execution",
		timestamp: "2025-01-11T09:45:00Z",
		status: "success",
	},
	{
		id: 3,
		description: "Memory consolidation",
		type: "memory",
		timestamp: "2025-01-11T09:30:00Z",
		status: "in-progress",
	},
	{
		id: 4,
		description: "External API sync",
		type: "network",
		timestamp: "2025-01-11T09:15:00Z",
		status: "failed",
	},
	{
		id: 5,
		description: "Generated unit tests",
		type: "execution",
		timestamp: "2025-01-11T09:00:00Z",
		status: "success",
	},
];

export const mockMetrics: SystemMetrics = {
	activeContexts: 3,
	tasksCompleted: 142,
	uptime: "4d 12h",
	memoryUsage: "450MB",
	cpuUsage: "12%",
};
