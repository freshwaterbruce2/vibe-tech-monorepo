import { beforeEach, describe, expect, it, vi } from "vitest";
import { NovaAiAgent } from "../NovaAiAgent";
import { AgentService } from "../AgentService";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
	invoke: (...args: any[]) => mockInvoke(...args),
}));

// Mock @vibetech/ai provider creators
const mockGenerate = vi.fn();
const mockStream = vi.fn();

vi.mock("@vibetech/ai", () => {
	return {
		createFetchGeminiProvider: vi.fn(() => ({
			name: "gemini",
			generate: mockGenerate,
			stream: mockStream,
		})),
		createFetchDeepSeekProvider: vi.fn(() => ({
			name: "deepseek",
			generate: mockGenerate,
			stream: mockStream,
		})),
		createFetchMoonshotProvider: vi.fn(() => ({
			name: "moonshot",
			generate: mockGenerate,
			stream: mockStream,
		})),
		createFetchOpenAIProvider: vi.fn(() => ({
			name: "openai",
			generate: mockGenerate,
			stream: mockStream,
		})),
		createLocalProvider: vi.fn(() => ({
			name: "local",
			generate: mockGenerate,
			stream: mockStream,
		})),
		createFetchOpenRouterProvider: vi.fn(() => ({
			name: "openrouter",
			generate: mockGenerate,
			stream: mockStream,
		})),
		recordAiUsage: vi.fn(),
		DEFAULT_TOKEN_RATES: {
			gemini: { inputPerMillion: 0.1, outputPerMillion: 0.4 },
			deepseek: { inputPerMillion: 0.14, outputPerMillion: 0.28 },
			moonshot: { inputPerMillion: 0.2, outputPerMillion: 0.8 },
			openai: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
			local: { inputPerMillion: 0, outputPerMillion: 0 },
			openrouter: { inputPerMillion: 0, outputPerMillion: 0 },
		},
		estimateAiCostUsd: vi.fn(() => 0),
	};
});

describe("NovaAiAgent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should map google model to gemini provider when key is available", async () => {
		vi.spyOn(AgentService, "getDecryptedApiKeys").mockResolvedValue({
			google_key: "google-api-key",
		});
		vi.spyOn(AgentService, "getStatus").mockResolvedValue({
			active_model: "google/gemini-2.5-flash",
			active_conversations: [],
			memory_count: 0,
			capabilities: [],
			current_project: null,
			ipc_connected: false,
			chat_history: [],
		});
		mockInvoke.mockResolvedValue("mocked system prompt");

		mockGenerate.mockResolvedValue({
			provider: "gemini",
			model: "gemini-2.5-flash",
			text: "Response from Gemini",
			usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		});

		const result = await NovaAiAgent.run({
			messages: [{ role: "user", content: "Hello" }],
		});

		expect(result.text).toBe("Response from Gemini");
	});

	it("should execute code tool when output contains JSON tool block", async () => {
		vi.spyOn(AgentService, "getDecryptedApiKeys").mockResolvedValue({
			google_key: "google-api-key",
		});
		vi.spyOn(AgentService, "getStatus").mockResolvedValue({
			active_model: "google/gemini-2.5-flash",
			active_conversations: [],
			memory_count: 0,
			capabilities: [],
			current_project: null,
			ipc_connected: false,
			chat_history: [],
		});
		mockInvoke.mockImplementation(async (cmd) => {
			if (cmd === "get_system_prompt") {
				return "mocked system prompt";
			}
			if (cmd === "execute_code") {
				return "42\n";
			}
			return null;
		});

		// First response calls a tool
		mockGenerate.mockResolvedValueOnce({
			provider: "gemini",
			model: "gemini-2.5-flash",
			text: 'Let me run this: ```json\n{\n  "tool": "execute_code",\n  "parameters": {\n    "language": "python",\n    "code": "print(42)",\n    "confirmed": true\n  }\n}\n```',
			usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		});

		// Second response handles tool output
		mockGenerate.mockResolvedValueOnce({
			provider: "gemini",
			model: "gemini-2.5-flash",
			text: "The result of execution is 42.",
			usage: { inputTokens: 15, outputTokens: 5, totalTokens: 20 },
		});

		const onToolCall = vi.fn();
		const onToolResult = vi.fn();

		const result = await NovaAiAgent.run({
			messages: [{ role: "user", content: "Print 42 in python" }],
			onToolCall,
			onToolResult,
		});

		expect(onToolCall).toHaveBeenCalledWith("execute_code", {
			language: "python",
			code: "print(42)",
			confirmed: true,
		});
		expect(onToolResult).toHaveBeenCalledWith("execute_code", "42\n");
		expect(result.text).toBe("The result of execution is 42.");
	});
});
