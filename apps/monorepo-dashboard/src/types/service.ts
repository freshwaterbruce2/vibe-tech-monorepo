// Service type definitions for running services monitoring

export type ServiceStatus = "running" | "stopped" | "starting" | "error";

export type ServiceHealth = "healthy" | "degraded" | "unhealthy";

export interface Service {
	name: string;
	port: number;
	pid?: number;
	status: ServiceStatus;
	health: ServiceHealth;
	uptime?: number; // in milliseconds
	startedAt?: Date;
	url?: string;
	healthCheckUrl?: string;
	description?: string;
}

export interface ServiceHealthCheck {
	serviceName: string;
	url: string;
	status: number;
	responseTime: number;
	timestamp: Date;
	healthy: boolean;
}

export interface ServiceMetrics {
	totalServices: number;
	runningServices: number;
	stoppedServices: number;
	healthyServices: number;
	degradedServices: number;
	unhealthyServices: number;
}

export interface ServiceAction {
	service: string;
	action: "start" | "stop" | "restart";
	timestamp: Date;
	success: boolean;
	error?: string;
}

// Predefined services in the monorepo
export const KNOWN_SERVICES: Readonly<
	Omit<Service, "pid" | "status" | "health" | "uptime" | "startedAt">[]
> = [
	{
		name: "root",
		port: 5173,
		url: "http://localhost:5173",
		description: "Root development server",
	},
	{
		name: "backend",
		port: 3001,
		url: "http://localhost:3001",
		healthCheckUrl: "http://localhost:3001/health",
		description: "Backend API server",
	},
	{
		name: "crypto-enhanced",
		port: 8000,
		url: "http://localhost:8000",
		description: "Crypto trading system",
	},
	{
		name: "nova-agent",
		port: 3000,
		url: "http://localhost:3000",
		description: "Nova AI agent",
	},
	{
		name: "business-booking-platform",
		port: 5174,
		url: "http://localhost:5174",
		description: "Business booking platform",
	},
	{
		name: "digital-content-builder",
		port: 3002,
		url: "http://localhost:3002",
		description: "Digital content builder",
	},
	{
		name: "shipping-pwa",
		port: 5175,
		url: "http://localhost:5175",
		description: "Shipping PWA",
	},
	{
		name: "memory-bank",
		port: 8765,
		url: "http://localhost:8765",
		description: "Memory bank service",
	},
	{
		name: "monorepo-dashboard",
		port: 5176,
		url: "http://localhost:5176",
		description: "Monorepo dashboard UI",
	},
	{
		name: "monorepo-dashboard-backend",
		port: 5177,
		url: "http://localhost:5177",
		healthCheckUrl: "http://localhost:5177/api/health",
		description: "Monorepo dashboard API backend",
	},
] as const;
