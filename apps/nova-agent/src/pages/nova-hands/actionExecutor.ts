import { ComputerUseService } from "@/services/computerUseService";
import type { AgentAction, HistoryItem } from "./types";

export async function executeAction(
	action: AgentAction,
	deps: { currentThought: string },
): Promise<HistoryItem | null> {
	if (action.type === "mouse") {
		await ComputerUseService.simulateMouseAction(action.action, action.x, action.y);
		return {
			type: "mouse",
			detail: `${action.action} at (${action.x}, ${action.y})`,
			thought: deps.currentThought,
			timestamp: new Date().toLocaleTimeString(),
		};
	}

	if (action.type === "keyboard") {
		await ComputerUseService.simulateKeyboardAction(
			action.action,
			action.text,
			action.key,
			action.modifiers,
		);
		return {
			type: "keyboard",
			detail: action.action === "type" ? `type "${action.text}"` : `${action.action} ${action.key ?? ""}`,
			thought: deps.currentThought,
			timestamp: new Date().toLocaleTimeString(),
		};
	}

	return null;
}
