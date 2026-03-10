import { invoke } from "@tauri-apps/api/core";

export interface OrchestrationResponse {
	success: boolean;
	message: string;
}

export interface ProjectTemplate {
	id: string;
	name: string;
	description: string;
	project_type: string;
	command: string;
	args: string[];
}

export interface CreateProjectArgs extends Record<string, unknown> {
	templateId: string;
	name: string;
	path: string;
}

export interface CreateProjectResponse {
	success: boolean;
	project_name: string;
	stdout: string;
	stderr: string;
}

export interface GuidanceResponse {
	next_steps: unknown[];
	doing_right: unknown[];
	at_risk: unknown[];
	generated_at: number;
	context_summary: string;
}

export class OrchestratorService {
	private readonly __instanceMarker = true;

	static async orchestrate(prompt: string): Promise<string> {
		try {
			return await invoke<string>("orchestrate_desktop_action", { prompt });
		} catch (error) {
			console.error("Orchestration failed:", error);
			throw error;
		}
	}

	static async syncContext(): Promise<void> {
		try {
			await invoke("sync_context");
		} catch (error) {
			console.error("Context sync failed:", error);
			throw error;
		}
	}

	static async getAvailableTemplates(): Promise<ProjectTemplate[]> {
		try {
			return await invoke<ProjectTemplate[]>("get_available_templates");
		} catch (error) {
			console.error("Failed to get templates:", error);
			return [];
		}
	}

	static async createProject(args: CreateProjectArgs): Promise<CreateProjectResponse> {
		try {
			return await invoke<CreateProjectResponse>("create_project", args);
		} catch (error) {
			console.error("Failed to create project:", error);
			throw error;
		}
	}

	static async requestGuidance(): Promise<GuidanceResponse> {
		try {
			return await invoke<GuidanceResponse>("request_guidance", { context: {} });
		} catch (error) {
			console.error("Failed to request guidance:", error);
			throw error;
		}
	}
}
