import path from "path";

export interface DashboardConfig {
	WORKSPACE_ROOT: string;
	DB_PATH: string;
	NX_CACHE_PATH: string;
}

export const config: DashboardConfig = {
	// Use environment variable or resolve workspace root (2 levels up from monorepo-dashboard/)
	WORKSPACE_ROOT:
		process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), "..", ".."),

	// Database path (must be on D: drive per workspace rules)
	DB_PATH: "D:/databases/monorepo_dashboard.db",

	// Nx cache directory (in workspace root)
	NX_CACHE_PATH:
		process.env.NX_CACHE_PATH ||
		path.resolve(process.cwd(), "..", "..", ".nx", "cache"),
};

// Helper function to ensure database directory exists
export async function ensureDbDirectory(): Promise<void> {
	const { mkdir } = await import("fs/promises");
	const dbDir = path.dirname(config.DB_PATH);
	await mkdir(dbDir, { recursive: true });
}
