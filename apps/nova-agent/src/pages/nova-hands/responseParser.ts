import type { AgentAction } from "./types";

export interface ParsedAgentResponse {
	thought: string;
	action: AgentAction;
}

export function parseAgentResponse(raw: string): ParsedAgentResponse {
	const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
	const jsonText = jsonMatch?.[1] ?? raw;
	const trimmed = jsonText.trim();

	if (!trimmed) {
		throw new Error("No JSON content found in agent response.");
	}

	let payload: unknown;
	try {
		payload = JSON.parse(trimmed);
	} catch (err) {
		throw new Error(`Failed to parse agent response JSON: ${String(err)}`);
	}

	if (!payload || typeof payload !== "object") {
		throw new Error("Agent response JSON is not an object.");
	}

	const { thought, action } = payload as { thought: unknown; action: unknown };

	if (typeof thought !== "string") {
		throw new Error("Agent response missing or invalid 'thought' field.");
	}

	if (!action || typeof action !== "object") {
		throw new Error("Agent response missing or invalid 'action' field.");
	}

	return { thought, action: action as AgentAction };
}
