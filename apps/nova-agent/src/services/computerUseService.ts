import { invoke } from "@tauri-apps/api/core";

export interface DisplayDimensions {
	width: number;
	height: number;
}

export interface WindowRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ActiveWindowInfo {
	title: string;
	process_name: string;
	pid: number;
	rect?: WindowRect;
}

export const ComputerUseService = {
	async getDisplayDimensions(): Promise<DisplayDimensions> {
		try {
			return await invoke<DisplayDimensions>("get_display_dimensions");
		} catch (error) {
			console.error("Failed to get display dimensions:", error);
			throw error;
		}
	},

	async captureDisplay(): Promise<string> {
		try {
			return await invoke<string>("capture_display");
		} catch (error) {
			console.error("Failed to capture display:", error);
			throw error;
		}
	},

	async simulateMouseAction(
		action: "move" | "click" | "right_click" | "double_click" | "drag_to",
		x: number,
		y: number,
	): Promise<void> {
		try {
			await invoke("simulate_mouse_action", {
				action: { action, x, y },
			});
		} catch (error) {
			console.error("Failed to simulate mouse action:", error);
			throw error;
		}
	},

	async simulateKeyboardAction(
		action: "type" | "press_key" | "hotkey",
		text?: string,
		key?: string,
		modifiers?: string[],
	): Promise<void> {
		try {
			await invoke("simulate_keyboard_action", {
				action: { action, text, key, modifiers },
			});
		} catch (error) {
			console.error("Failed to simulate keyboard action:", error);
			throw error;
		}
	},

	async getFocusedWindow(): Promise<ActiveWindowInfo> {
		try {
			return await invoke<ActiveWindowInfo>("get_focused_window");
		} catch (error) {
			console.error("Failed to get focused window:", error);
			throw error;
		}
	},

	async callMultimodalLlm(
		messages: MultimodalMessage[],
		systemPrompt?: string,
	): Promise<string> {
		try {
			return await invoke<string>("call_multimodal_llm", { messages, systemPrompt });
		} catch (error) {
			console.error("Failed to call multimodal LLM:", error);
			throw error;
		}
	},
};

export interface MultimodalMessage {
	role: "user" | "assistant";
	text: string;
	image_base64?: string;
}
