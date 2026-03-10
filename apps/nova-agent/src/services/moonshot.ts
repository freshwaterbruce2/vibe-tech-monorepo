/**
 * Moonshot Kimi 2.5 Service for Nova Agent
 *
 * Direct integration with Moonshot's Kimi API - no proxy needed.
 * Model: kimi-k2.5 (262K context window)
 *
 * API Docs: https://platform.moonshot.ai/docs/overview
 */

// Types for Moonshot API
export interface MoonshotMessage {
	role: "system" | "user" | "assistant";
	content: string | MoonshotContentPart[];
}

export interface MoonshotContentPart {
	type: "text" | "image_url";
	text?: string;
	image_url?: {
		url: string; // base64 data URL or HTTP URL
	};
}

export interface MoonshotThinkingConfig {
	type: "enabled" | "disabled";
}

export interface MoonshotChatRequest {
	model: string;
	messages: MoonshotMessage[];
	temperature?: number; // MUST be 1.0 (thinking) or 0.6 (non-thinking)
	max_tokens?: number;
	thinking?: MoonshotThinkingConfig;
	stream?: boolean;
}

export interface MoonshotChoice {
	index: number;
	message: {
		role: string;
		content: string;
		reasoning?: string; // Present when thinking is enabled
	};
	finish_reason: string;
}

export interface MoonshotUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	reasoning_tokens?: number;
}

export interface MoonshotChatResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: MoonshotChoice[];
	usage: MoonshotUsage;
}

// Configuration
const MOONSHOT_API_URL = "https://api.moonshot.ai/v1";
const DEFAULT_MODEL = "kimi-k2.5";
const DEFAULT_MAX_TOKENS = 8192;

// Temperature MUST be fixed per Moonshot docs
const THINKING_TEMPERATURE = 1.0;
const NON_THINKING_TEMPERATURE = 0.6;

/**
 * Get API key from environment
 */
function getApiKey(): string {
	const key =
		(import.meta.env.VITE_KIMI_API_KEY as string | undefined) ??
		(import.meta.env.VITE_MOONSHOT_API_KEY as string | undefined);

	if (!key) {
		throw new Error(
			"Moonshot API key not configured. Set VITE_KIMI_API_KEY or VITE_MOONSHOT_API_KEY in .env",
		);
	}
	return key;
}

/**
 * Nova Agent-specific options for Kimi
 */
export interface KimiChatOptions {
	model?: string;
	maxTokens?: number;
	systemPrompt?: string;
	thinking?: boolean; // Enable extended thinking for complex tasks
	stream?: boolean;
}

/**
 * Send a chat completion request to Moonshot Kimi
 */
export async function kimiChat(
	request: MoonshotChatRequest,
): Promise<MoonshotChatResponse> {
	const apiKey = getApiKey();

	// Enforce correct temperature based on thinking mode
	const thinkingEnabled = request.thinking?.type === "enabled";
	const temperature = thinkingEnabled
		? THINKING_TEMPERATURE
		: NON_THINKING_TEMPERATURE;

	const body: MoonshotChatRequest = {
		...request,
		temperature,
		thinking: request.thinking ?? { type: "disabled" },
	};

	const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Moonshot API error (${response.status}): ${errorText}`);
	}

	return (await response.json()) as MoonshotChatResponse;
}

/**
 * Send a simple chat message to Kimi
 */
export async function sendKimiMessage(
	content: string,
	options: KimiChatOptions = {},
): Promise<string> {
	const messages: MoonshotMessage[] = [];

	if (options.systemPrompt) {
		messages.push({
			role: "system",
			content: options.systemPrompt,
		});
	}

	messages.push({
		role: "user",
		content,
	});

	const response = await kimiChat({
		model: options.model ?? DEFAULT_MODEL,
		messages,
		max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
		thinking: { type: options.thinking ? "enabled" : "disabled" },
	});

	return response.choices[0]?.message?.content ?? "";
}

/**
 * Continue a multi-turn conversation with Kimi
 */
export async function continueKimiConversation(
	conversationHistory: MoonshotMessage[],
	newMessage: string,
	options: KimiChatOptions = {},
): Promise<MoonshotChatResponse> {
	const messages: MoonshotMessage[] = [
		...conversationHistory,
		{ role: "user", content: newMessage },
	];

	return await kimiChat({
		model: options.model ?? DEFAULT_MODEL,
		messages,
		max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
		thinking: { type: options.thinking ? "enabled" : "disabled" },
	});
}

/**
 * Analyze an image with Kimi (vision capability)
 */
export async function analyzeImage(
	imageBase64OrUrl: string,
	prompt: string,
	options: KimiChatOptions = {},
): Promise<string> {
	// Convert to proper URL format if base64
	const imageUrl = imageBase64OrUrl.startsWith("data:")
		? imageBase64OrUrl
		: imageBase64OrUrl.startsWith("http")
			? imageBase64OrUrl
			: `data:image/png;base64,${imageBase64OrUrl}`;

	const messages: MoonshotMessage[] = [];

	if (options.systemPrompt) {
		messages.push({
			role: "system",
			content: options.systemPrompt,
		});
	}

	messages.push({
		role: "user",
		content: [
			{
				type: "image_url",
				image_url: { url: imageUrl },
			},
			{
				type: "text",
				text: prompt,
			},
		],
	});

	const response = await kimiChat({
		model: options.model ?? DEFAULT_MODEL,
		messages,
		max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
		thinking: { type: options.thinking ? "enabled" : "disabled" },
	});

	return response.choices[0]?.message?.content ?? "";
}

/**
 * Generate code with Kimi (optimized for coding tasks)
 */
export async function generateKimiCode(
	description: string,
	language: string = "typescript",
	context?: string,
	existingCode?: string,
): Promise<string> {
	let prompt = `Generate ${language} code for the following task:\n\n${description}`;

	if (context) {
		prompt += `\n\nContext:\n${context}`;
	}

	if (existingCode) {
		prompt += `\n\nExisting code to build upon:\n\`\`\`${language}\n${existingCode}\n\`\`\``;
	}

	prompt += `\n\nProvide only the code without explanations.`;

	return await sendKimiMessage(prompt, {
		thinking: true, // Use thinking for code generation
		systemPrompt:
			"You are a senior software engineer. Generate clean, well-documented, production-ready code.",
	});
}

/**
 * Review/debug code with Kimi
 */
export async function reviewKimiCode(
	code: string,
	language: string = "typescript",
): Promise<string> {
	const prompt = `Review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide feedback on:\n- Code quality\n- Best practices\n- Potential bugs\n- Performance considerations\n- Security issues`;

	return await sendKimiMessage(prompt, {
		thinking: true, // Use thinking for thorough analysis
		systemPrompt:
			"You are a senior code reviewer. Provide constructive, detailed feedback.",
	});
}

/**
 * Check if Moonshot API is reachable
 */
export async function checkKimiHealth(): Promise<boolean> {
	try {
		const apiKey = getApiKey();
		const response = await fetch(`${MOONSHOT_API_URL}/models`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Get available Kimi models
 */
export async function getKimiModels(): Promise<
	{ id: string; context_length: number }[]
> {
	const apiKey = getApiKey();
	const response = await fetch(`${MOONSHOT_API_URL}/models`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch models: ${response.statusText}`);
	}

	const data = (await response.json()) as { data: { id: string; context_length: number }[] };
	return data.data;
}

// Export default model constant
export const KIMI_DEFAULT_MODEL = DEFAULT_MODEL;
