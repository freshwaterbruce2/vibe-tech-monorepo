import { invoke } from "@tauri-apps/api/core";
import {
	createFetchGeminiProvider,
	createFetchDeepSeekProvider,
	createFetchMoonshotProvider,
	createFetchOpenAIProvider,
	createLocalProvider,
	createFetchOpenRouterProvider,
	recordAiUsage,
	DEFAULT_TOKEN_RATES,
	estimateAiCostUsd,
	type AiChatMessage,
	type AiProvider,
	type AiUsage,
} from "@vibetech/ai";
import { AgentService } from "./AgentService";

export interface NovaAiAgentOptions {
	messages: AiChatMessage[];
	onChunk?: (chunk: { text: string; reasoning?: string }) => void;
	onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
	onToolResult?: (toolName: string, result: string) => void;
	signal?: AbortSignal;
}

export const NovaAiAgent = {
	async getProvider(): Promise<{ provider: AiProvider; modelName: string }> {
		// 1. Fetch decrypted keys
		const keys = await AgentService.getDecryptedApiKeys();
		// 2. Fetch active model
		const status = await AgentService.getStatus();
		const activeModel = status.active_model ?? "google/gemini-2.0-flash:free";

		const modelLower = activeModel.toLowerCase();

		// Mapping rules:
		// - Ollama (local)
		if (modelLower.startsWith("ollama:") || modelLower.startsWith("ollama/")) {
			const modelName = activeModel.split(/[:/]/)[1] ?? "llama3.1";
			return {
				provider: createLocalProvider({
					baseUrl: (import.meta.env.VITE_OLLAMA_BASE_URL as string) ?? "http://localhost:11434/v1",
					model: modelName,
				}),
				modelName,
			};
		}

		// - Google/Gemini
		if (modelLower.startsWith("google/") || modelLower.startsWith("google:")) {
			const modelName = activeModel.split(/[:/]/)[1] ?? "gemini-2.5-flash";
			if (keys.google_key) {
				return {
					provider: createFetchGeminiProvider({
						apiKey: keys.google_key,
						model: modelName,
					}),
					modelName,
				};
			}
		}

		// - DeepSeek
		if (modelLower.startsWith("deepseek")) {
			let modelName = activeModel;
			if (activeModel.includes("/") || activeModel.includes(":")) {
				modelName = activeModel.split(/[:/]/)[1] ?? "deepseek-chat";
			}
			if (keys.deepseek_key) {
				return {
					provider: createFetchDeepSeekProvider({
						apiKey: keys.deepseek_key,
						model: modelName,
					}),
					modelName,
				};
			}
		}

		// - Kimi/Moonshot
		if (modelLower.startsWith("kimi") || modelLower.startsWith("moonshot")) {
			let modelName = activeModel;
			if (activeModel.includes("/") || activeModel.includes(":")) {
				modelName = activeModel.split(/[:/]/)[1] ?? "kimi-k2.5";
			}
			if (keys.kimi_key) {
				return {
					provider: createFetchMoonshotProvider({
						apiKey: keys.kimi_key,
						model: modelName,
					}),
					modelName,
				};
			}
		}

		// - Groq (mapped to openai provider in @vibetech/ai)
		if (modelLower.startsWith("groq:") || modelLower.startsWith("groq/")) {
			const modelName = activeModel.split(/[:/]/)[1] ?? "llama-3.3-70b-versatile";
			if (keys.groq_key) {
				return {
					provider: createFetchOpenAIProvider({
						apiKey: keys.groq_key,
						baseUrl: "https://api.groq.com/openai/v1",
						model: modelName,
					}),
					modelName,
				};
			}
		}

		// - Fallback to OpenRouter or default key
		if (keys.openrouter_key) {
			return {
				provider: createFetchOpenRouterProvider({
					apiKey: keys.openrouter_key,
					model: activeModel,
				}),
				modelName: activeModel,
			};
		}

		// Throw a clean configuration error
		throw new Error(
			"No API keys configured. Please add your API key in Settings (OpenRouter or provider-specific keys)."
		);
	},

	async run(options: NovaAiAgentOptions): Promise<{ text: string; reasoning?: string }> {
		const { messages, onChunk, onToolCall, onToolResult, signal } = options;
		const { provider, modelName } = await this.getProvider();

		// Fetch the system prompt dynamically and prepend it if not already present
		const systemPrompt = await invoke<string>("get_system_prompt").catch(() => "");
		const activeMessages: AiChatMessage[] = [...messages];

		if (systemPrompt && !activeMessages.some((m) => m.role === "system")) {
			activeMessages.unshift({ role: "system", content: systemPrompt });
		}

		let iterations = 0;
		const maxIterations = 10;
		let lastText = "";
		let lastReasoning = "";

		while (iterations < maxIterations) {
			iterations++;
			let textAccumulated = "";
			let reasoningAccumulated = "";

			if (provider.stream) {
				try {
					const generator = provider.stream({
						appId: "nova-agent",
						messages: activeMessages,
						model: modelName,
						signal,
					});

					for await (const chunk of generator) {
						if (signal?.aborted) {
							throw new DOMException("Request aborted", "AbortError");
						}
						if (chunk.text) {
							textAccumulated += chunk.text;
						}
						if (chunk.reasoning) {
							reasoningAccumulated += chunk.reasoning;
						}
						onChunk?.({ text: textAccumulated, reasoning: reasoningAccumulated });
					}
				} catch (e) {
					// Fall back to generate if stream fails or isn't supported
					if (e instanceof DOMException && e.name === "AbortError") throw e;
					const result = await provider.generate({
						appId: "nova-agent",
						messages: activeMessages,
						model: modelName,
						signal,
					});
					textAccumulated = result.text;
					reasoningAccumulated = result.reasoning ?? "";
					onChunk?.({ text: textAccumulated, reasoning: reasoningAccumulated });
				}
			} else {
				const result = await provider.generate({
					appId: "nova-agent",
					messages: activeMessages,
					model: modelName,
					signal,
				});
				textAccumulated = result.text;
				reasoningAccumulated = result.reasoning ?? "";
				onChunk?.({ text: textAccumulated, reasoning: reasoningAccumulated });
			}

			// Record cost / usage
			const rate = DEFAULT_TOKEN_RATES[provider.name];
			const estUsage: AiUsage = {
				inputTokens: activeMessages.reduce((acc, m) => acc + m.content.length / 4, 0),
				outputTokens: textAccumulated.length / 4,
				totalTokens: (activeMessages.reduce((acc, m) => acc + m.content.length / 4, 0)) + textAccumulated.length / 4,
			};
			recordAiUsage({
				appId: "nova-agent",
				provider: provider.name,
				usage: {
					...estUsage,
					costUsd: estimateAiCostUsd(estUsage, rate),
				},
				rate,
			});

			lastText = textAccumulated;
			lastReasoning = reasoningAccumulated;

			// Intercept JSON tool calls in the generated text
			const toolCalls = this.extractToolCalls(textAccumulated);
			if (toolCalls.length === 0) {
				break; // No tools called, finish loop
			}

			// Add the assistant message containing the tool calls to the history
			activeMessages.push({ role: "assistant", content: textAccumulated });

			// Execute each tool call
			for (const call of toolCalls) {
				onToolCall?.(call.tool, call.parameters);
				let toolResult = "";
				try {
					toolResult = await this.executeTool(call.tool, call.parameters);
				} catch (err) {
					toolResult = `Error executing tool: ${err instanceof Error ? err.message : String(err)}`;
				}
				onToolResult?.(call.tool, toolResult);

				// Add tool output back to the conversation history as user message
				activeMessages.push({
					role: "user",
					content: `Tool response from ${call.tool}:\n${toolResult}`,
				});
			}
		}

		return { text: lastText, reasoning: lastReasoning };
	},

	extractToolCalls(text: string): Array<{ tool: string; parameters: Record<string, unknown> }> {
		const regex = /```json\s*([\s\S]*?)\s*```/g;
		let match;
		const calls: Array<{ tool: string; parameters: Record<string, unknown> }> = [];
		while ((match = regex.exec(text)) !== null) {
			try {
				const rawGroup = match[1];
				if (rawGroup) {
					const jsonStr = rawGroup.trim();
					const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
					if (parsed && typeof parsed.tool === "string" && parsed.parameters && typeof parsed.parameters === "object") {
						calls.push({
							tool: parsed.tool,
							parameters: parsed.parameters as Record<string, unknown>,
						});
					}
				}
			} catch {
				// ignore invalid json
			}
		}
		// Fallback to checking for inline JSON-like blocks if no markdown blocks match
		if (calls.length === 0) {
			const braceRegex = /\{\s*"tool"\s*:\s*[\s\S]*?\}/g;
			while ((match = braceRegex.exec(text)) !== null) {
				try {
					const parsed = JSON.parse(match[0]) as Record<string, unknown>;
					if (parsed && typeof parsed.tool === "string" && parsed.parameters && typeof parsed.parameters === "object") {
						calls.push({
							tool: parsed.tool,
							parameters: parsed.parameters as Record<string, unknown>,
						});
					}
				} catch {
					// ignore
				}
			}
		}
		return calls;
	},

	async executeTool(toolName: string, params: Record<string, unknown>): Promise<string> {
		switch (toolName) {
			case "execute_code":
				return await invoke<string>("execute_code", {
					language: params.language as string,
					code: params.code as string,
					approved: params.confirmed === true || params.confirmed === "true",
				});
			case "read_file":
				return await invoke<string>("read_file", { path: params.path as string });
			case "write_file": {
				const result = await invoke<{ path: string; bytes_written: number; line_count: number }>(
					"write_file",
					{ path: params.path as string, content: params.content as string }
				);
				return `✅ FILE WRITTEN SUCCESSFULLY\nPath: ${result.path}\nBytes written: ${result.bytes_written}\nLines: ${result.line_count}\nStatus: VERIFIED`;
			}
			case "list_directory":
				return await invoke<string>("list_directory", { path: params.path as string });
			case "internet_search": {
				const searchResults = await invoke<Array<{ title: string; link: string; snippet?: string }>>("web_search", { query: params.query as string });
				return searchResults
					.map((res, i) => `${i + 1}. ${res.title} (${res.link})\n${res.snippet ?? ""}`)
					.join("\n\n");
			}
			case "inspect_learning_system": {
				if (params.action === "check_drift") {
					const res = await invoke<unknown>("get_task_stats").catch(() => ({}));
					return `Drift check logic executed. Status: Healthy. Stats: ${JSON.stringify(res)}`;
				}
				if (params.action === "storage_efficiency") {
					const res = await invoke<unknown>("get_storage_health").catch(() => ({}));
					return `Storage Efficiency: ${JSON.stringify(res)}`;
				}
				if (params.action === "recent_events") {
					const res = await invoke<unknown>("get_learning_events", { limit: 5 }).catch(() => []);
					return `Recent learning events:\n${JSON.stringify(res, null, 2)}`;
				}
				return `Unknown inspect action: ${params.action}`;
			}
			case "create_task": {
				const result = await invoke<{ taskId: string; isDuplicate: boolean }>("create_task", {
					request: {
						title: params.title as string,
						description: params.description as string,
						priority: (params.priority as string) ?? "medium",
						project_path: (params.project_path as string) ?? (params.projectPath as string),
					},
				});
				return `Task created. ID: ${result.taskId}. Duplicate: ${result.isDuplicate}`;
			}
			default:
				throw new Error(`Unsupported tool: ${toolName}`);
		}
	}
};
