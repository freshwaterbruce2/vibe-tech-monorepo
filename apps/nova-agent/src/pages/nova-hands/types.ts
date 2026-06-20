export interface HistoryItem {
	type: "mouse" | "keyboard" | "system";
	detail: string;
	thought: string;
	timestamp: string;
}

export type AgentAction =
	| {
			type: "mouse";
			action: "move" | "click" | "right_click" | "double_click" | "drag_to";
			x: number;
			y: number;
	  }
	| {
			type: "keyboard";
			action: "type" | "press_key" | "hotkey";
			text?: string;
			key?: string;
			modifiers?: string[];
	  }
	| {
			type: "done";
	  };
