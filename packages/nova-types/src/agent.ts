
export interface AgentState {
	active_conversations: string[];
	memory_count: number;
	capabilities: string[];
	current_project: string | null;
}

export interface ChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: number;
}

export interface WebSearchResult {
	title: string;
	link: string;
	snippet?: string;
}
