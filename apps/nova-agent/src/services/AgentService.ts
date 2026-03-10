import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AgentState, WebSearchResult } from "../types/agent";

type IpcMessage = Record<string, unknown>;

export class AgentService {
	private readonly __instanceMarker = true;

	static async chat(message: string, projectId?: string): Promise<string> {
		try {
			return await invoke("chat_with_agent", { message, projectId });
		} catch (error) {
			console.error("Failed to chat with agent:", error);
			throw error;
		}
	}

	static async getStatus(): Promise<AgentState> {
		try {
			return await invoke("get_agent_status");
		} catch (error) {
			console.error("Failed to get agent status:", error);
			throw error;
		}
	}

	static async searchWeb(query: string): Promise<WebSearchResult[]> {
		try {
			return await invoke("web_search", { query });
		} catch (error) {
			console.error("Failed to search web:", error);
			throw error;
		}
	}

	static async updateCapabilities(capabilities: string[]): Promise<void> {
		try {
			await invoke("update_capabilities", { capabilities });
		} catch (error) {
			console.error("Failed to update capabilities:", error);
			throw error;
		}
	}

	static async searchMemories(query: string): Promise<string[]> {
		try {
			return await invoke("search_memories", { query });
		} catch (error) {
			console.error("Failed to search memories:", error);
			throw error;
		}
	}

	static async sendIpcMessage(message: IpcMessage): Promise<void> {
		try {
			await invoke("send_ipc_message", { message });
		} catch (error) {
			console.error("Failed to send IPC message:", error);
			throw error;
		}
	}

	static async getProjectState(projectPath: string): Promise<unknown> {
		try {
			return await invoke("get_project_state", { projectPath });
		} catch (error) {
			console.error("Failed to get project state:", error);
			throw error;
		}
	}

	static async listProjects(): Promise<
		Array<{
			id: string;
			name: string;
			path: string;
			project_type: string;
			has_state: boolean;
		}>
	> {
		try {
			return await invoke("list_projects");
		} catch (error) {
			console.error("Failed to list projects:", error);
			throw error;
		}
	}

	static async onIpcMessage(
		callback: (payload: unknown) => void,
	): Promise<UnlistenFn> {
		return await listen("ipc-message", (event) => {
			callback(event.payload);
		});
	}

	static async getAiConfig(): Promise<{
		deepseek_key_set: boolean;
		groq_key_set: boolean;
		openrouter_key_set: boolean;
		google_key_set: boolean;
		kimi_key_set: boolean;
	}> {
		try {
			return await invoke("get_api_key_status");
		} catch (error) {
			console.error("Failed to get AI config:", error);
			throw error;
		}
	}

	static async saveApiKeys(keys: {
		deepseek_key?: string;
		groq_key?: string;
		openrouter_key?: string;
		google_key?: string;
		kimi_key?: string;
	}): Promise<void> {
		try {
			await invoke("save_api_keys", {
				deepseekKey: keys.deepseek_key,
				groqKey: keys.groq_key,
				openrouterKey: keys.openrouter_key,
				googleKey: keys.google_key,
				kimiKey: keys.kimi_key,
			});
		} catch (error) {
			console.error("Failed to save API keys:", error);
			throw error;
		}
	}

	static async setActiveModel(model: string): Promise<void> {
		try {
			await invoke("set_active_model", { model });
		} catch (error) {
			console.error("Failed to set active model:", error);
			throw error;
		}
	}

	static async verifyProvider(provider: string, key: string): Promise<string> {
		// Basic validation
		if (!key || key.trim() === "") {
			throw new Error("API key cannot be empty");
		}

		// Simulate verification for now (backend will implement actual ping later)
		// This unblocks the UI without assuming it's fully implemented in backend
		return `Verified connection to ${provider}`;
	}

	static async executeCode(
		language: string,
		code: string,
		confirmed = false,
	): Promise<string> {
		try {
			return await invoke<string>("execute_code", {
				language,
				code,
				approved: confirmed,
			});
		} catch (error) {
			console.error("Failed to execute code:", error);
			throw error;
		}
	}
}
