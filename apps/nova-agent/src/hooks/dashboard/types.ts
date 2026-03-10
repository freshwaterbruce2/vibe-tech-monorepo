// Define the types used across dashboard data components
export interface SystemActivity {
	id: number;
	description: string;
	type: "analysis" | "execution" | "memory" | "network";
	timestamp: string;
	status: "success" | "failed" | "in-progress";
}

export interface SystemMetrics {
	activeContexts: number;
	tasksCompleted: number;
	uptime: string;
	memoryUsage: string;
	cpuUsage: string;
}

export type ActivityStatus = "success" | "failed" | "in-progress";

// Lead management types
export interface Lead {
	id: number;
	name: string;
	email: string;
	source: string;
	status: string;
	date: string;
}

export interface DashboardMetrics {
	totalLeads: number;
	newLeadsToday: number;
	conversionRate: string;
	avgResponseTime: string;
}
